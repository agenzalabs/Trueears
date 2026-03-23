use arboard::Clipboard;
use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use std::{
    env,
    path::{Path, PathBuf},
};
use walkdir::{DirEntry, WalkDir};

enum TextSegment {
    Plain(String),
    CursorMention(String),
}

pub enum PasteOutcome {
    Pasted,
    ClipboardFallback { message: String },
}

#[cfg(target_os = "linux")]
static LAST_LINUX_TARGET_WINDOW: Lazy<Mutex<Option<String>>> = Lazy::new(|| Mutex::new(None));

#[cfg(target_os = "linux")]
pub fn remember_linux_target_window(window_id: Option<String>) {
    if let Ok(mut target) = LAST_LINUX_TARGET_WINDOW.lock() {
        *target = window_id;
        log::info!("Stored Linux target window for dictation paste");
    }
}

#[cfg(not(target_os = "linux"))]
pub fn remember_linux_target_window(_window_id: Option<String>) {}

#[cfg(target_os = "linux")]
pub fn restore_linux_target_window_focus() -> bool {
    let target_window = LAST_LINUX_TARGET_WINDOW
        .lock()
        .ok()
        .and_then(|target| target.clone());

    match target_window {
        Some(window_id) => activate_linux_window(&window_id),
        None => false,
    }
}

#[cfg(not(target_os = "linux"))]
pub fn restore_linux_target_window_focus() -> bool {
    false
}

pub async fn paste_text(app: &tauri::AppHandle, text: &str) -> Result<PasteOutcome, String> {
    log::info!("Transcription received: {}", text);

    let segments = split_into_segments(text);
    let has_mentions = segments
        .iter()
        .any(|segment| matches!(segment, TextSegment::CursorMention(_)));

    if !has_mentions {
        return paste_full_text(app, text);
    }

    log::info!(
        "Detected {} Cursor mentions within the transcription",
        segments
            .iter()
            .filter(|segment| matches!(segment, TextSegment::CursorMention(_)))
            .count()
    );

    let mut clipboard =
        Clipboard::new().map_err(|e| format!("Failed to access clipboard: {}", e))?;
    let mut enigo =
        Enigo::new(&Settings::default()).map_err(|e| format!("Failed to create Enigo: {}", e))?;

    for segment in segments {
        match segment {
            TextSegment::Plain(content) => {
                paste_plain_chunk(&mut clipboard, &mut enigo, &content)?;
            }
            TextSegment::CursorMention(file_hint) => {
                insert_cursor_mention(&mut clipboard, &mut enigo, &file_hint)?;
            }
        }
    }

    clear_clipboard(&mut clipboard)?;
    Ok(PasteOutcome::Pasted)
}

fn paste_full_text(app: &tauri::AppHandle, text: &str) -> Result<PasteOutcome, String> {
    log::info!("Writing transcription to clipboard (single paste)...");
    let mut clipboard =
        Clipboard::new().map_err(|e| format!("Failed to access clipboard: {}", e))?;
    clipboard
        .set_text(text)
        .map_err(|e| format!("Failed to set clipboard text: {}", e))?;

    thread::sleep(Duration::from_millis(50));

    #[cfg(target_os = "linux")]
    if try_linux_targeted_paste() {
        clear_clipboard(&mut clipboard)?;
        return Ok(PasteOutcome::Pasted);
    }

    #[cfg(target_os = "linux")]
    if is_wayland_session() {
        match crate::linux_remote_desktop::paste_via_remote_desktop(app) {
            Ok(true) => {
                clear_clipboard(&mut clipboard)?;
                return Ok(PasteOutcome::Pasted);
            }
            Ok(false) => {}
            Err(err) => {
                log::warn!("Linux portal keyboard paste failed: {}", err);
            }
        }
    }

    log::info!("Sending Paste command...");
    let mut enigo =
        Enigo::new(&Settings::default()).map_err(|e| format!("Failed to create Enigo: {}", e))?;
    send_paste(&mut enigo)?;
    log::info!("Paste command sent");

    #[cfg(target_os = "linux")]
    {
        if is_wayland_session() {
            log::warn!(
                "Wayland session detected. Preserving clipboard because synthetic paste may be blocked."
            );
            return Ok(PasteOutcome::ClipboardFallback {
                message: "If the text did not appear automatically, it was copied to your clipboard. Press Ctrl+V in the target field.".to_string(),
            });
        }
    }

    clear_clipboard(&mut clipboard)?;
    Ok(PasteOutcome::Pasted)
}

fn paste_plain_chunk(
    clipboard: &mut Clipboard,
    enigo: &mut Enigo,
    text: &str,
) -> Result<(), String> {
    if text.is_empty() {
        return Ok(());
    }

    clipboard
        .set_text(text.to_string())
        .map_err(|e| format!("Failed to set clipboard text: {}", e))?;
    thread::sleep(Duration::from_millis(30));
    send_paste(enigo)?;
    thread::sleep(Duration::from_millis(40));
    Ok(())
}

