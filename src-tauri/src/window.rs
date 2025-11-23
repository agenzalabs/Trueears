#[cfg(target_os = "windows")]
pub fn is_valid_active_window() -> bool {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowTextW};

    unsafe {
        let hwnd: HWND = GetForegroundWindow();
        let mut title: [u16; 512] = [0; 512];
        let len = GetWindowTextW(hwnd, &mut title);

        if len == 0 {
            return false;
        }

        let title_str = String::from_utf16_lossy(&title[..len as usize]);
        log::info!("Active window: {}", title_str);

        !title_str.is_empty()
            && title_str != "Program Manager"
            && title_str != "Windows Default Lock Screen"
    }
}

#[cfg(not(target_os = "windows"))]
pub fn is_valid_active_window() -> bool {
    // On non-Windows platforms, assume valid for now
    // TODO: Implement for macOS and Linux
    true
}
