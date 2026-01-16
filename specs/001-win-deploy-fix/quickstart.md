# Quickstart: Windows Deployment Dependencies Fix

**Feature**: `001-win-deploy-fix`
**Date**: 2025-12-26

## Overview

This guide explains how to verify that the Windows build is correctly configured for static linking and WebView2 bootstrapping.

## Verification Steps

### 1. Verify Static Linking Configuration

Check `backend/.cargo/config.toml` exists and contains:

```toml
[target.x86_64-pc-windows-msvc]
rustflags = ["-C", "target-feature=+crt-static"]
```

### 2. Verify WebView2 Configuration

Check `backend/tauri.conf.json` contains:

```json
"bundle": {
  "windows": {
    "webviewInstallMode": {
      "type": "embedBootstrapper"
    }
  }
}
```

### 3. Build & Test (Windows Only)

1. Build the app:
   ```powershell
   cd backend
   npm run tauri build
   ```

2. Verify the executable dependencies (requires `dumpbin` from VS tools):
   ```powershell
   dumpbin /dependents backend/target/release/scribe.exe
   ```
   *Expected*: Should NOT list `VCRUNTIME140.dll` or `MSVCP140.dll` as direct dependencies.

3. Test Installation:
   - Copy the `.msi` or `setup.exe` to a clean Windows Sandbox.
   - Run the installer.
   - Verify it prompts for/installs WebView2 (if missing in Sandbox).
   - Verify the app launches successfully.