fn insert_cursor_mention(
    clipboard: &mut Clipboard,
    enigo: &mut Enigo,
    file_hint: &str,
) -> Result<(), String> {
    if file_hint.is_empty() {
        paste_plain_chunk(clipboard, enigo, "@")?;
        return Ok(());
    }

    let resolved_hint = resolve_file_hint(file_hint);
    log::info!(
        "Inserting Cursor file mention for hint: {} (resolved: {})",
        file_hint,
        resolved_hint
    );
    clipboard
        .set_text("@".to_string())
        .map_err(|e| format!("Failed to set clipboard text for @: {}", e))?;
    thread::sleep(Duration::from_millis(20));
    send_paste(enigo)?;
    thread::sleep(Duration::from_millis(40));

    clipboard
        .set_text(resolved_hint.clone())
        .map_err(|e| format!("Failed to set clipboard text for mention: {}", e))?;
    thread::sleep(Duration::from_millis(25));
    send_paste(enigo)?;
    thread::sleep(Duration::from_millis(220));

    enigo
        .key(Key::Return, Direction::Click)
        .map_err(|e| format!("Failed to confirm Cursor file mention: {}", e))?;
    thread::sleep(Duration::from_millis(80));
    Ok(())
}

fn clear_clipboard(clipboard: &mut Clipboard) -> Result<(), String> {
    thread::sleep(Duration::from_millis(100));
    clipboard
        .clear()
        .map_err(|e| format!("Failed to clear clipboard: {}", e))?;
    log::info!("Clipboard cleared");
    Ok(())
}

fn send_paste(enigo: &mut Enigo) -> Result<(), String> {
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

    Ok(())
}

#[cfg(target_os = "linux")]
fn try_linux_targeted_paste() -> bool {
    let target_window = LAST_LINUX_TARGET_WINDOW
        .lock()
        .ok()
        .and_then(|target| target.clone());

    let Some(window_id) = target_window else {
        log::warn!("No Linux target window stored for paste");
        return false;
    };

    if !activate_linux_window(&window_id) {
        log::warn!("Failed to reactivate Linux target window {}", window_id);
        return false;
    }

    let key_sent = run_linux_command(
        "xdotool",
        &["key", "--clearmodifiers", "--window", &window_id, "ctrl+v"],
    );
    if key_sent {
        log::info!("Sent targeted Ctrl+V to Linux window {}", window_id);
    } else {
        log::warn!("Failed to send targeted Ctrl+V to Linux window {}", window_id);
    }

    key_sent
}

#[cfg(target_os = "linux")]
fn activate_linux_window(window_id: &str) -> bool {
    run_linux_command("xdotool", &["windowactivate", "--sync", window_id])
}

#[cfg(target_os = "linux")]
fn run_linux_command(command: &str, args: &[&str]) -> bool {
    std::process::Command::new(command)
        .args(args)
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

#[cfg(target_os = "linux")]
fn is_wayland_session() -> bool {
    matches!(
        env::var("XDG_SESSION_TYPE"),
        Ok(value) if value.eq_ignore_ascii_case("wayland")
    ) || env::var_os("WAYLAND_DISPLAY").is_some()
}

fn send_copy(enigo: &mut Enigo) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        enigo
            .key(Key::Meta, Direction::Press)
            .map_err(|e| format!("Key press failed: {}", e))?;
        enigo
            .key(Key::Unicode('c'), Direction::Click)
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
            .key(Key::Unicode('c'), Direction::Click)
            .map_err(|e| format!("Key click failed: {}", e))?;
        enigo
            .key(Key::Control, Direction::Release)
            .map_err(|e| format!("Key release failed: {}", e))?;
    }

    Ok(())
}

pub fn copy_selected_text() -> Result<Option<String>, String> {
    log::info!("Attempting to copy selected text...");
    
    let mut clipboard =
        Clipboard::new().map_err(|e| format!("Failed to access clipboard: {}", e))?;
    
    // Clear clipboard first to detect if copy actually worked
    clipboard
        .clear()
        .map_err(|e| format!("Failed to clear clipboard: {}", e))?;
    
    let mut enigo =
        Enigo::new(&Settings::default()).map_err(|e| format!("Failed to create Enigo: {}", e))?;
    
    // Release any held modifier keys first (important because user might still be holding Ctrl+Shift from the shortcut)
    let _ = enigo.key(Key::Control, Direction::Release);
    let _ = enigo.key(Key::Shift, Direction::Release);
    #[cfg(target_os = "macos")]
    let _ = enigo.key(Key::Meta, Direction::Release);
    
    // Small delay to ensure modifiers are released
    thread::sleep(Duration::from_millis(50));
    
    // Send Ctrl+C / Cmd+C to copy selected text
    send_copy(&mut enigo)?;
    
    // Wait for clipboard to update (increased for reliability)
    thread::sleep(Duration::from_millis(150));
    
    // Read clipboard content
    match clipboard.get_text() {
        Ok(text) if !text.trim().is_empty() => {
            log::info!("Copied selected text: {} chars", text.len());
            Ok(Some(text))
        }
        Ok(_) => {
            log::info!("No text selected (clipboard empty)");
            Ok(None)
        }
        Err(e) => {
            log::warn!("Failed to read clipboard: {}", e);
            Ok(None)
        }
    }
}

