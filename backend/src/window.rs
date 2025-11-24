use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveWindowInfo {
    pub app_name: String,
    pub window_title: String,
    pub executable_path: String,
}

#[cfg(target_os = "windows")]
pub fn get_active_window_info() -> Option<ActiveWindowInfo> {
    use windows::Win32::Foundation::{HWND, CloseHandle};
    use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId};
    use windows::Win32::System::Threading::{OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_NAME_WIN32};
    use windows::core::PWSTR;

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
            || window_title == "Windows Default Lock Screen" {
            return None;
        }

        // Get process ID
        let mut process_id: u32 = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut process_id));

        if process_id == 0 {
            return None;
        }

        // Open process to get executable path
        let process_handle = match OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, process_id) {
            Ok(handle) => handle,
            Err(_) => return Some(ActiveWindowInfo {
                app_name: "Unknown".to_string(),
                window_title: window_title.clone(),
                executable_path: "".to_string(),
            }),
        };

        // Get executable path
        let mut exe_path: [u16; 512] = [0; 512];
        let mut size: u32 = 512;
        
        let exe_path_str = match QueryFullProcessImageNameW(
            process_handle, 
            PROCESS_NAME_WIN32, 
            PWSTR(exe_path.as_mut_ptr()),
            &mut size
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

        log::info!("Active window - Title: {}, App: {}, Path: {}", window_title, app_name, exe_path_str);

        // Clean up process handle
        let _ = CloseHandle(process_handle);

        Some(ActiveWindowInfo {
            app_name,
            window_title,
            executable_path: exe_path_str,
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
    })
}

#[cfg(target_os = "windows")]
pub fn is_valid_active_window() -> bool {
    get_active_window_info().is_some()
}

#[cfg(not(target_os = "windows"))]
pub fn is_valid_active_window() -> bool {
    // On non-Windows platforms, assume valid for now
    // TODO: Implement for macOS and Linux
    true
}
