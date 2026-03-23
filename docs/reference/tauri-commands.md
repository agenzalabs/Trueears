# Tauri Commands Reference

This document deTrueearss all Tauri commands exposed from the Rust backend to the frontend.

## Overview

Commands are invoked from the frontend using `@tauri-apps/api/core`:

```typescript
import { invoke } from '@tauri-apps/api/core';

// Example
const windowInfo = await invoke<ActiveWindowInfo>('get_active_window_info');
```

---

## Settings & Storage

### `get_store_value`

Retrieves a value from the persistent settings store.

```typescript
const value = await invoke<string | null>('get_store_value', { key: 'GROQ_API_KEY' });
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | Setting key to retrieve |

**Returns:** `string | null` - The stored value or null if not found

**Notes:** Sensitive keys (containing "KEY", "TOKEN", "SECRET", "PASSWORD") are logged with redacted values.

---

### `set_store_value`

Saves a value to the persistent settings store.

```typescript
await invoke('set_store_value', { key: 'theme', value: 'dark' });
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | Setting key |
| `value` | `string` | Value to store |

**Returns:** `void`

**Events:** Emits `settings-changed` to all windows after saving.

---

## Window Management

### `get_active_window_info`

Retrieves information about the currently focused window.

```typescript
interface ActiveWindowInfo {
  title: string;
  exe_name: string;
  process_id: number;
}

const info = await invoke<ActiveWindowInfo | null>('get_active_window_info');
```

**Returns:** `ActiveWindowInfo | null`

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Window title |
| `exe_name` | `string` | Executable name (e.g., `code.exe`) |
| `process_id` | `number` | Process ID |

**Platform:** Windows only (macOS/Linux return null)

---

### `get_cursor_position`

Gets the current mouse cursor position.

```typescript
interface CursorPosition {
  x: number;
  y: number;
}

const pos = await invoke<CursorPosition>('get_cursor_position');
```

**Returns:** `CursorPosition` - Screen coordinates

---

### `set_ignore_mouse_events`

Configures whether the window should ignore mouse events (click-through).

```typescript
await invoke('set_ignore_mouse_events', { ignore: true });
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `ignore` | `boolean` | `true` = click-through, `false` = interactive |

---

### `open_settings_window`

Opens (or closes if already open) the settings window.

```typescript
await invoke('open_settings_window');
```

**Behavior:**
- Creates a new settings window if none exists
- Closes existing settings window if one is open (toggle behavior)
- Window is centered, maximized, and decorated

---

## Dictation & Automation

### `transcription_complete`

Pastes tranTrueearsd text into the active application.

```typescript
await invoke('transcription_complete', { text: 'Hello world!' });
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `text` | `string` | Text to paste |

**Behavior:**
1. Copies text to clipboard
2. Simulates `Ctrl+V` keystroke
3. Waits 500ms before returning

---

### `copy_selected_text`

Copies the currently selected text to clipboard and returns it.

```typescript
const selectedText = await invoke<string | null>('copy_selected_text');
```

**Returns:** `string | null` - Selected text or null if nothing selected

**Behavior:**
1. Simulates `Ctrl+C` keystroke
2. Reads clipboard content
3. Returns clipboard text

---

## Hotkey Management

### `register_escape_shortcut`

Registers the `Escape` key as a global shortcut.

```typescript
await invoke('register_escape_shortcut');
```

**Use case:** Allows canceling recording with Escape key.

---

### `unregister_escape_shortcut`

Unregisters the `Escape` key global shortcut.

```typescript
await invoke('unregister_escape_shortcut');
```

**Use case:** Call when not recording to avoid capturing Escape in other apps.

---

## App Discovery

### `search_installed_apps`

Searches installed applications by name.

