#[cfg(target_os = "linux")]
use gio::{BusType, DBusCallFlags, DBusConnection, DBusSignalFlags, SignalSubscriptionId};
#[cfg(target_os = "linux")]
use glib::variant::ObjectPath;
#[cfg(target_os = "linux")]
use glib::{MainContext, MainLoop, ToVariant, Variant, VariantDict};
#[cfg(target_os = "linux")]
use std::collections::HashMap;
#[cfg(target_os = "linux")]
use std::thread;
#[cfg(target_os = "linux")]
use std::time::Duration;
#[cfg(target_os = "linux")]
use tauri::AppHandle;
#[cfg(target_os = "linux")]
use tauri_plugin_store::StoreExt;
#[cfg(target_os = "linux")]
use uuid::Uuid;

use crate::error::AppError;

#[cfg(target_os = "linux")]
const PORTAL_BUS_NAME: &str = "org.freedesktop.portal.Desktop";
#[cfg(target_os = "linux")]
const PORTAL_OBJECT_PATH: &str = "/org/freedesktop/portal/desktop";
#[cfg(target_os = "linux")]
const REMOTE_DESKTOP_INTERFACE: &str = "org.freedesktop.portal.RemoteDesktop";
#[cfg(target_os = "linux")]
const REQUEST_INTERFACE: &str = "org.freedesktop.portal.Request";
#[cfg(target_os = "linux")]
const SESSION_INTERFACE: &str = "org.freedesktop.portal.Session";
#[cfg(target_os = "linux")]
const STORE_NAME: &str = "settings.json";
#[cfg(target_os = "linux")]
const RESTORE_TOKEN_KEY: &str = "Trueears_LINUX_REMOTE_DESKTOP_RESTORE_TOKEN";
#[cfg(target_os = "linux")]
const DEVICE_KEYBOARD: u32 = 1;
#[cfg(target_os = "linux")]
const PERSIST_MODE_UNTIL_REVOKED: u32 = 2;
#[cfg(target_os = "linux")]
const KEYSYM_CONTROL_L: i32 = 0xffe3;
#[cfg(target_os = "linux")]
const KEYSYM_V: i32 = 0x0076;
#[cfg(target_os = "linux")]
const KEY_STATE_RELEASED: u32 = 0;
#[cfg(target_os = "linux")]
const KEY_STATE_PRESSED: u32 = 1;

#[cfg(target_os = "linux")]
pub fn paste_via_remote_desktop(app: &AppHandle) -> Result<bool, AppError> {
    let connection = gio::bus_get_sync(BusType::Session, None::<&gio::Cancellable>)
        .map_err(|err| format!("Failed to connect to the session bus: {err}"))?;
    let context = MainContext::new();
    let restore_token = load_restore_token(app);

    let session_path = context
        .with_thread_default(|| -> Result<String, AppError> {
            let session_path = create_session(&connection, &context)?;
            select_keyboard_device(
                &connection,
                &context,
                &session_path,
                restore_token.as_deref(),
            )?;
            start_session(app, &connection, &context, &session_path)?;
            Ok(session_path)
        })
        .map_err(|err| err.to_string())??;

    let paste_result = send_ctrl_v(&connection, &session_path);
    close_session(&connection, &session_path);

    paste_result.map(|_| true)
}

#[cfg(not(target_os = "linux"))]
pub fn paste_via_remote_desktop(_app: &AppHandle) -> Result<bool, AppError> {
    Ok(false)
}

#[cfg(target_os = "linux")]
fn create_session(connection: &DBusConnection, context: &MainContext) -> Result<String, AppError> {
    let handle_token = new_token("remote_request");
    let session_token = new_token("remote_session");
    let request_path = request_path(connection, &handle_token)?;
    let expected_session_path = session_path(connection, &session_token)?;

    let options = VariantDict::default();
    options.insert("handle_token", handle_token.as_str());
    options.insert("session_handle_token", session_token.as_str());
    let parameters = Variant::tuple_from_iter([options.end()]);
    let pending_response = subscribe_request_response(connection, context, &request_path);

    let request_handle = connection
        .call_sync(
            Some(PORTAL_BUS_NAME),
            PORTAL_OBJECT_PATH,
            REMOTE_DESKTOP_INTERFACE,
            "CreateSession",
            Some(&parameters),
            None,
            DBusCallFlags::NONE,
            -1,
            None::<&gio::Cancellable>,
        )
        .map_err(|err| format!("RemoteDesktop.CreateSession failed: {err}"))?;

    validate_request_path("CreateSession", &request_path, &request_handle)?;

    let response = wait_for_request_response(connection, &request_path, pending_response)?;
    if response.status != 0 {
        return Err(format!(
            "RemoteDesktop.CreateSession was rejected by the desktop portal (status {}, details {:?})",
            response.status, response.results
        )
        .into());
    }

    let Some(returned_session_path) = response.results.get("session_handle").and_then(|value| {
        value
            .get::<String>()
            .or_else(|| value.get::<ObjectPath>().map(|path| path.to_string()))
    }) else {
        return Err(
            "RemoteDesktop.CreateSession succeeded but no session_handle was returned".into(),
        );
    };

    if returned_session_path != expected_session_path {
        log::warn!(
            "RemoteDesktop.CreateSession returned session path {} instead of {}",
            returned_session_path,
            expected_session_path
        );
    }

    Ok(returned_session_path)
}

