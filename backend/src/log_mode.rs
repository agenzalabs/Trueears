//! Log Mode backend commands for Context-Aware Log Mode feature.
//!
//! This module provides Tauri commands for:
//! - Appending log entries to files
//! - Validating log file paths
//! - Getting the default log directory

use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use tauri::Manager;

use crate::error::AppError;

/// Allowed file extensions for log files
const ALLOWED_EXTENSIONS: [&str; 3] = [".md", ".txt", ".log"];

/// Result of validating a log file path
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PathValidation {
    /// Whether the path is valid for use as a log destination
    pub valid: bool,
    /// Whether the file already exists
    pub exists: bool,
    /// Whether the parent directory exists
    pub parent_exists: bool,
    /// Whether we have write permission
    pub writable: bool,
    /// Error message if invalid
    pub error_message: Option<String>,
}

/// Get the default log directory path (Documents/Trueears).
///
/// Returns the path to the Trueears logs directory in the user's Documents folder.
/// This directory may not exist yet - it will be created when the first log is saved.
fn default_log_directory_path<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) -> Result<PathBuf, AppError> {
    app.path()
        .document_dir()
        .map(|path| path.join("Trueears"))
        .map_err(|e| format!("Could not determine default log directory: {}", e).into())
}

#[tauri::command]
pub async fn get_default_log_directory(app: tauri::AppHandle) -> Result<String, AppError> {
    let documents_path = default_log_directory_path(&app)?;
    log::info!("get_default_log_directory: {}", documents_path.display());
    Ok(documents_path.to_string_lossy().to_string())
}

/// Check if a path has an allowed extension
fn has_allowed_extension(path: &str) -> bool {
    let lower = path.to_lowercase();
    ALLOWED_EXTENSIONS.iter().any(|ext| lower.ends_with(ext))
}

/// Check if a path is absolute
fn is_absolute_path(path: &str) -> bool {
    let p = Path::new(path);
    p.is_absolute()
}

/// Check if path contains traversal sequences
fn contains_traversal(path: &str) -> bool {
    path.contains("..") || path.contains("./") || path.contains(".\\")
}

/// Appends a log entry to a specified file, creating the file if it doesn't exist.
///
/// # Arguments
/// * `path` - Absolute path to the log file
/// * `content` - The log entry content (already formatted)
///
/// # Returns
/// * `Ok(())` on success
/// * `Err(String)` with error code on failure
fn append_to_file_sync(path: String, content: String) -> Result<(), AppError> {
    log::info!(
        "append_to_file: path={}, content_len={}",
        path,
        content.len()
    );

    // Validate path format
    if !is_absolute_path(&path) {
        return Err("INVALID_PATH: Path must be absolute".into());
    }

    if contains_traversal(&path) {
        return Err("INVALID_PATH: Path contains traversal sequences".into());
    }

    if !has_allowed_extension(&path) {
        return Err("INVALID_EXTENSION: Only .md, .txt, .log files allowed".into());
    }

    let file_path = Path::new(&path);

    // Create parent directories if they don't exist
    if let Some(parent) = file_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| {
                log::error!("Failed to create parent directories: {}", e);
                format!("IO_ERROR: Failed to create directory - {}", e)
            })?;
        }
    }

    // Open file in append mode (create if not exists)
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| {
            log::error!("Failed to open file for append: {}", e);
            match e.kind() {
                std::io::ErrorKind::PermissionDenied => {
                    "PERMISSION_DENIED: Cannot write to file".to_string()
                }
                std::io::ErrorKind::StorageFull => "DISK_FULL: Insufficient disk space".to_string(),
                _ => {
                    // Check if file is locked (Windows-specific error handling)
                    let error_str = e.to_string().to_lowercase();
                    if error_str.contains("lock") || error_str.contains("in use") {
                        "FILE_LOCKED: File is in use by another process".to_string()
                    } else {
                        format!("IO_ERROR: {}", e)
                    }
                }
            }
        })?;

    // Append content followed by newline
    writeln!(file, "{}", content).map_err(|e| {
        log::error!("Failed to write to file: {}", e);
        format!("IO_ERROR: Failed to write - {}", e)
    })?;

    // Flush to ensure content is written
    file.flush().map_err(|e| {
        log::error!("Failed to flush file: {}", e);
        format!("IO_ERROR: Failed to flush - {}", e)
    })?;

    log::info!("Successfully appended to file: {}", path);
    Ok(())
}

#[tauri::command]
pub async fn append_to_file(path: String, content: String) -> Result<(), AppError> {
    tauri::async_runtime::spawn_blocking(move || append_to_file_sync(path, content))
        .await
        .map_err(|e| format!("append_to_file task failed: {}", e))?
}

