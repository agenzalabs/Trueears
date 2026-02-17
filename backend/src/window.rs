use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveWindowInfo {
    pub app_name: String,
    pub window_title: String,
    pub executable_path: String,
    pub url: Option<String>,
}

#[cfg(target_os = "windows")]
pub fn get_cursor_position() -> Option<(i32, i32)> {
    use windows::Win32::Foundation::POINT;
    use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

    unsafe {
        let mut point = POINT { x: 0, y: 0 };
        if GetCursorPos(&mut point).is_ok() {
            Some((point.x, point.y))
        } else {
            None
        }
    }
}

#[cfg(target_os = "linux")]
pub fn get_cursor_position() -> Option<(i32, i32)> {
    if let Some(output) = run_command("xdotool", &["getmouselocation", "--shell"]) {
        if let (Some(x), Some(y)) = (parse_shell_value(&output, "X"), parse_shell_value(&output, "Y")) {
            return Some((x, y));
        }
    }

    // Wayland/Hyprland fallback when xdotool is unavailable.
    if let Some(output) = run_command("hyprctl", &["cursorpos"]) {
        let mut parts = output.split(',').map(str::trim);
        if let (Some(x_raw), Some(y_raw)) = (parts.next(), parts.next()) {
            if let (Ok(x), Ok(y)) = (x_raw.parse::<f64>(), y_raw.parse::<f64>()) {
                return Some((x.round() as i32, y.round() as i32));
            }
        }
    }

    None
}

#[cfg(all(not(target_os = "windows"), not(target_os = "linux")))]
pub fn get_cursor_position() -> Option<(i32, i32)> {
    None
}

