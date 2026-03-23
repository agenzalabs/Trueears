# Architecture Overview

Trueears is a desktop AI dictation application built with Tauri v2. It captures audio via a global shortcut, transcribes it through the Groq API, optionally post-processes the text with an LLM, and pastes the result into the active application.

## System Overview

```
┌──────────────────────────────────────────────────────┐
│                   Tauri v2 Shell                     │
│                                                      │
│  ┌──────────────────┐    ┌────────────────────────┐  │
│  │  React Frontend  │◄──►│    Rust Backend         │  │
│  │  (WebView)       │IPC │  (Tauri Commands)       │  │
│  │                  │    │                          │  │
│  │  - Overlay UI    │    │  - Global shortcuts      │  │
│  │  - Settings UI   │    │  - Window detection      │  │
│  │  - Audio capture │    │  - Clipboard/paste       │  │
│  │  - Groq API calls│    │  - Installed apps cache  │  │
│  │  - App profiles  │    │  - Auth (OAuth/keyring)  │  │
│  └──────────────────┘    └────────────────────────┘  │
│                                                      │
│           ┌──────────────────────┐                   │
│           │  Tauri Plugins       │                   │
│           │  - global-shortcut   │                   │
│           │  - store (settings)  │                   │
│           │  - shell             │                   │
│           │  - process           │                   │
│           │  - log               │                   │
│           └──────────────────────┘                   │
└──────────────────────────────────────────────────────┘
         │                          │
         ▼                          ▼
  ┌──────────────┐         ┌───────────────┐
  │  Groq API    │         │  OS Platform  │
  │  - Whisper   │         │  - Win32 APIs │
  │  - Chat LLM  │         │  - X11/Wayland│
  └──────────────┘         └───────────────┘
```

**Two windows** are managed by the app:

- **Main window** -- a transparent, always-on-top overlay that spans all monitors. It shows the recording indicator at the cursor position and is click-through when inactive.
- **Settings window** -- a standard decorated window created on demand for configuration, onboarding, and app profile management.

## Frontend

| Concern | Technology |
|---------|-----------|
| Framework | React 19 |
| Language | TypeScript 5.8+ |
| Styling | TailwindCSS 4, PostCSS |
| Bundler | Vite 6 |
| Tauri Bridge | `@tauri-apps/api` v2, plugin packages |

### Key directories (`frontend/src/`)

| Path | Purpose |
|------|---------|
| `components/` | UI components -- overlay, settings panels, onboarding wizard, audio visualizer |
| `controllers/` | `dictationController.ts` -- orchestrates the record-transcribe-format-paste pipeline |
| `services/` | API clients -- `groqService.ts` (Whisper STT), `groqChatService.ts` (LLM formatting), `appProfileService.ts`, `authService.ts`, `paymentService.ts` |
| `hooks/` | React hooks for shared state and side effects |
| `types/` | TypeScript type definitions |
| `utils/` | Helpers (Tauri API wrapper, sound playback, etc.) |
| `data/` | Static data (app profile defaults, etc.) |

### Audio recording

Audio is captured in the browser via the Web Audio API / MediaRecorder inside the WebView. The resulting blob is sent directly to the Groq API from the frontend -- it does not pass through the Rust backend.

## Backend (Rust)

The Rust backend lives in `backend/` and uses Tauri 2.9 as its framework. It does **not** handle audio or network calls to Groq; its role is OS integration.

### Modules (`backend/src/`)

| File | Responsibility |
|------|---------------|
| `lib.rs` | App setup, Tauri command registration, plugin initialization, env loading |
| `shortcuts.rs` | Global shortcut registration (Ctrl+Shift+K for recording, Ctrl+Shift+S for settings, Escape for cancel) |
| `window.rs` | Active window detection, cursor position (Win32 `GetCursorPos` / X11 `xdotool`) |
| `automation.rs` | Clipboard write + simulated paste keystroke via `enigo` and `arboard` crates |
| `installed_apps.rs` | Installed application discovery and caching (delegates to `installed_apps/windows_impl.rs` on Windows) |
| `auth.rs` | Google OAuth flow, token storage via OS keyring, JWT handling |
| `log_mode.rs` | File-based logging for dictation output |
| `linux_portal_shortcuts.rs` | Wayland-specific shortcut registration via XDG Desktop Portal |
| `linux_remote_desktop.rs` | Wayland remote desktop portal integration |

### Tauri commands exposed to frontend

Settings persistence: `get_store_value`, `set_store_value`
Recording flow: `transcription_complete`, `copy_selected_text`, `get_active_window_info`, `get_cursor_position`
Window management: `set_ignore_mouse_events`, `open_settings_window`
Shortcuts: `register_escape_shortcut`, `unregister_escape_shortcut`
Apps: `search_installed_apps`, `refresh_installed_apps_cache`, `get_installed_popular_apps`
Auth: `start_google_login`, `get_auth_state`, `logout`, `get_user_info`, `get_access_token`
Logging: `append_to_file`, `validate_log_path`, `get_default_log_directory`, `open_log_file`

### Platform-specific dependencies

**Windows** (`cfg(windows)`):
- `windows` crate v0.52 -- Win32 APIs for window enumeration, cursor position, accessibility, GDI, shell
- `winreg` -- Windows Registry access
- `lnk` -- .lnk shortcut file parsing for installed app detection

**Linux** (`cfg(target_os = "linux")`):
- `gio`, `glib` -- GLib/GIO for D-Bus and desktop integration
- `webkit2gtk` -- WebView media stream permissions

## Key Features

