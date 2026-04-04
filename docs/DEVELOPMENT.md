# Development Guide

This guide covers local setup, daily development workflow, and troubleshooting for Trueears.

## Prerequisites

### All platforms

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20.19+ or 22.12+ | Frontend build, npm scripts |
| npm | (bundled with Node) | Package management |
| Rust | 1.77+ | Backend compilation |
| Tauri CLI | 2.x | Installed via `@tauri-apps/cli` devDependency |

### Windows

- **Microsoft Visual C++ Build Tools** -- install via [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/). Select the "Desktop development with C++" workload.
- **WebView2** -- ships with Windows 10 (version 1803+) and Windows 11. The Tauri build embeds a WebView2 bootstrapper for older systems.
- No additional system packages are needed.

### Linux

Install the following system packages (Ubuntu/Debian):

```bash
sudo apt-get update
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf \
  libgtk-3-dev \
  libsoup-3.0-dev \
  libjavascriptcoregtk-4.1-dev \
  xdotool
```

Additional runtime dependencies for full functionality:
- `xdotool` -- used for active window detection and cursor position on X11
- `xdg-desktop-portal` -- required for global shortcuts on Wayland

For Fedora/RHEL-based systems, use the equivalent packages (`webkit2gtk4.1-devel`, `libappindicator-gtk3-devel`, etc.).

## Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/devv-shayan/Trueears.git
cd Trueears

# 2. Install frontend dependencies
npm install

# 3. Copy environment template
cp .env.example .env

# 4. Add your Groq API key to .env (or configure it later in the app settings)
#    The app will open the settings window on first launch if no API key is set.

# 5. Start development
npm run dev          # Windows
npm run dev:linux    # Linux (uses sanitized environment)
```

The `dev` command starts both the Vite dev server (port 3000) and the Tauri Rust backend with hot reload. Frontend changes appear instantly; backend changes trigger a Rust recompile.

## Project Structure

```
Trueears/
├── frontend/           # React 19 + TypeScript + TailwindCSS 4
│   ├── src/
│   │   ├── components/ # UI -- overlay, settings, onboarding
│   │   ├── controllers/# Dictation pipeline orchestration
│   │   ├── services/   # Groq API, auth, payments
│   │   ├── hooks/      # React hooks
│   │   ├── types/      # TypeScript types
│   │   ├── utils/      # Helpers (Tauri API wrapper, etc.)
│   │   └── data/       # Static data
│   ├── tests/
│   ├── vite.config.ts  # Vite config (port 3000, env from workspace root)
│   └── tsconfig.json
├── backend/            # Tauri v2 Rust backend
│   ├── src/            # Rust source (shortcuts, window detection, automation)
│   ├── Cargo.toml      # Rust dependencies (min Rust 1.77.2)
│   └── tauri.conf.json # Tauri window/bundle/plugin config
├── auth-server/        # OAuth server (separate Rust service)
├── payment-service/    # Payment integration (separate Rust service)
├── scripts/            # Build and dev helper scripts
├── .env.example        # Environment variable template
└── package.json        # Version source of truth, npm scripts
```

## Key Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Tauri dev mode (frontend + backend, hot reload) |
| `npm run dev:linux` | Linux dev mode with clean environment (avoids snap path issues) |
| `npm run build` | Production build -- syncs version, builds frontend, creates platform installer |
| `npm run vite:dev` | Frontend-only dev server (no Rust backend) |
| `npm run vite:build` | Build frontend assets only |
| `npm run preview` | Preview built frontend locally |
| `npm run sync-version` | Sync version from package.json to tauri.conf.json |

## Environment Variables

The workspace root `.env` is the single source of configuration. Both the Vite frontend and Rust backend read from it.

Copy `.env.example` to `.env` and fill in the required values:

```bash
# Required for core functionality
# (Can also be set in-app via Settings > API Key)
# No .env entry needed if you set it through the UI -- it's stored in the Tauri store.

# Auth server URL (defaults to https://trueears.onrender.com)
API_URL=https://trueears.onrender.com
GOOGLE_CLIENT_ID=your_google_client_id
JWT_SECRET=change_me

