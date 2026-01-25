# Deployment Guide

Build Trueears for production distribution.

## Prerequisites

- Node.js v18+
- Rust (latest stable)
- Visual Studio Build Tools (Windows)

## Building for Production

### 1. Sync Version

Ensure version is consistent across configuration files:

```bash
npm run sync-version
```

### 2. Build

```bash
npm run build
```

### 3. Locate Output

The installer is generated in:

```
backend/target/release/bundle/
├── nsis/
│   └── Trueears_<version>_x64-setup.exe    # Windows NSIS installer
└── msi/
    └── Trueears_<version>_x64_en-US.msi    # Windows MSI installer
```

**Bundle size:** ~15-20 MB (vs ~150MB with Electron)

## Build Configuration

### Tauri Configuration

Key settings in `backend/tauri.conf.json`:

```json
{
  "productName": "Trueears",
  "version": "0.2.0",
  "bundle": {
    "targets": "all",
    "icon": ["../build/icon.ico"],
    "windows": {
      "nsis": {
        "installerIcon": "../build/icon.ico",
        "installMode": "currentUser"
      },
      "webviewInstallMode": {
        "type": "embedBootstrapper"
      }
    }
  }
}
```

### Bundle Targets

| Target | Format | Platform |
|--------|--------|----------|
| `nsis` | NSIS Installer (.exe) | Windows |
| `msi` | MSI Installer (.msi) | Windows |
| `dmg` | Disk Image (.dmg) | macOS |
| `app` | Application Bundle (.app) | macOS |
| `deb` | Debian Package (.deb) | Linux |
| `appimage` | AppImage (.AppImage) | Linux |

To build specific targets:

```bash
cd backend && tauri build --target nsis
```

## Platform-Specific Notes

### Windows

**Requirements:**
- Visual Studio Build Tools 2019+
- Windows SDK

**WebView2:**
The `embedBootstrapper` mode includes WebView2 installer with the app, ensuring it works on systems without WebView2 pre-installed.

### macOS

**Requirements:**
- Xcode Command Line Tools
- Code signing certificate (for distribution)

**Code Signing:**
```bash
export APPLE_CERTIFICATE="Developer ID Application: Your Name"
npm run build
```

### Linux

**Requirements:**
- Various dev packages (see Tauri docs)
- `webkit2gtk` and `libsoup`

```bash
# Ubuntu/Debian
sudo apt install libwebkit2gtk-4.1-dev libsoup-3.0-dev
```

## Environment Variables

For production builds, ensure these are set appropriately:

| Variable | Purpose |
|----------|---------|
| `TAURI_PRIVATE_KEY` | Code signing (optional) |
| `TAURI_KEY_PASSWORD` | Signing key password |

## Release Checklist

1. Update version in `package.json`
2. Run `npm run sync-version`
3. Update `CHANGELOG.md`
4. Build: `npm run build`
5. Test installer on clean machine
6. Create git tag: `git tag v<version>`
7. Push with tags: `git push --tags`

## Troubleshooting Builds

### "WebView2 not found" on Windows

The `embedBootstrapper` webview install mode should handle this automatically. If issues persist, users can manually install WebView2 from [Microsoft](https://developer.microsoft.com/microsoft-edge/webview2/).

### Build fails with Rust errors

Ensure Rust toolchain is up to date:

```bash
rustup update stable
```

### Icon not appearing

Ensure icon files exist:
- `build/icon.ico` (Windows, 256x256 minimum)
- `build/icon.png` (Linux)
- `build/icon.icns` (macOS)

## Auto-Updates

Tauri supports auto-updates via the updater plugin. Configuration is in `tauri.conf.json` under the `plugins.updater` section (not currently enabled).

## Related Documentation

- [Architecture Overview](../architecture/overview.md)
- [Development Guide](./development.md)
- [Tauri Bundler Docs](https://v2.tauri.app/distribute/)
