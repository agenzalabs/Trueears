//! Background app updates.
//!
//! Policy: **auto-download, manual restart**. The app checks for a new release
//! shortly after launch and every few hours, downloads it in the background, and
//! then does nothing until the user explicitly asks to restart. Installing on
//! Windows terminates this process (the NSIS installer relaunches the app), so
//! it must never happen behind the user's back - least of all mid-dictation.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_updater::{Update, UpdaterExt};

use crate::AppError;

/// Set while the microphone is live. Guards against an install killing the
/// process in the middle of a recording.
static RECORDING_ACTIVE: AtomicBool = AtomicBool::new(false);

/// Wait before the first check so it does not compete with startup work.
const INITIAL_CHECK_DELAY: Duration = Duration::from_secs(15);
/// How often to look for a new release while the app keeps running.
const RECHECK_INTERVAL: Duration = Duration::from_secs(6 * 60 * 60);
/// Only emit progress every N percent to avoid flooding the webview.
const PROGRESS_STEP: u8 = 5;

const RECORDING_IN_PROGRESS: &str =
    "Recording is in progress. Finish dictating, then restart to update.";

/// Store key telling the next launch that it followed an in-app update, so the
/// settings window the user pressed "Restart & install" in can be restored.
pub const REOPEN_SETTINGS_KEY: &str = "Trueears_REOPEN_SETTINGS_AFTER_UPDATE";

/// Shared updater state.
///
/// The installer is held in memory rather than spilled to disk: it is a single
/// ~6 MB NSIS package, so the resident cost is small next to the bookkeeping and
/// cleanup a temp file would need.
#[derive(Default)]
pub struct UpdaterState(Mutex<StateInner>);

#[derive(Default)]
struct StateInner {
    /// Status of a check or download that is running right now.
    ///
    /// Held for the whole operation so that a second caller returns this
    /// instead of starting a duplicate download, and so a window opened
    /// mid-download reports progress rather than `Idle`.
    active: Option<UpdateStatus>,
    /// Downloaded package waiting for the user to restart.
    pending: Option<(Update, Vec<u8>)>,
}

#[derive(Clone, Debug, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub enum UpdateState {
    /// No update known and nothing in progress.
    Idle,
    Checking,
    Downloading,
    /// Downloaded and waiting for the user to restart.
    Ready,
    Error,
}

#[derive(Clone, Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateStatus {
    pub state: UpdateState,
    /// Version being offered, once known.
    pub version: Option<String>,
    /// Release notes from the update manifest.
    pub notes: Option<String>,
    /// Download progress, 0-100.
    pub progress: Option<u8>,
    pub error: Option<String>,
}

impl UpdateStatus {
    fn new(state: UpdateState) -> Self {
        Self {
            state,
            version: None,
            notes: None,
            progress: None,
            error: None,
        }
    }

    fn idle() -> Self {
        Self::new(UpdateState::Idle)
    }

    fn error(message: impl Into<String>) -> Self {
        let mut status = Self::new(UpdateState::Error);
        status.error = Some(message.into());
        status
    }

    fn from_update(state: UpdateState, update: &Update) -> Self {
        let mut status = Self::new(state);
        status.version = Some(update.version.clone());
        status.notes = update.body.clone();
        status
    }
}

fn emit_status(app: &AppHandle, status: &UpdateStatus) {
    if let Err(e) = app.emit("update-status", status.clone()) {
        log::warn!("Failed to emit update-status: {}", e);
    }
}

/// Record the status of the running operation and push it to the windows.
fn set_active(app: &AppHandle, status: UpdateStatus) {
    if let Ok(mut state) = app.state::<UpdaterState>().0.lock() {
        state.active = Some(status.clone());
    }
    emit_status(app, &status);
}

/// Clear the running operation, optionally storing the package it produced.
fn finish_active(app: &AppHandle, status: UpdateStatus, downloaded: Option<(Update, Vec<u8>)>) {
    if let Ok(mut state) = app.state::<UpdaterState>().0.lock() {
        state.active = None;
        if downloaded.is_some() {
            state.pending = downloaded;
        }
    }
    emit_status(app, &status);
}

/// Record whether audio is being captured right now. Called by the overlay
/// whenever recording starts or stops.
pub fn set_recording_active(active: bool) {
    RECORDING_ACTIVE.store(active, Ordering::SeqCst);
}