fn split_into_segments(text: &str) -> Vec<TextSegment> {
    let mut segments = Vec::new();
    let mut buffer = String::new();
    let mut chars = text.chars().peekable();

    while let Some(ch) = chars.next() {
        if ch == '@' {
            let mut candidate = String::new();
            while let Some(&next) = chars.peek() {
                if is_valid_mention_char(next) {
                    candidate.push(next);
                    chars.next();
                } else {
                    break;
                }
            }

            if is_valid_file_hint(&candidate) {
                if !buffer.is_empty() {
                    segments.push(TextSegment::Plain(std::mem::take(&mut buffer)));
                }
                segments.push(TextSegment::CursorMention(candidate));
            } else {
                buffer.push('@');
                buffer.push_str(&candidate);
            }
        } else {
            buffer.push(ch);
        }
    }

    if !buffer.is_empty() {
        segments.push(TextSegment::Plain(buffer));
    }

    segments
}

fn is_valid_mention_char(ch: char) -> bool {
    ch.is_alphanumeric() || matches!(ch, '.' | '_' | '-' | '/' | '\\')
}

fn is_valid_file_hint(candidate: &str) -> bool {
    if candidate.is_empty() {
        return false;
    }

    candidate.contains('.')
        || candidate.contains('\\')
        || candidate.contains('/')
        || candidate.eq_ignore_ascii_case("readme")
        || candidate.eq_ignore_ascii_case("readme.md")
}

fn resolve_file_hint(file_hint: &str) -> String {
    let cleaned = if file_hint.contains('\\') {
        file_hint.replace('\\', "/")
    } else {
        file_hint.to_string()
    };

    if cleaned.eq_ignore_ascii_case("readme") {
        return "README.md".to_string();
    }

    if cleaned.contains('/') {
        return cleaned;
    }

    FILE_INDEX.resolve(&cleaned).unwrap_or(cleaned)
}

struct FileIndex {
    entries: HashMap<String, Vec<String>>,
}

impl FileIndex {
    fn new() -> Self {
        let root = find_workspace_root();
        let entries = root
            .as_ref()
            .map(|path| build_file_index(path))
            .unwrap_or_default();
        Self { entries }
    }

    fn resolve(&self, file_name: &str) -> Option<String> {
        let key = file_name.to_lowercase();
        let matches = self.entries.get(&key)?;
        let relative = if matches.len() == 1 {
            matches.first().cloned()
        } else {
            matches
                .iter()
                .find(|path| path.contains("backend"))
                .cloned()
                .or_else(|| {
                    matches
                        .iter()
                        .find(|path| path.contains("frontend"))
                        .cloned()
                })
                .or_else(|| matches.first().cloned())
        }?;

        Some(relative)
    }
}

static FILE_INDEX: Lazy<FileIndex> = Lazy::new(FileIndex::new);

fn find_workspace_root() -> Option<PathBuf> {
    let mut dir = env::current_dir().ok()?;

    loop {
        if dir.join("package.json").exists() {
            return Some(dir);
        }

        if !dir.pop() {
            break;
        }
    }

    None
}

fn build_file_index(root: &Path) -> HashMap<String, Vec<String>> {
    log::info!(
        "Building file index for Cursor mentions starting at {}",
        root.display()
    );
    let mut map: HashMap<String, Vec<String>> = HashMap::new();

    for entry in WalkDir::new(root)
        .into_iter()
        .filter_entry(|e| should_traverse(e))
    {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        if !entry.file_type().is_file() {
            continue;
        }

        let relative = match entry.path().strip_prefix(root) {
            Ok(path) => path,
            Err(_) => continue,
        };

        let file_name = match entry.file_name().to_str() {
            Some(name) => name.to_lowercase(),
            None => continue,
        };

        if let Some(rel_str) = relative.to_str() {
            let normalized = rel_str.replace('\\', "/");
            map.entry(file_name).or_default().push(normalized);
        }
    }

    map
}

fn should_traverse(entry: &DirEntry) -> bool {
    if entry.depth() == 0 {
        return true;
    }

    if !entry.file_type().is_dir() {
        return true;
    }

    let name = entry.file_name().to_string_lossy().to_lowercase();
    let skip_dirs = [
        "node_modules",
        ".git",
        "build",
        "dist",
        "out",
        "target",
        ".turbo",
        ".cache",
        ".next",
        ".svelte-kit",
    ];

    !skip_dirs.iter().any(|d| d == &name)
}