```typescript
interface InstalledApp {
  name: string;
  exe_name: string;
  exe_path: string;
}

const apps = await invoke<InstalledApp[]>('search_installed_apps', { query: 'code' });
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | `string` | Search query |

**Returns:** Array of matching applications

---

### `get_installed_popular_apps`

Returns commonly used applications that are installed.

```typescript
const popularApps = await invoke<InstalledApp[]>('get_installed_popular_apps');
```

**Returns:** Pre-filtered list of popular apps (VS Code, Slack, Chrome, etc.)

---

## Authentication

### `start_google_login`

Initiates Google OAuth flow.

```typescript
await invoke('start_google_login');
```

**Behavior:**
1. Opens Google OAuth URL in default browser
2. Starts local callback server
3. Exchanges code for tokens
4. Stores tokens in secure storage

**Requires:** `GOOGLE_CLIENT_ID` environment variable

---

### `get_auth_state`

Gets the current authentication state.

```typescript
interface AuthState {
  is_authenticated: boolean;
  user: UserInfo | null;
}

const state = await invoke<AuthState>('get_auth_state');
```

---

### `get_user_info`

Gets stored user information.

```typescript
interface UserInfo {
  email: string;
  name: string;
  picture: string;
}

const user = await invoke<UserInfo | null>('get_user_info');
```

---

### `logout`

Logs out the current user.

```typescript
await invoke('logout');
```

**Behavior:** Clears stored tokens and user info.

---

## Log Mode

### `append_to_file`

Appends a timestamped entry to a log file.

```typescript
await invoke('append_to_file', {
  path: 'C:/Users/name/Documents/Trueears/vscode-log.md',
  content: 'Fix the authentication bug'
});
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `path` | `string` | Absolute path to log file |
| `content` | `string` | Note content (without timestamp) |

**Format:** Appends as `- [YYYY-MM-DD HH:MM] content\n`

---

### `validate_log_path`

Validates a path for use as a log file.

```typescript
interface PathValidation {
  is_valid: boolean;
  error_message: string | null;
  normalized_path: string | null;
}

const result = await invoke<PathValidation>('validate_log_path', {
  path: 'C:/Users/name/Documents/Trueears/log.md'
});
```

**Checks:**
- Path is writable
- Parent directory exists or can be created
- Has `.md` extension

---

### `get_default_log_directory`

Returns the default directory for log files.

```typescript
const dir = await invoke<string>('get_default_log_directory');
// Returns: "C:/Users/name/Documents/Trueears"
```

---

### `open_log_file`

Opens a log file in the default application.

```typescript
await invoke('open_log_file', { path: 'C:/Users/name/Documents/Trueears/log.md' });
```

---

## Onboarding

### `set_onboarding_trigger_active`

Sets the onboarding trigger step state.

```typescript
await invoke('set_onboarding_trigger_active', { active: true });
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `active` | `boolean` | Whether onboarding trigger step is active |

**Events:** Emits `onboarding-trigger-state` to all windows.

**Use case:** Prevents normal hotkey behavior during onboarding.

---

## Events

The backend emits these events that the frontend can listen to:

| Event | Payload | Description |
|-------|---------|-------------|
| `toggle-recording` | `null` | Global hotkey (Ctrl+Shift+K) pressed |
| `cancel-recording` | `null` | Escape pressed during recording |
| `settings-changed` | `null` | A setting was updated |
| `onboarding-trigger-state` | `boolean` | Onboarding step state changed |

### Listening to Events

```typescript
import { listen } from '@tauri-apps/api/event';

const unlisten = await listen('toggle-recording', () => {
  // Handle recording toggle
});

// Cleanup
unlisten();
```

---

## Error Handling

All commands return `Result<T, String>` in Rust, which translates to:
- Success: Resolves with the value
- Failure: Rejects with an error message string

```typescript
try {
  await invoke('some_command');
} catch (error) {
  console.error('Command failed:', error); // error is a string
}
```

---

## Related Documentation

- [Architecture Overview](../architecture/overview.md)
- [Development Guide](../guides/development.md)
- [Auth System](../architecture/auth-system.md)
