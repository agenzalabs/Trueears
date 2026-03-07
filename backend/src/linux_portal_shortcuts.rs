#[cfg(target_os = "linux")]
use gio::{BusType, DBusCallFlags, DBusConnection, DBusSignalFlags, SignalSubscriptionId};
#[cfg(target_os = "linux")]
use glib::variant::ObjectPath;
#[cfg(target_os = "linux")]
use glib::{MainContext, MainLoop, ToVariant, Variant, VariantDict};
#[cfg(target_os = "linux")]
use std::collections::HashMap;
#[cfg(target_os = "linux")]
use std::sync::atomic::{AtomicBool, Ordering};
#[cfg(target_os = "linux")]
use std::time::Duration;
#[cfg(target_os = "linux")]
use tauri::AppHandle;
#[cfg(target_os = "linux")]
use uuid::Uuid;

#[cfg(target_os = "linux")]
const PORTAL_BUS_NAME: &str = "org.freedesktop.portal.Desktop";
#[cfg(target_os = "linux")]
const PORTAL_OBJECT_PATH: &str = "/org/freedesktop/portal/desktop";
#[cfg(target_os = "linux")]
const GLOBAL_SHORTCUTS_INTERFACE: &str = "org.freedesktop.portal.GlobalShortcuts";
#[cfg(target_os = "linux")]
const HOST_REGISTRY_INTERFACE: &str = "org.freedesktop.host.portal.Registry";
#[cfg(target_os = "linux")]
const REQUEST_INTERFACE: &str = "org.freedesktop.portal.Request";
#[cfg(target_os = "linux")]
const SESSION_INTERFACE: &str = "org.freedesktop.portal.Session";
#[cfg(target_os = "linux")]
const RECORDING_SHORTCUT_ID: &str = "toggle-recording";
#[cfg(target_os = "linux")]
const SETTINGS_SHORTCUT_ID: &str = "open-settings";
#[cfg(target_os = "linux")]
static RECORDING_SHORTCUT_ACTIVE: AtomicBool = AtomicBool::new(false);
#[cfg(target_os = "linux")]
static SETTINGS_SHORTCUT_ACTIVE: AtomicBool = AtomicBool::new(false);

#[cfg(target_os = "linux")]
pub fn register_wayland_shortcuts(app: &AppHandle) -> Result<(), String> {
    let app_handle = app.clone();
    let (ready_tx, ready_rx) = std::sync::mpsc::sync_channel(1);

    std::thread::spawn(move || {
        let context = MainContext::new();
        let ready_tx_for_success = ready_tx.clone();
        let startup = context.with_thread_default(|| -> Result<(), String> {
            let runtime = PortalShortcutRuntime::new(app_handle, context.clone())?;
            let _ = ready_tx_for_success.send(Ok(()));
            runtime.run();
            Ok(())
        });

        match startup {
            Ok(Ok(())) => {}
            Ok(Err(err)) => {
                let _ = ready_tx.send(Err(err));
            }
            Err(err) => {
                let _ = ready_tx.send(Err(err.to_string()));
            }
        }
    });

    ready_rx
        .recv_timeout(Duration::from_secs(20))
        .map_err(|_| "Timed out while starting the Linux portal shortcut backend".to_string())?
}

#[cfg(not(target_os = "linux"))]
pub fn register_wayland_shortcuts(_app: &AppHandle) -> Result<(), String> {
    Err("Wayland portal shortcuts are only available on Linux".to_string())
}

#[cfg(target_os = "linux")]
struct PortalShortcutRuntime {
    _connection: DBusConnection,
    _activated_subscription: SignalSubscriptionId,
    _deactivated_subscription: SignalSubscriptionId,
    _shortcuts_changed_subscription: SignalSubscriptionId,
    _session_closed_subscription: SignalSubscriptionId,
    _session_path: String,
    main_loop: MainLoop,
}

