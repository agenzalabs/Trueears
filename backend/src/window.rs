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

#[cfg(not(target_os = "windows"))]
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

#[cfg(not(target_os = "windows"))]
pub fn get_active_window_info() -> Option<ActiveWindowInfo> {
    // TODO: Implement for macOS using NSWorkspace.activeApplication
    // TODO: Implement for Linux using xdotool or wmctrl
    Some(ActiveWindowInfo {
        app_name: "Unknown".to_string(),
        window_title: "Unknown".to_string(),
        executable_path: "".to_string(),
        url: None,
    })
}