### AI Dictation Pipeline

1. User presses global shortcut (Ctrl+Shift+K)
2. Backend detects active window info and selected text, emits event to frontend
3. Frontend shows overlay, starts audio recording via MediaRecorder
4. User speaks, then triggers stop (release key / press again / press Escape)
5. Audio blob is sent to Groq Whisper API for speech-to-text
6. Raw transcription is optionally post-processed by Groq Chat LLM with a context-aware system prompt
7. Frontend calls `transcription_complete` Tauri command
8. Backend hides overlay, writes text to clipboard, simulates Ctrl+V paste into the original window

### App Profiles

App profiles customize the LLM system prompt based on which application is active. The backend detects the foreground window (`window.rs`) and the frontend matches it against stored profiles (`appProfileService.ts`). Each profile can specify:
- A custom system prompt (e.g., "format as Slack message")
- A language override (e.g., always use Spanish for WhatsApp)

### Select-to-Transform

When text is selected before triggering dictation, the backend copies it via simulated Ctrl+C. The selected text and the spoken instruction are both sent to the LLM, which transforms the selected text according to the spoken command.

## Data Flow

```
User presses Ctrl+Shift+K
        │
        ▼
  [Rust] shortcuts.rs
    ├── get_active_window_info()   → ActiveWindowInfo
    ├── copy_selected_text()       → Option<String>
    └── emit("shortcut-pressed")   → frontend
        │
        ▼
  [Frontend] RecorderOverlay
    ├── Show overlay at cursor
    ├── Start MediaRecorder
    └── Wait for stop trigger
        │
        ▼
  [Frontend] groqService.ts
    └── POST audio to Groq Whisper API → raw text
        │
        ▼
  [Frontend] dictationController.ts
    ├── Match app profile
    ├── Build system prompt
    └── groqChatService.ts → Groq Chat API → formatted text
        │
        ▼
  [Frontend] invoke("transcription_complete", { text })
        │
        ▼
  [Rust] automation.rs
    ├── Hide overlay window
    ├── Write text to clipboard (arboard)
    └── Simulate Ctrl+V paste (enigo)
```

## Directory Structure

```
Trueears/
├── frontend/                 # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/       # UI components
│   │   ├── controllers/      # Dictation orchestration
│   │   ├── services/         # API clients (Groq, auth, payments)
│   │   ├── hooks/            # React hooks
│   │   ├── types/            # TypeScript types
│   │   ├── utils/            # Helpers
│   │   └── data/             # Static data
│   ├── tests/                # Frontend tests
│   ├── vite.config.ts
│   └── tsconfig.json
├── backend/                  # Tauri v2 Rust backend
│   ├── src/
│   │   ├── lib.rs            # App entry, command registration
│   │   ├── shortcuts.rs      # Global hotkeys
│   │   ├── window.rs         # Active window detection
│   │   ├── automation.rs     # Clipboard + paste simulation
│   │   ├── auth.rs           # OAuth
│   │   ├── installed_apps/   # App discovery (per-platform)
│   │   └── ...
│   ├── Cargo.toml
│   └── tauri.conf.json       # Tauri config (windows, bundle, plugins)
├── auth-server/              # OAuth authentication server (separate service)
├── payment-service/          # LemonSqueezy payment integration (separate service)
├── scripts/
│   ├── sync-version.js       # Syncs version from package.json → tauri.conf.json
│   ├── dev-linux.sh          # Clean-env launcher for Linux dev
│   └── ensure-linux-app-id.sh
├── .env.example              # Environment variable template
├── package.json              # Version source of truth, npm scripts
└── docs/                     # Documentation
```

## Platform Differences

### Windows
- Active window detection via Win32 `GetForegroundWindow` + `GetWindowText`
- Cursor position via Win32 `GetCursorPos`
- Installed app discovery scans Start Menu `.lnk` files and Registry uninstall keys
- Bundle format: NSIS installer (per-user install), embeds WebView2 bootstrapper
- WebView engine: Chromium (via WebView2)

### Linux
- Active window detection via `xdotool` (X11) or XDG Portal (Wayland)
- Cursor position via `xdotool getmouselocation`
- Global shortcuts use XDG Desktop Portal on Wayland, falling back to the standard Tauri shortcut backend on X11
- Wayland overlay uses a smaller centered window with `set_focusable(false)` to avoid stealing focus
- WebView engine: WebKitGTK -- requires explicit media stream permission grants
- Bundle formats: AppImage, `.deb`
- `dev-linux.sh` script provides a sanitized environment to avoid snap/flatpak path pollution

## Build System

- **Version source of truth**: `package.json` (`version` field, currently `0.3.0`)
- **Version sync**: `scripts/sync-version.js` copies the version from `package.json` into `backend/tauri.conf.json` before each build
- **Dev server**: `npm run dev` starts the Tauri dev shell, which launches `vite dev` (port 3000) and the Rust backend together
- **Production build**: `npm run build` syncs the version, builds the Vite frontend, then runs `tauri build` to produce platform installers
- **Frontend-only build**: `npm run vite:build` builds just the frontend assets into `frontend/dist/`

### npm scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start Tauri dev mode (frontend + backend with hot reload) |
| `npm run dev:linux` | Linux-specific dev launcher with clean environment |
| `npm run build` | Production build (version sync + Vite + Tauri bundle) |
| `npm run vite:dev` | Frontend-only dev server |
| `npm run vite:build` | Frontend-only production build |
| `npm run preview` | Preview the built frontend |
| `npm run sync-version` | Manually sync version to tauri.conf.json |