#[cfg(target_os = "linux")]
impl PortalShortcutRuntime {
    fn new(app: AppHandle, context: MainContext) -> Result<Self, String> {
        let connection = gio::bus_get_sync(BusType::Session, None::<&gio::Cancellable>)
            .map_err(|err| format!("Failed to connect to the session bus: {err}"))?;
        let app_id = app.config().identifier.clone();

        register_host_app(&connection, &app_id)?;

        let session_path = create_session(&connection, &context)?;
        bind_shortcuts(&connection, &context, &session_path)?;

        let activated_subscription =
            subscribe_shortcut_signal(&connection, &session_path, "Activated", app.clone());
        let deactivated_subscription =
            subscribe_shortcut_signal(&connection, &session_path, "Deactivated", app.clone());
        let shortcuts_changed_subscription =
            subscribe_shortcuts_changed(&connection, &session_path);

        let main_loop = MainLoop::new(Some(&context), false);
        let main_loop_for_close = main_loop.clone();
        let session_path_for_close = session_path.clone();
        let session_closed_subscription = connection.signal_subscribe(
            Some(PORTAL_BUS_NAME),
            Some(SESSION_INTERFACE),
            Some("Closed"),
            Some(&session_path),
            None,
            DBusSignalFlags::NONE,
            move |_connection, _sender, _object_path, _interface, _signal, _parameters| {
                log::warn!(
                    "Linux global shortcut portal session closed: {}",
                    session_path_for_close
                );
                main_loop_for_close.quit();
            },
        );

        Ok(Self {
            _connection: connection,
            _activated_subscription: activated_subscription,
            _deactivated_subscription: deactivated_subscription,
            _shortcuts_changed_subscription: shortcuts_changed_subscription,
            _session_closed_subscription: session_closed_subscription,
            _session_path: session_path,
            main_loop,
        })
    }

    fn run(self) {
        log::info!("Linux portal shortcut backend is active");
        self.main_loop.run();
        log::warn!("Linux portal shortcut backend stopped");
    }
}

#[cfg(target_os = "linux")]
fn create_session(connection: &DBusConnection, context: &MainContext) -> Result<String, String> {
    let handle_token = new_token("request");
    let session_token = new_token("session");
    let request_path = request_path(connection, &handle_token)?;
    let session_path = session_path(connection, &session_token)?;

    let options = VariantDict::default();
    options.insert("handle_token", handle_token.as_str());
    options.insert("session_handle_token", session_token.as_str());
    let parameters = Variant::tuple_from_iter([options.end()]);

    let pending_response = subscribe_request_response(connection, context, &request_path);

    let request_handle = connection
        .call_sync(
            Some(PORTAL_BUS_NAME),
            PORTAL_OBJECT_PATH,
            GLOBAL_SHORTCUTS_INTERFACE,
            "CreateSession",
            Some(&parameters),
            None,
            DBusCallFlags::NONE,
            -1,
            None::<&gio::Cancellable>,
        )
        .map_err(|err| format!("CreateSession call failed: {err}"))?;

    if let Some((returned_request_path,)) = request_handle.get::<(ObjectPath,)>() {
        if returned_request_path.as_str() != request_path {
            return Err(format!(
                "Portal returned an unexpected CreateSession request path: {}",
                returned_request_path.as_str()
            ));
        }
    }

    let response = wait_for_request_response(connection, &request_path, pending_response)?;
    if response.status != 0 {
        return Err(format!(
            "CreateSession was rejected by the desktop portal (status {}, details {:?})",
            response.status, response.results
        ));
    }

    let Some(response_session_path) = response.results.get("session_handle").and_then(|value| {
        value
            .get::<String>()
            .or_else(|| value.get::<ObjectPath>().map(|path| path.to_string()))
    }) else {
        return Err("CreateSession succeeded but no session_handle was returned".to_string());
    };

    if response_session_path != session_path {
        log::warn!(
            "Portal returned session path {} but the requested token resolves to {}",
            response_session_path,
            session_path
        );
    }

    Ok(response_session_path)
}