#[cfg(target_os = "linux")]
fn select_keyboard_device(
    connection: &DBusConnection,
    context: &MainContext,
    session_path: &str,
    restore_token: Option<&str>,
) -> Result<(), AppError> {
    let handle_token = new_token("remote_select");
    let request_path = request_path(connection, &handle_token)?;
    let pending_response = subscribe_request_response(connection, context, &request_path);

    let options = VariantDict::default();
    options.insert("handle_token", handle_token.as_str());
    options.insert("types", DEVICE_KEYBOARD);
    options.insert("persist_mode", PERSIST_MODE_UNTIL_REVOKED);
    if let Some(restore_token) = restore_token {
        options.insert("restore_token", restore_token);
    }

    let parameters = Variant::tuple_from_iter([object_path_variant(session_path)?, options.end()]);
    let request_handle = connection
        .call_sync(
            Some(PORTAL_BUS_NAME),
            PORTAL_OBJECT_PATH,
            REMOTE_DESKTOP_INTERFACE,
            "SelectDevices",
            Some(&parameters),
            None,
            DBusCallFlags::NONE,
            -1,
            None::<&gio::Cancellable>,
        )
        .map_err(|err| format!("RemoteDesktop.SelectDevices failed: {err}"))?;

    validate_request_path("SelectDevices", &request_path, &request_handle)?;

    let response = wait_for_request_response(connection, &request_path, pending_response)?;
    if response.status != 0 {
        return Err(format!(
            "RemoteDesktop.SelectDevices was rejected by the desktop portal (status {}, details {:?})",
            response.status, response.results
        )
        .into());
    }

    Ok(())
}

#[cfg(target_os = "linux")]
fn start_session(
    app: &AppHandle,
    connection: &DBusConnection,
    context: &MainContext,
    session_path: &str,
) -> Result<(), AppError> {
    let handle_token = new_token("remote_start");
    let request_path = request_path(connection, &handle_token)?;
    let pending_response = subscribe_request_response(connection, context, &request_path);

    let options = VariantDict::default();
    options.insert("handle_token", handle_token.as_str());

    let parameters = Variant::tuple_from_iter([
        object_path_variant(session_path)?,
        "".to_variant(),
        options.end(),
    ]);
    let request_handle = connection
        .call_sync(
            Some(PORTAL_BUS_NAME),
            PORTAL_OBJECT_PATH,
            REMOTE_DESKTOP_INTERFACE,
            "Start",
            Some(&parameters),
            None,
            DBusCallFlags::NONE,
            -1,
            None::<&gio::Cancellable>,
        )
        .map_err(|err| format!("RemoteDesktop.Start failed: {err}"))?;

    validate_request_path("Start", &request_path, &request_handle)?;

    let response = wait_for_request_response(connection, &request_path, pending_response)?;
    if response.status != 0 {
        return Err(format!(
            "RemoteDesktop.Start was rejected by the desktop portal (status {}, details {:?})",
            response.status, response.results
        )
        .into());
    }

    let granted_devices = response
        .results
        .get("devices")
        .and_then(|value| value.get::<u32>())
        .unwrap_or_default();

    if granted_devices & DEVICE_KEYBOARD == 0 {
        return Err("RemoteDesktop.Start succeeded but keyboard access was not granted".into());
    }

    if let Some(restore_token) = response
        .results
        .get("restore_token")
        .and_then(|value| value.get::<String>())
    {
        save_restore_token(app, &restore_token)?;
    }

    Ok(())
}