#[cfg(target_os = "windows")]
pub fn get_active_window_info() -> Option<ActiveWindowInfo> {
    use windows::core::PWSTR;
    use windows::Win32::Foundation::{CloseHandle, HWND};
    use windows::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32,
        PROCESS_QUERY_LIMITED_INFORMATION,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId,
    };

    fn is_browser_exe(app_name: &str) -> bool {
        matches!(
            app_name.to_lowercase().as_str(),
            "chrome.exe"
                | "msedge.exe"
                | "firefox.exe"
                | "brave.exe"
                | "opera.exe"
                | "vivaldi.exe"
                | "arc.exe"
        )
    }

    /// Best-effort: try to read the active browser URL via Windows UI Automation.
    /// If not available, returns None (caller may fall back to title-based matching).
    fn try_get_active_browser_url(hwnd: HWND) -> Option<String> {
        use windows::Win32::System::Com::{
            CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED,
        };
        use std::mem::ManuallyDrop;
        use windows::Win32::System::Variant::{VARIANT, VARIANT_0, VARIANT_0_0, VARIANT_0_0_0, VT_I4};
        use windows::Win32::UI::Accessibility::{
            CUIAutomation, IUIAutomation, IUIAutomationElement, IUIAutomationElementArray,
            IUIAutomationValuePattern, TreeScope_Subtree, UIA_ControlTypePropertyId, UIA_EditControlTypeId,
            UIA_ValuePatternId,
        };

        fn variant_i32(value: i32) -> VARIANT {
            VARIANT {
                Anonymous: VARIANT_0 {
                    Anonymous: ManuallyDrop::new(VARIANT_0_0 {
                        vt: VT_I4,
                        wReserved1: 0,
                        wReserved2: 0,
                        wReserved3: 0,
                        Anonymous: VARIANT_0_0_0 { lVal: value },
                    }),
                },
            }
        }

        unsafe {
            let mut com_initialized = false;
            if CoInitializeEx(None, COINIT_APARTMENTTHREADED).is_ok() {
                com_initialized = true;
            }

            let result = (|| -> Option<String> {
                // Create UIAutomation instance
                let automation: IUIAutomation = CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER).ok()?;

                // Root element for the window
                let root: IUIAutomationElement = automation.ElementFromHandle(hwnd).ok()?;

                // Find all edit controls (address bar is usually an Edit)
                let edit_control_type: VARIANT = variant_i32(UIA_EditControlTypeId.0 as i32);
                let condition = automation
                    .CreatePropertyCondition(UIA_ControlTypePropertyId, edit_control_type)
                    .ok()?;

                let edits: IUIAutomationElementArray = root.FindAll(TreeScope_Subtree, &condition).ok()?;
                let len = edits.Length().ok()? as i32;

                for i in 0..len {
                    let el = edits.GetElement(i).ok()?;
                    // Try to read value via ValuePattern
                    let pat = el.GetCurrentPatternAs::<IUIAutomationValuePattern>(UIA_ValuePatternId).ok();
                    let value = match pat {
                        Some(p) => p.CurrentValue().ok(),
                        None => None,
                    };
                    if let Some(v) = value {
                        let s = v.to_string();
                        let t = s.trim();
                        if t.is_empty() {
                            continue;
                        }
                        // Heuristics: must look like a URL / origin / scheme.
                        // Avoid returning generic placeholders.
                        let lower = t.to_lowercase();
                        if lower.contains(' ') {
                            continue;
                        }
                        if lower == "search google or type a url"
                            || lower == "search or enter address"
                            || lower == "search or enter web address"
                        {
                            continue;
                        }
                        if lower.starts_with("http://")
                            || lower.starts_with("https://")
                            || lower.starts_with("chrome://")
                            || lower.starts_with("edge://")
                            || lower.starts_with("about:")
                            || lower.contains('.')
                            || lower.contains("localhost")
                        {
                            return Some(t.to_string());
                        }
                    }
                }

                None
            })();

            if com_initialized {
                CoUninitialize();
            }

            result
        }
    }

    unsafe {
        let hwnd: HWND = GetForegroundWindow();

        // Get window title
        let mut title: [u16; 512] = [0; 512];
        let len = GetWindowTextW(hwnd, &mut title);

        if len == 0 {
            return None;
        }

        let window_title = String::from_utf16_lossy(&title[..len as usize]);

        // Skip invalid windows
        if window_title.is_empty()
            || window_title == "Program Manager"
            || window_title == "Windows Default Lock Screen"
        {
            return None;
        }

        // Get process ID
        let mut process_id: u32 = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut process_id));

        if process_id == 0 {
            return None;
        }

        // Open process to get executable path
        let process_handle = match OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, process_id)
        {
            Ok(handle) => handle,
            Err(_) => return Some(ActiveWindowInfo {
                app_name: "Unknown".to_string(),
                window_title: window_title.clone(),
                executable_path: "".to_string(),
                url: None,
            }),
        };

        // Get executable path
        let mut exe_path: [u16; 512] = [0; 512];
        let mut size: u32 = 512;

        let exe_path_str = match QueryFullProcessImageNameW(
            process_handle,
            PROCESS_NAME_WIN32,
            PWSTR(exe_path.as_mut_ptr()),
            &mut size,
        ) {
            Ok(_) => {
                let path = String::from_utf16_lossy(&exe_path[..size as usize]);
                path
            }
            Err(_) => String::new(),
        };

        // Extract app name from path
        let app_name = exe_path_str
            .split('\\')
            .last()
            .unwrap_or("Unknown")
            .to_string();

        let url = if is_browser_exe(&app_name) {
            try_get_active_browser_url(hwnd)
        } else {
            None
        };

        log::info!(
            "Active window - Title: {}, App: {}, Path: {}, Url: {:?}",
            window_title,
            app_name,
            exe_path_str,
            url
        );

        // Clean up process handle
        let _ = CloseHandle(process_handle);

        Some(ActiveWindowInfo {
            app_name,
            window_title,
            executable_path: exe_path_str,
            url,
        })
    }
}