#[cfg(target_os = "linux")]
fn bind_shortcuts(
    connection: &DBusConnection,
    context: &MainContext,
    session_path: &str,
) -> Result<(), String> {
    let handle_token = new_token("bind");
    let request_path = request_path(connection, &handle_token)?;
    let pending_response = subscribe_request_response(connection, context, &request_path);

    let parameters = Variant::tuple_from_iter([
        object_path_variant(session_path)?,
        build_shortcuts_variant(),
        "".to_variant(),
        build_request_options(&handle_token),
    ]);

    let request_handle = connection
        .call_sync(
            Some(PORTAL_BUS_NAME),
            PORTAL_OBJECT_PATH,
            GLOBAL_SHORTCUTS_INTERFACE,
            "BindShortcuts",
            Some(&parameters),
            None,
            DBusCallFlags::NONE,
            -1,
            None::<&gio::Cancellable>,
        )
        .map_err(|err| format!("BindShortcuts call failed: {err}"))?;

    if let Some((returned_request_path,)) = request_handle.get::<(ObjectPath,)>() {
        if returned_request_path.as_str() != request_path {
            return Err(format!(
                "Portal returned an unexpected BindShortcuts request path: {}",
                returned_request_path.as_str()
            ));
        }
    }

    let response = wait_for_request_response(connection, &request_path, pending_response)?;
    let bound_shortcuts = response
        .results
        .get("shortcuts")
        .and_then(|value| value.get::<Vec<(String, HashMap<String, Variant>)>>());

    if response.status != 0 && bound_shortcuts.is_none() {
        return Err(format!(
            "BindShortcuts was rejected by the desktop portal (status {}, details {:?})",
            response.status, response.results
        ));
    }

    if let Some(bound_shortcuts) = bound_shortcuts {
        let shortcut_ids: Vec<String> = bound_shortcuts
            .into_iter()
            .map(|(shortcut_id, _)| shortcut_id)
            .collect();

        if response.status != 0 {
            log::warn!(
                "BindShortcuts returned non-zero status {} but provided shortcut metadata; treating it as success",
                response.status
            );
        }
        log::info!("Portal bound Linux shortcuts: {:?}", shortcut_ids);
    } else {
        log::warn!("BindShortcuts succeeded but did not return shortcut metadata");
    }

    Ok(())
}

#[cfg(target_os = "linux")]
fn subscribe_shortcut_signal(
    connection: &DBusConnection,
    session_path: &str,
    signal_name: &'static str,
    app: AppHandle,
) -> SignalSubscriptionId {
    let expected_session = session_path.to_string();

    connection.signal_subscribe(
        Some(PORTAL_BUS_NAME),
        Some(GLOBAL_SHORTCUTS_INTERFACE),
        Some(signal_name),
        Some(PORTAL_OBJECT_PATH),
        None,
        DBusSignalFlags::NONE,
        move |_connection, _sender, _object_path, _interface, _signal, parameters| {
            let Some((session_handle, shortcut_id, _timestamp, _options)) =
                parameters.get::<(ObjectPath, String, u64, HashMap<String, Variant>)>()
            else {
                log::warn!("Failed to decode portal shortcut signal payload");
                return;
            };

            if session_handle.as_str() != expected_session {
                return;
            }

            let app_handle = app.clone();
            let shortcut_id_for_dispatch = shortcut_id.clone();
            let signal_name_for_dispatch = signal_name.to_string();
            let app_handle_for_dispatch = app_handle.clone();
            let _ = app_handle.run_on_main_thread(move || {
                dispatch_shortcut_event(
                    &app_handle_for_dispatch,
                    &signal_name_for_dispatch,
                    &shortcut_id_for_dispatch,
                );
            });
        },
    )
}

