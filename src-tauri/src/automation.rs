use arboard::Clipboard;
use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use std::thread;
use std::time::Duration;

pub async fn paste_text(text: &str) -> Result<(), String> {
    log::info!("Transcription received: {}", text);

    // Copy to clipboard
    log::info!("Writing to clipboard...");
    let mut clipboard = Clipboard::new().map_err(|e| format!("Failed to access clipboard: {}", e))?;
    clipboard
        .set_text(text)
        .map_err(|e| format!("Failed to set clipboard text: {}", e))?;

    // Wait briefly for clipboard to be ready
    thread::sleep(Duration::from_millis(50));

    log::info!("Sending Paste command...");

    // Simulate Ctrl+V (Windows/Linux) or Cmd+V (macOS)
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| format!("Failed to create Enigo: {}", e))?;

    #[cfg(target_os = "macos")]
    {
        enigo
            .key(Key::Meta, Direction::Press)
            .map_err(|e| format!("Key press failed: {}", e))?;
        enigo
            .key(Key::Unicode('v'), Direction::Click)
            .map_err(|e| format!("Key click failed: {}", e))?;
        enigo
            .key(Key::Meta, Direction::Release)
            .map_err(|e| format!("Key release failed: {}", e))?;
    }

    #[cfg(not(target_os = "macos"))]
    {
        enigo
            .key(Key::Control, Direction::Press)
            .map_err(|e| format!("Key press failed: {}", e))?;
        enigo
            .key(Key::Unicode('v'), Direction::Click)
            .map_err(|e| format!("Key click failed: {}", e))?;
        enigo
            .key(Key::Control, Direction::Release)
            .map_err(|e| format!("Key release failed: {}", e))?;
    }

    log::info!("Paste command sent");
    Ok(())
}