# Payment service (only needed if running payment-service locally)
PAYMENT_API_PORT=3002
PAYMENT_DATABASE_URL=postgresql://...
LEMONSQUEEZY_API_KEY=...
```

The Groq API key is stored in the Tauri settings store (`settings.json`), not in `.env`. Users configure it through the app's settings UI or on first launch.

### Frontend-specific variables

Variables prefixed with `VITE_` are exposed to the frontend build:
- `VITE_PAYMENT_SERVICE_URL` -- payment service endpoint (auto-derived from `PAYMENT_API_PORT` if omitted)
- `VITE_LEMONSQUEEZY_VARIANT_ID_BASIC` -- LemonSqueezy variant ID
- `VITE_LEMONSQUEEZY_VARIANT_ID_PRO` -- LemonSqueezy variant ID

## Development Workflow

### Frontend changes

Edit files in `frontend/src/`. Vite provides instant HMR -- changes appear in the running app without restart.

Path alias `@/` maps to `frontend/src/`, so imports look like:
```typescript
import { tauriAPI } from '@/utils/tauriApi';
```

### Backend changes

Edit files in `backend/src/`. Tauri dev mode watches for Rust changes and recompiles automatically. Expect a few seconds for Rust compilation.

To add a new Tauri command:
1. Define the function in the appropriate module with `#[tauri::command]`
2. Register it in `lib.rs` inside the `invoke_handler` macro
3. Call it from the frontend via `invoke("command_name", { args })`

### Version management

The app version lives in `package.json`. Before builds, `scripts/sync-version.js` copies it to `backend/tauri.conf.json`. This runs automatically as part of `npm run build` and `npm run vite:build`.

## Building for Production

```bash
# Full production build (creates platform-specific installer)
npm run build
```

Build outputs:
- **Windows**: NSIS installer in `backend/target/release/bundle/nsis/`
- **Linux**: AppImage and `.deb` in `backend/target/release/bundle/appimage/` and `backend/target/release/bundle/deb/`

## Common Issues and Troubleshooting

### "Port 3000 already in use"

The Vite dev server requires port 3000 (configured in `vite.config.ts` with `strictPort: true`). Kill any process using that port or stop other dev servers.

### Global shortcut not working

The Ctrl+Shift+K shortcut may conflict with another application. Check the Tauri logs for warnings like "Recording shortcut may be in use by another application." Close the conflicting app and restart Trueears.

On **Linux Wayland**, shortcuts use the XDG Desktop Portal. If the portal is not available, the app falls back to the standard backend which may not work on Wayland. Ensure `xdg-desktop-portal` is installed.

### Linux: WebView crashes or blank window

If the WebView shows a blank page or crashes on Linux:
- Ensure `libwebkit2gtk-4.1-dev` is installed (not the older 4.0 version)
- The `dev-linux.sh` script sets `WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS=1` for development. This is intentional -- WebKitGTK sandboxing can conflict with snap-packaged environments.

### Linux: Audio recording permission denied

WebKitGTK requires explicit media stream permission. The app handles this automatically in `lib.rs` by granting `UserMediaPermissionRequest` and `DeviceInfoPermissionRequest`. If recording still fails, check that your system's PipeWire or PulseAudio is functioning.

### Rust compilation errors on Windows

Ensure you have the Visual C++ Build Tools installed with the "Desktop development with C++" workload. The `windows` crate requires the Windows SDK and MSVC linker.

### Settings not persisting

Settings are stored via `tauri-plugin-store` in a `settings.json` file in the app's data directory:
- Windows: `%APPDATA%/com.Trueears/`
- Linux: `~/.local/share/com.Trueears/`

### "Missing GOOGLE_CLIENT_ID" error

This only affects the OAuth login feature. If you don't need authentication, you can ignore it. Otherwise, set `GOOGLE_CLIENT_ID` in your `.env` file.

### Installed apps not showing in profiles

On Windows, the app scans Start Menu shortcuts and Registry uninstall keys. The cache is built at startup in the background. Call the settings reload or restart the app if recently installed apps are missing.

On Linux, installed app detection is minimal -- it logs a placeholder. App profile matching works via window title and executable path regardless.