#[cfg(target_os = "linux")]
fn send_ctrl_v(connection: &DBusConnection, session_path: &str) -> Result<(), AppError> {
    notify_keysym(
        connection,
        session_path,
        KEYSYM_CONTROL_L,
        KEY_STATE_PRESSED,
    )?;
    thread::sleep(Duration::from_millis(12));
    notify_keysym(connection, session_path, KEYSYM_V, KEY_STATE_PRESSED)?;
    thread::sleep(Duration::from_millis(12));
    notify_keysym(connection, session_path, KEYSYM_V, KEY_STATE_RELEASED)?;
    thread::sleep(Duration::from_millis(12));
    notify_keysym(
        connection,
        session_path,
        KEYSYM_CONTROL_L,
        KEY_STATE_RELEASED,
    )?;
    Ok(())
}

#[cfg(target_os = "linux")]
fn notify_keysym(
    connection: &DBusConnection,
    session_path: &str,
    keysym: i32,
    state: u32,
) -> Result<(), AppError> {
    let options = VariantDict::default();
    let parameters = Variant::tuple_from_iter([
        object_path_variant(session_path)?,
        options.end(),
        keysym.to_variant(),
        state.to_variant(),
    ]);

    connection
        .call_sync(
            Some(PORTAL_BUS_NAME),
            PORTAL_OBJECT_PATH,
            REMOTE_DESKTOP_INTERFACE,
            "NotifyKeyboardKeysym",
            Some(&parameters),
            None,
            DBusCallFlags::NONE,
            -1,
            None::<&gio::Cancellable>,
        )
        .map_err(|err| format!("RemoteDesktop.NotifyKeyboardKeysym failed: {err}"))?;

    Ok(())
}

#[cfg(target_os = "linux")]
fn close_session(connection: &DBusConnection, session_path: &str) {
    let _ = connection.call_sync(
        Some(PORTAL_BUS_NAME),
        session_path,
        SESSION_INTERFACE,
        "Close",
        None,
        None,
        DBusCallFlags::NONE,
        -1,
        None::<&gio::Cancellable>,
    );
}

#[cfg(target_os = "linux")]
fn load_restore_token(app: &AppHandle) -> Option<String> {
    let store = app.store(STORE_NAME).ok()?;
    store
        .get(RESTORE_TOKEN_KEY)
        .and_then(|value| value.as_str().map(|value| value.to_string()))
}

#[cfg(target_os = "linux")]
fn save_restore_token(app: &AppHandle, restore_token: &str) -> Result<(), AppError> {
    let store = app
        .store(STORE_NAME)
        .map_err(|err| format!("Failed to open settings store: {err}"))?;
    store.set(RESTORE_TOKEN_KEY.to_string(), restore_token.to_string());
    store
        .save()
        .map_err(|err| format!("Failed to persist Linux remote desktop restore token: {err}"))?;
    Ok(())
}

#[cfg(target_os = "linux")]
fn validate_request_path(
    method_name: &str,
    request_path: &str,
    request_handle: &Variant,
) -> Result<(), AppError> {
    if let Some((returned_request_path,)) = request_handle.get::<(ObjectPath,)>() {
        if returned_request_path.as_str() != request_path {
            return Err(format!(
                "RemoteDesktop.{} returned an unexpected request path: {}",
                method_name,
                returned_request_path.as_str()
            )
            .into());
        }
    }

    Ok(())
}

#[cfg(target_os = "linux")]
fn object_path_variant(path: &str) -> Result<Variant, AppError> {
    ObjectPath::try_from(path)
        .map(|object_path| object_path.to_variant())
        .map_err(|_| -> AppError { format!("Invalid D-Bus object path: {path}").into() })
}

#[cfg(target_os = "linux")]
fn request_path(connection: &DBusConnection, token: &str) -> Result<String, AppError> {
    let sender = connection
        .unique_name()
        .map(|name| sanitize_bus_name(name.as_str()))
        .ok_or_else(|| "The session bus did not expose a unique name".to_string())?;
    Ok(format!(
        "/org/freedesktop/portal/desktop/request/{sender}/{token}"
    ))
}

#[cfg(target_os = "linux")]
fn session_path(connection: &DBusConnection, token: &str) -> Result<String, AppError> {
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
) -> Result<PortalRequestResponse, AppError> {
    pending_response.response_loop.run();
    connection.signal_unsubscribe(pending_response.subscription_id);

    Ok(pending_response
        .receiver
        .recv_timeout(Duration::from_secs(20))
        .map_err(|_| format!("Timed out waiting for portal response on {request_path}"))?)
}

#[cfg(target_os = "linux")]
struct PendingRequestResponse {
    receiver: std::sync::mpsc::Receiver<PortalRequestResponse>,
    response_loop: MainLoop,
    subscription_id: SignalSubscriptionId,
}

#[cfg(target_os = "linux")]
#[derive(Debug)]
struct PortalRequestResponse {
    status: u32,
    results: HashMap<String, Variant>,
}
