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

/// The downloaded-but-not-installed update, kept in memory until the user
/// restarts or the app exits.
#[derive(Default)]
pub struct PendingUpdate(Mutex<Option<(Update, Vec<u8>)>>);

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

/// Record whether audio is being captured right now. Called by the overlay
/// whenever recording starts or stops.
pub fn set_recording_active(active: bool) {
    RECORDING_ACTIVE.store(active, Ordering::SeqCst);
}

/// Check for a new release and, if there is one, download it and hold it ready.
/// Never returns an error for "no update available" - that is the happy path.
pub async fn check_and_download(app: &AppHandle) -> UpdateStatus {
    // Nothing to do if we already hold a downloaded update.
    if let Some(status) = pending_status(app) {
        return status;
    }

    emit_status(app, &UpdateStatus::new(UpdateState::Checking));

    let updater = match app.updater() {
        Ok(updater) => updater,
        Err(e) => {
            // Expected in `tauri dev` and in any build without updater config.
            log::info!("Updater unavailable: {}", e);
            let status = UpdateStatus::idle();
            emit_status(app, &status);
            return status;
        }
    };

    let update = match updater.check().await {
        Ok(Some(update)) => update,
        Ok(None) => {
            log::info!("No update available");
            let status = UpdateStatus::idle();
            emit_status(app, &status);
            return status;
        }
        Err(e) => {
            log::warn!("Update check failed: {}", e);
            let status = UpdateStatus::error(e.to_string());
            emit_status(app, &status);
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
    emit_status(app, &downloading);

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
                    emit_status(&progress_app, &status);
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
            emit_status(app, &status);
            return status;
        }
    };

    log::info!(
        "Update {} downloaded ({} bytes) - waiting for the user to restart",
        update.version,
        bytes.len()
    );

    let status = UpdateStatus::from_update(UpdateState::Ready, &update);
    if let Ok(mut pending) = app.state::<PendingUpdate>().0.lock() {
        *pending = Some((update, bytes));
    }
    emit_status(app, &status);
    status
}

/// Status derived from an already-downloaded update, if there is one.
fn pending_status(app: &AppHandle) -> Option<UpdateStatus> {
    let pending = app.state::<PendingUpdate>();
    let guard = pending.0.lock().ok()?;
    let (update, _) = guard.as_ref()?;
    Some(UpdateStatus::from_update(UpdateState::Ready, update))
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
    Ok(pending_status(&app).unwrap_or_else(UpdateStatus::idle))
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

    if RECORDING_ACTIVE.load(Ordering::SeqCst) {
        return Err(AppError::Generic(
            "Recording is in progress. Finish dictating, then restart to update.".into(),
        ));
    }

    let pending = app.state::<PendingUpdate>();
    let taken = {
        let mut guard = pending
            .0
            .lock()
            .map_err(|_| AppError::Generic("Update state is poisoned".into()))?;
        guard.take()
    };

    let (update, bytes) =
        taken.ok_or_else(|| AppError::Generic("No update has been downloaded yet".into()))?;

    log::info!("Installing update {} and restarting", update.version);

    if let Err(e) = update.install(bytes) {
        // Installing failed, so put it back - the user can retry without
        // downloading the package again.
        log::error!("Failed to install update: {}", e);
        if let Ok(mut guard) = pending.0.lock() {
            // The bytes were consumed by install(); re-checking will re-download.
            *guard = None;
        }
        let status = UpdateStatus::error(e.to_string());
        emit_status(&app, &status);
        return Err(AppError::Generic(e.to_string()));
    }

    // Reached only on platforms where install() does not exit the process.
    app.restart();
}
