# Tauri Commands Contract: Context-Aware Log Mode

**Feature**: 004-context-log
**Date**: 2025-12-28

This document defines the Tauri IPC commands required for the Log Mode feature.

---

## 1. append_to_file

Appends a log entry to a specified file, creating the file if it doesn't exist.

### Request

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Absolute path to the log file |
| `content` | string | Yes | The log entry content (already formatted) |

### Response

**Success**: `Ok(())`

**Error**: `Err(String)` with one of:
- `"INVALID_PATH: Path must be absolute"`
- `"INVALID_PATH: Path contains traversal sequences"`
- `"INVALID_EXTENSION: Only .md, .txt, .log files allowed"`
- `"PERMISSION_DENIED: Cannot write to file"`
- `"FILE_LOCKED: File is in use by another process"`
- `"DISK_FULL: Insufficient disk space"`
- `"IO_ERROR: {details}"`

### Behavior

1. Validate `path`:
   - Must be absolute path
   - Must not contain `..`
   - Must end with `.md`, `.txt`, or `.log`
2. Create parent directories if they don't exist
3. Open file in append mode (create if not exists)
4. Append `content` followed by newline
5. Flush and close file

### Example

**Frontend Call**:
```typescript
await invoke<void>('append_to_file', {
  path: 'C:\\Notes\\dev-log.md',
  content: '- [2025-12-28 14:30] Check the Redis timeout issue'
});
```

**Rust Implementation Signature**:
```rust
#[tauri::command]
async fn append_to_file(path: String, content: String) -> Result<(), String>
```

---

## 2. validate_log_path

Validates a file path for use as a log destination (does not create the file).

### Request

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Absolute path to validate |

### Response

**Success**: `Ok(PathValidation)`

```typescript
interface PathValidation {
  valid: boolean;
  exists: boolean;           // Whether file already exists
  parentExists: boolean;     // Whether parent directory exists
  writable: boolean;         // Whether we have write permission
  errorMessage: string | null;
}
```

**Error**: `Err(String)` - only for unexpected failures

### Behavior

1. Check path format (absolute, no traversal, valid extension)
2. Check if file exists
3. Check if parent directory exists
4. Attempt to verify write permission (without actually writing)
5. Return validation result

### Example

**Frontend Call**:
```typescript
const validation = await invoke<PathValidation>('validate_log_path', {
  path: 'C:\\Notes\\new-log.md'
});

if (!validation.valid) {
  showError(validation.errorMessage);
}
```

---

## 3. pick_log_file (Optional - if Tauri Dialog plugin available)

Opens a native file picker dialog for selecting or creating a log file.

### Request

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | No | Dialog title (default: "Select Log File") |
| `defaultPath` | string | No | Initial directory or file path |

### Response

**Success**: `Ok(String | null)` - Selected path or null if cancelled

### Behavior

1. Open native file save dialog
2. Filter to allowed extensions (.md, .txt, .log)
3. Return selected path or null if user cancels

### Example

**Frontend Call**:
```typescript
const selectedPath = await invoke<string | null>('pick_log_file', {
  title: 'Choose Log File for VS Code',
  defaultPath: 'C:\\Notes\\'
});

if (selectedPath) {
  saveMapping(appId, selectedPath);
}
```

---

## Existing Commands (Reused)

These commands already exist and will be reused for Log Mode:

### get_active_window_info

Already implemented in `backend/src/window.rs`. Returns `ActiveWindowInfo` for matching against app mappings.

### get_store_value / set_store_value

Already implemented for settings storage. Will be used for `Trueears_LOG_MODE_CONFIG`.

### copy_to_clipboard

Already implemented in `backend/src/automation.rs`. Used for fallback when file write fails.

---

## Event Contracts

### settings-changed

Existing event, already emitted when settings are updated. Log Mode settings changes will trigger this event for cross-window sync.

**Payload**: None (listeners re-read from store)

### log-entry-saved (New)

Emitted when a log entry is successfully saved to a file.

**Payload**:
```typescript
interface LogEntrySavedEvent {
  filePath: string;
  timestamp: string;
  contentPreview: string;  // First 50 chars of content
}
```

**Usage**: Overlay can listen to show confirmation feedback.

---

## Error Codes Summary

| Code | Description | User Action |
|------|-------------|-------------|
| `INVALID_PATH` | Path format is incorrect | Fix path in settings |
| `INVALID_EXTENSION` | File extension not allowed | Use .md, .txt, or .log |
| `PERMISSION_DENIED` | No write access | Check file/folder permissions |
| `FILE_LOCKED` | File in use | Close other application using file |
| `DISK_FULL` | No disk space | Free up disk space |
| `IO_ERROR` | General I/O failure | Check file system health |