#[cfg(target_os = "linux")]
pub fn get_active_window_info() -> Option<ActiveWindowInfo> {
    let window_id = get_active_window_id()?;
    let window_title = get_window_title(&window_id)?;

    if window_title.trim().is_empty() {
        return None;
    }

    let process_id = get_window_pid(&window_id);
    let executable_path = process_id
        .and_then(get_executable_path_from_pid)
        .unwrap_or_default();

    let app_name = if !executable_path.is_empty() {
        std::path::Path::new(&executable_path)
            .file_name()
            .and_then(|v| v.to_str())
            .unwrap_or("Unknown")
            .to_string()
    } else {
        get_window_class_name(&window_id).unwrap_or_else(|| "Unknown".to_string())
    };

    let url = extract_url_like_value(&window_title);

    Some(ActiveWindowInfo {
        app_name,
        window_title,
        executable_path,
        url,
    })
}

#[cfg(all(not(target_os = "windows"), not(target_os = "linux")))]
pub fn get_active_window_info() -> Option<ActiveWindowInfo> {
    Some(ActiveWindowInfo {
        app_name: "Unknown".to_string(),
        window_title: "Unknown".to_string(),
        executable_path: String::new(),
        url: None,
    })
}

#[cfg(target_os = "linux")]
fn run_command(command: &str, args: &[&str]) -> Option<String> {
    let output = std::process::Command::new(command).args(args).output().ok()?;
    if !output.status.success() {
        return None;
    }

    let text = String::from_utf8(output.stdout).ok()?;
    let trimmed = text.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

#[cfg(target_os = "linux")]
fn parse_shell_value(output: &str, key: &str) -> Option<i32> {
    output.lines().find_map(|line| {
        let (k, v) = line.split_once('=')?;
        if k.trim() == key {
            v.trim().parse::<i32>().ok()
        } else {
            None
        }
    })
}

#[cfg(target_os = "linux")]
fn get_active_window_id() -> Option<String> {
    if let Some(window_id) = run_command("xdotool", &["getactivewindow"]) {
        return Some(window_id);
    }

    // Fallback for environments where xdotool isn't available.
    let root_output = run_command("xprop", &["-root", "_NET_ACTIVE_WINDOW"])?;
    root_output
        .split_whitespace()
        .find(|token| token.starts_with("0x"))
        .map(|id| id.to_string())
}

#[cfg(target_os = "linux")]
fn get_window_title(window_id: &str) -> Option<String> {
    if let Some(title) = run_command("xdotool", &["getwindowname", window_id]) {
        return Some(title);
    }

    let output = run_command("xprop", &["-id", window_id, "_NET_WM_NAME", "WM_NAME"])?;
    output
        .split('"')
        .nth(1)
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

#[cfg(target_os = "linux")]
fn get_window_pid(window_id: &str) -> Option<u32> {
    if let Some(pid) = run_command("xdotool", &["getwindowpid", window_id]) {
        if let Ok(parsed) = pid.parse::<u32>() {
            return Some(parsed);
        }
    }

    let output = run_command("xprop", &["-id", window_id, "_NET_WM_PID"])?;
    output
        .rsplit_once('=')
        .and_then(|(_, value)| value.trim().parse::<u32>().ok())
}

#[cfg(target_os = "linux")]
fn get_executable_path_from_pid(pid: u32) -> Option<String> {
    let exe_path = std::fs::read_link(format!("/proc/{}/exe", pid)).ok()?;
    Some(exe_path.to_string_lossy().to_string())
}

#[cfg(target_os = "linux")]
fn get_window_class_name(window_id: &str) -> Option<String> {
    run_command("xdotool", &["getwindowclassname", window_id]).map(|value| {
        value
            .lines()
            .next()
            .unwrap_or("Unknown")
            .trim()
            .to_string()
    })
}

#[cfg(target_os = "linux")]
fn extract_url_like_value(title: &str) -> Option<String> {
    title
        .split_whitespace()
        .map(|token| {
            token.trim_matches(|c: char| {
                matches!(
                    c,
                    ',' | '.' | ';' | ':' | ')' | '(' | ']' | '[' | '}' | '{' | '"' | '\''
                )
            })
        })
        .find(|token| token.starts_with("http://") || token.starts_with("https://"))
        .map(|token| token.to_string())
}