/// Check for a new release and, if there is one, download it and hold it ready.
/// Never returns an error for "no update available" - that is the happy path.
pub async fn check_and_download(app: &AppHandle) -> UpdateStatus {
    // Claim the operation. Bails out when a package is already staged, or when
    // another check/download is in flight - otherwise the periodic check and a
    // user pressing "Check for updates" would both download the same package.
    {
        let state_handle = app.state::<UpdaterState>();
        let mut state = match state_handle.0.lock() {
            Ok(state) => state,
            Err(_) => return UpdateStatus::error("Update state is poisoned"),
        };

        if let Some((update, _)) = state.pending.as_ref() {
            return UpdateStatus::from_update(UpdateState::Ready, update);
        }
        if let Some(active) = state.active.clone() {
            log::info!("Update check already in progress - skipping duplicate");
            return active;
        }

        state.active = Some(UpdateStatus::new(UpdateState::Checking));
    }

    emit_status(app, &UpdateStatus::new(UpdateState::Checking));

    let updater = match app.updater() {
        Ok(updater) => updater,
        Err(e) => {
            // Expected in `tauri dev` and in any build without updater config.
            log::info!("Updater unavailable: {}", e);
            let status = UpdateStatus::idle();
            finish_active(app, status.clone(), None);
            return status;
        }
    };

    let update = match updater.check().await {
        Ok(Some(update)) => update,
        Ok(None) => {
            log::info!("No update available");
            let status = UpdateStatus::idle();
            finish_active(app, status.clone(), None);
            return status;
        }
        Err(e) => {
            log::warn!("Update check failed: {}", e);
            let status = UpdateStatus::error(e.to_string());
            finish_active(app, status.clone(), None);
            return status;
        }
    };

    log::info!(
        "Update available: {} -> {}",
        update.current_version,
        update.version
    );

    let mut downloading = UpdateStatus::from_update(UpdateState::Downloading, &update);
    downloading.progress = Some(0);
    set_active(app, downloading.clone());

    let mut downloaded: u64 = 0;
    let mut last_reported: u8 = 0;
    let progress_app = app.clone();
    let progress_template = downloading.clone();

    let bytes = update
        .download(
            |chunk_len, content_len| {
                downloaded += chunk_len as u64;
                let Some(total) = content_len.filter(|total| *total > 0) else {
                    return;
                };
                let percent = ((downloaded * 100) / total).min(100) as u8;
                if percent >= last_reported.saturating_add(PROGRESS_STEP) || percent == 100 {
                    last_reported = percent;
                    let mut status = progress_template.clone();
                    status.progress = Some(percent);
                    set_active(&progress_app, status);
                }
            },
            || log::info!("Update download finished"),
        )
        .await;

    let bytes = match bytes {
        Ok(bytes) => bytes,
        Err(e) => {
            log::warn!("Update download failed: {}", e);
            let status = UpdateStatus::error(e.to_string());
            finish_active(app, status.clone(), None);
            return status;
        }
    };

    log::info!(
        "Update {} downloaded ({} bytes) - waiting for the user to restart",
        update.version,
        bytes.len()
    );

    let status = UpdateStatus::from_update(UpdateState::Ready, &update);
    finish_active(app, status.clone(), Some((update, bytes)));
    status
}

/// Current status: a staged package, else whatever operation is running, else idle.
fn current_status(app: &AppHandle) -> UpdateStatus {
    let state = app.state::<UpdaterState>();
    let Ok(guard) = state.0.lock() else {
        return UpdateStatus::idle();
    };

    if let Some((update, _)) = guard.pending.as_ref() {
        return UpdateStatus::from_update(UpdateState::Ready, update);
    }

    guard.active.clone().unwrap_or_else(UpdateStatus::idle)
}

/// Start the background schedule: one check shortly after launch, then periodic.
pub fn spawn_background_checks(app: &AppHandle) {
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(INITIAL_CHECK_DELAY).await;
        loop {
            check_and_download(&app).await;
            tokio::time::sleep(RECHECK_INTERVAL).await;
        }
    });
}

#[tauri::command]
pub async fn get_update_status(app: AppHandle) -> Result<UpdateStatus, AppError> {
    Ok(current_status(&app))
}

#[tauri::command]
pub async fn check_for_update(app: AppHandle) -> Result<UpdateStatus, AppError> {
    log::info!("check_for_update command called");
    Ok(check_and_download(&app).await)
}

/// Install the downloaded update and restart.
///
/// On Windows this hands off to the NSIS installer and terminates the process,
/// so it never returns; the installer relaunches the app afterwards.
#[tauri::command]
pub async fn install_update(app: AppHandle) -> Result<(), AppError> {
    log::info!("install_update command called");

    // Fast path so the UI gets an immediate, friendly refusal. The authoritative
    // check happens inside the worker below, as late as possible.
    if RECORDING_ACTIVE.load(Ordering::SeqCst) {
        return Err(AppError::Generic(RECORDING_IN_PROGRESS.into()));
    }

    // `Update::install` is synchronous and, on Windows, never returns - it hands
    // off to the NSIS installer and exits the process. Keep it off the async
    // runtime's workers.
    let app_for_install = app.clone();
    let result = tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        // Re-check immediately before the point of no return: a recording may
        // have started while this was being scheduled. Done before taking the
        // package so nothing is lost when we refuse.
        if RECORDING_ACTIVE.load(Ordering::SeqCst) {
            return Err(RECORDING_IN_PROGRESS.to_string());
        }

        let taken = {
            let state = app_for_install.state::<UpdaterState>();
            let mut guard = state
                .0
                .lock()
                .map_err(|_| "Update state is poisoned".to_string())?;
            guard.pending.take()
        };

        let (update, bytes) =
            taken.ok_or_else(|| "No update has been downloaded yet".to_string())?;

        // The installer relaunches the app, and that fresh process cannot
        // otherwise tell it was just updated: startup only opens settings while
        // onboarding is incomplete, so the window the user pressed the button in
        // would simply never come back. Leave a note for the next launch.
        if let Err(e) = crate::write_store_value_sync(&app_for_install, REOPEN_SETTINGS_KEY, "true")
        {
            // Not fatal - the update still installs, the window just stays shut.
            log::warn!("Failed to record the post-update reopen flag: {}", e);
        }

        log::info!("Installing update {} and restarting", update.version);
        update.install(bytes).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| AppError::Generic(format!("install worker failed: {}", e)))?;

    if let Err(message) = result {
        // The package was consumed by install(), so the slot stays empty and the
        // next check re-downloads it.
        log::error!("Failed to install update: {}", message);
        let status = UpdateStatus::error(message.clone());
        emit_status(&app, &status);
        return Err(AppError::Generic(message));
    }

    // Reached only on platforms where install() does not exit the process.
    app.restart();
}