#[cfg(target_os = "linux")]
fn subscribe_shortcuts_changed(
    connection: &DBusConnection,
    session_path: &str,
) -> SignalSubscriptionId {
    let expected_session = session_path.to_string();

    connection.signal_subscribe(
        Some(PORTAL_BUS_NAME),
        Some(GLOBAL_SHORTCUTS_INTERFACE),
        Some("ShortcutsChanged"),
        Some(PORTAL_OBJECT_PATH),
        None,
        DBusSignalFlags::NONE,
        move |_connection, _sender, _object_path, _interface, _signal, parameters| {
            let Some((session_handle, shortcuts)) =
                parameters.get::<(ObjectPath, Vec<(String, HashMap<String, Variant>)>)>()
            else {
                log::warn!("Failed to decode portal ShortcutsChanged payload");
                return;
            };

            if session_handle.as_str() != expected_session {
                return;
            }

            let shortcut_ids: Vec<String> = shortcuts
                .into_iter()
                .map(|(shortcut_id, _)| shortcut_id)
                .collect();
            log::info!("Portal shortcuts changed: {:?}", shortcut_ids);
        },
    )
}

#[cfg(target_os = "linux")]
fn dispatch_shortcut_event(app: &AppHandle, signal_name: &str, shortcut_id: &str) {
    match (signal_name, shortcut_id) {
        ("Activated", RECORDING_SHORTCUT_ID) => {
            if RECORDING_SHORTCUT_ACTIVE.swap(true, Ordering::SeqCst) {
                log::debug!("Ignoring repeated recording shortcut activation while key is held");
                return;
            }
            crate::shortcuts::handle_recording_shortcut_pressed(app);
        }
        ("Deactivated", RECORDING_SHORTCUT_ID) => {
            if !RECORDING_SHORTCUT_ACTIVE.swap(false, Ordering::SeqCst) {
                log::debug!("Ignoring stray recording shortcut release without an active press");
                return;
            }
            crate::shortcuts::handle_recording_shortcut_released(app);
        }
        ("Activated", SETTINGS_SHORTCUT_ID) => {
            if SETTINGS_SHORTCUT_ACTIVE.swap(true, Ordering::SeqCst) {
                log::debug!("Ignoring repeated settings shortcut activation while key is held");
                return;
            }
            crate::shortcuts::handle_settings_shortcut_pressed(app);
        }
        ("Deactivated", SETTINGS_SHORTCUT_ID) => {}
        _ => {
            log::debug!(
                "Ignoring unsupported portal shortcut event: signal={}, shortcut_id={}",
                signal_name,
                shortcut_id
            );
        }
    }
}

#[cfg(target_os = "linux")]
fn build_shortcuts_variant() -> Variant {
    let mut recording = HashMap::new();
    recording.insert(
        "description".to_string(),
        "Start or stop dictation".to_variant(),
    );
    recording.insert(
        "preferred_trigger".to_string(),
        "<Ctrl><Shift>K".to_variant(),
    );

    let mut settings = HashMap::new();
    settings.insert("description".to_string(), "Open settings".to_variant());
    settings.insert(
        "preferred_trigger".to_string(),
        "<Ctrl><Shift>S".to_variant(),
    );

    vec![
        (RECORDING_SHORTCUT_ID.to_string(), recording),
        (SETTINGS_SHORTCUT_ID.to_string(), settings),
    ]
    .to_variant()
}

#[cfg(target_os = "linux")]
fn register_host_app(connection: &DBusConnection, app_id: &str) -> Result<(), String> {
    let options = VariantDict::default();
    let parameters = Variant::tuple_from_iter([app_id.to_variant(), options.end()]);

    connection
        .call_sync(
            Some(PORTAL_BUS_NAME),
            PORTAL_OBJECT_PATH,
            HOST_REGISTRY_INTERFACE,
            "Register",
            Some(&parameters),
            None,
            DBusCallFlags::NONE,
            -1,
            None::<&gio::Cancellable>,
        )
        .map_err(|err| format!("Failed to register Linux app ID with the desktop portal: {err}"))?;

    log::info!("Registered Linux app ID with the desktop portal: {}", app_id);
    Ok(())
}