/// Validates a file path for use as a log destination (does not create the file).
///
/// # Arguments
/// * `path` - Absolute path to validate
///
/// # Returns
/// * `Ok(PathValidation)` with validation details
fn validate_log_path_sync(path: String) -> Result<PathValidation, AppError> {
    log::info!("validate_log_path: path={}", path);

    // Check path format
    if !is_absolute_path(&path) {
        return Ok(PathValidation {
            valid: false,
            exists: false,
            parent_exists: false,
            writable: false,
            error_message: Some("Path must be absolute".to_string()),
        });
    }

    if contains_traversal(&path) {
        return Ok(PathValidation {
            valid: false,
            exists: false,
            parent_exists: false,
            writable: false,
            error_message: Some("Path contains invalid traversal sequences".to_string()),
        });
    }

    if !has_allowed_extension(&path) {
        return Ok(PathValidation {
            valid: false,
            exists: false,
            parent_exists: false,
            writable: false,
            error_message: Some("Only .md, .txt, .log files allowed".to_string()),
        });
    }

    let file_path = Path::new(&path);
    let exists = file_path.exists();

    // Check if parent directory exists
    let parent_exists = file_path.parent().map(|p| p.exists()).unwrap_or(false);

    // Check write permission
    let writable = if exists {
        // If file exists, check if we can write to it
        fs::metadata(&path)
            .map(|m| !m.permissions().readonly())
            .unwrap_or(false)
    } else if parent_exists {
        // If file doesn't exist but parent does, check parent directory permissions
        file_path
            .parent()
            .and_then(|p| fs::metadata(p).ok())
            .map(|m| !m.permissions().readonly())
            .unwrap_or(false)
    } else {
        // Parent doesn't exist - we can attempt to create it
        true
    };

    log::info!(
        "validate_log_path result: exists={}, parent_exists={}, writable={}",
        exists,
        parent_exists,
        writable
    );

    Ok(PathValidation {
        valid: writable,
        exists,
        parent_exists,
        writable,
        error_message: if !writable {
            Some("Path is not writable".to_string())
        } else {
            None
        },
    })
}

#[tauri::command]
pub async fn validate_log_path(path: String) -> Result<PathValidation, AppError> {
    tauri::async_runtime::spawn_blocking(move || validate_log_path_sync(path))
        .await
        .map_err(|e| format!("validate_log_path task failed: {}", e))?
}

/// Open the file explorer and select the file at the given path.
///
/// # Arguments
/// * `path` - Absolute path to the file
///
/// # Returns
/// * `Ok(())` on success
/// * `Err(String)` on failure
#[tauri::command]
pub async fn open_log_file(path: String) -> Result<(), AppError> {
    log::info!("open_log_file: path={}", path);

    tauri::async_runtime::spawn_blocking(move || {
        // Validate path exists before trying to open
        let p = std::path::Path::new(&path);
        if !p.exists() {
            return Err("FILE_NOT_FOUND: File does not exist".into());
        }

        tauri_plugin_opener::open_path(&path, None::<&str>).map_err(|e| {
            log::error!("Failed to open file: {}", e);
            format!("OPEN_FAILED: {}", e).into()
        })
    })
    .await
    .map_err(|e| format!("open_log_file task failed: {}", e))?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_has_allowed_extension() {
        assert!(has_allowed_extension("test.md"));
        assert!(has_allowed_extension("test.MD"));
        assert!(has_allowed_extension("test.txt"));
        assert!(has_allowed_extension("test.log"));
        assert!(!has_allowed_extension("test.exe"));
        assert!(!has_allowed_extension("test"));
    }

    #[test]
    fn test_contains_traversal() {
        assert!(contains_traversal("../test.md"));
        assert!(contains_traversal("./test.md"));
        assert!(contains_traversal("test/../other.md"));
        assert!(!contains_traversal("/absolute/path/test.md"));
        assert!(!contains_traversal("C:\\Users\\test.md"));
    }

    #[cfg(windows)]
    #[test]
    fn test_is_absolute_path_windows() {
        assert!(is_absolute_path("C:\\Users\\test.md"));
        assert!(is_absolute_path("D:\\Notes\\log.txt"));
        assert!(!is_absolute_path("relative\\path.md"));
    }

    #[cfg(not(windows))]
    #[test]
    fn test_is_absolute_path_unix() {
        assert!(is_absolute_path("/home/user/test.md"));
        assert!(is_absolute_path("/var/log/app.log"));
        assert!(!is_absolute_path("relative/path.md"));
    }
}
