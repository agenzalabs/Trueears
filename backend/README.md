# Backend (Tauri)

Rust backend providing native platform capabilities for Trueears.

## Tech Stack

- Tauri 2.x
- Rust 2021 edition
- Windows Win32 APIs (via `windows-rs`)

## Structure

```
src/
├── main.rs             # Tauri entry point
├── lib.rs              # Core app logic & Tauri commands
├── automation.rs       # Keyboard simulation & clipboard management
├── shortcuts.rs        # Global hotkey registration & handling
├── window.rs           # Active window detection (Win32)
├── installed_apps.rs   # Installed application discovery
└── auth.rs             # Authentication integration
```

## Modules

### lib.rs

Core Tauri application setup and command definitions. Exposes commands to frontend:

```rust
#[tauri::command]
async fn get_active_window() -> Result<WindowInfo, String>;

#[tauri::command]
async fn paste_text(text: String) -> Result<(), String>;

#[tauri::command]
async fn read_clipboard() -> Result<String, String>;
```

### automation.rs

Keyboard and clipboard automation using `enigo` and `arboard`:

- Simulates `Ctrl+V` for auto-paste
- Clipboard read/write operations
- Handles clipboard race conditions

### shortcuts.rs

Global hotkey management using `tauri-plugin-global-shortcut`:

- `Ctrl+Shift+K` - Recording toggle
- `Ctrl+Shift+S` - Settings window
- Hotkey event forwarding to frontend

### window.rs

Active window detection using Windows Win32 APIs:

- Get foreground window title
- Get executable name
- Process handle management

### installed_apps.rs

System application discovery:

- Registry-based app enumeration (Windows)
- Desktop file parsing (planned for Linux)
- Spotlight integration (planned for macOS)

### auth.rs

Authentication integration:

- Token storage in OS keychain
- OAuth flow coordination with auth-server
- Session management

## Configuration

`tauri.conf.json` key settings:

```json
{
  "app": {
    "windows": [{
      "label": "main",
      "decorations": false,
      "transparent": true,
      "alwaysOnTop": true,
      "skipTaskbar": true
    }]
  },
  "bundle": {
    "windows": {
      "webviewInstallMode": {
        "type": "embedBootstrapper"
      }
    }
  }
}
```

## Dependencies

Key Cargo dependencies:

| Crate | Purpose |
|-------|---------|
| `tauri` | Desktop framework |
| `enigo` | Keyboard simulation |
| `arboard` | Clipboard access |
| `windows` | Win32 API bindings |
| `serde` | Serialization |

## Development

```bash
# Run with hot-reload
cd .. && npm run dev

# Build release
cd .. && npm run build

# Run Rust tests
cargo test
```

## Code Conventions

- Use `Result<T, E>` for fallible operations
- Never panic in production code paths
- Validate all Tauri command inputs
- Prefer async/await for I/O
- Keep commands thin, logic in modules

## Platform Support

| Feature | Windows | macOS | Linux |
|---------|---------|-------|-------|
| Hotkeys | Yes | Yes | Yes |
| Window detection | Yes | Planned | Planned |
| Clipboard | Yes | Yes | Yes |
| Keyboard sim | Yes | Yes | Yes |

## Related Documentation

- [Architecture Overview](../docs/architecture/overview.md)
- [Tauri Commands Reference](../docs/reference/tauri-commands.md)
- [Development Guide](../docs/guides/development.md)
- [Deployment Guide](../docs/guides/deployment.md)