#[cfg(target_os = "linux")]
fn build_request_options(handle_token: &str) -> Variant {
    let options = VariantDict::default();
    options.insert("handle_token", handle_token);
    options.end()
}

#[cfg(target_os = "linux")]
fn object_path_variant(path: &str) -> Result<Variant, String> {
    ObjectPath::try_from(path)
        .map(|object_path| object_path.to_variant())
        .map_err(|_| format!("Invalid DBus object path: {path}"))
}

#[cfg(target_os = "linux")]
fn request_path(connection: &DBusConnection, token: &str) -> Result<String, String> {
    let sender = connection
        .unique_name()
        .map(|name| sanitize_bus_name(name.as_str()))
        .ok_or_else(|| "The session bus did not expose a unique name".to_string())?;
    Ok(format!(
        "/org/freedesktop/portal/desktop/request/{sender}/{token}"
    ))
}

#[cfg(target_os = "linux")]
fn session_path(connection: &DBusConnection, token: &str) -> Result<String, String> {
    let sender = connection
        .unique_name()
        .map(|name| sanitize_bus_name(name.as_str()))
        .ok_or_else(|| "The session bus did not expose a unique name".to_string())?;
    Ok(format!(
        "/org/freedesktop/portal/desktop/session/{sender}/{token}"
    ))
}

#[cfg(target_os = "linux")]
fn sanitize_bus_name(bus_name: &str) -> String {
    bus_name.trim_start_matches(':').replace('.', "_")
}

#[cfg(target_os = "linux")]
fn new_token(prefix: &str) -> String {
    format!("{prefix}_{}", Uuid::new_v4().simple())
}

#[cfg(target_os = "linux")]
fn subscribe_request_response(
    connection: &DBusConnection,
    context: &MainContext,
    request_path: &str,
) -> PendingRequestResponse {
    let (tx, rx) = std::sync::mpsc::sync_channel(1);
    let response_loop = MainLoop::new(Some(context), false);
    let response_loop_for_signal = response_loop.clone();

    let subscription_id = connection.signal_subscribe(
        Some(PORTAL_BUS_NAME),
        Some(REQUEST_INTERFACE),
        Some("Response"),
        Some(request_path),
        None,
        DBusSignalFlags::NONE,
        move |_connection, _sender, _object_path, _interface, _signal, parameters| {
            let response = parameters
                .get::<(u32, HashMap<String, Variant>)>()
                .map(|(status, results)| PortalRequestResponse { status, results });

            if let Some(response) = response {
                let _ = tx.send(response);
            }

            response_loop_for_signal.quit();
        },
    );

    PendingRequestResponse {
        receiver: rx,
        response_loop,
        subscription_id,
    }
}

#[cfg(target_os = "linux")]
fn wait_for_request_response(
    connection: &DBusConnection,
    request_path: &str,
    pending_response: PendingRequestResponse,
) -> Result<PortalRequestResponse, String> {
    pending_response.response_loop.run();
    connection.signal_unsubscribe(pending_response.subscription_id);

    pending_response
        .receiver
        .recv_timeout(Duration::from_secs(20))
        .map_err(|_| format!("Timed out waiting for portal response on {request_path}"))
}

#[cfg(target_os = "linux")]
#[derive(Debug)]
struct PortalRequestResponse {
    status: u32,
    results: HashMap<String, Variant>,
}

#[cfg(target_os = "linux")]
struct PendingRequestResponse {
    receiver: std::sync::mpsc::Receiver<PortalRequestResponse>,
    response_loop: MainLoop,
    subscription_id: SignalSubscriptionId,
}
