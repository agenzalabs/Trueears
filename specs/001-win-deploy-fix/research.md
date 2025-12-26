# Research: Windows Deployment Dependencies Fix

**Feature**: `001-win-deploy-fix`
**Date**: 2025-12-26

## Decisions & Rationale

### 1. Static Linking for C Runtime (CRT)

- **Decision**: Configure Rust to statically link the C runtime on Windows (`target-feature=+crt-static`).
- **Rationale**:
  - Eliminates the dependency on "Microsoft Visual C++ Redistributable", which is a common failure point for users.
  - Improves user experience by removing a prerequisite installation step.
  - The file size increase (~1MB) is negligible compared to the 25MB app size budget.
- **Alternatives Considered**:
  - *Bundling VC++ Redistributable Installer*: Adds ~25MB to the download, increases install time, and requires user intervention or complex silent install flags. Rejected for poor UX and bloat.
  - *Documenting Requirement*: Asking users to "go download this first" causes high churn/abandonment. Rejected.

### 2. Embedded WebView2 Bootstrapper

- **Decision**: Use Tauri's `webviewInstallMode: { "type": "embedBootstrapper" }` configuration.
- **Rationale**:
  - Ensures the UI runtime is present on older Windows 10 versions.
  - The bootstrapper is small (~200KB) and only downloads the full runtime if missing.
  - It's the official Microsoft-recommended way to deploy WebView2 apps.
- **Alternatives Considered**:
  - *Offline Installer*: Bundles the full 100MB+ runtime. Rejected as it violates the <25MB bundle size constraint.
  - *Skip Install*: Risks white-screen startup crashes on systems without WebView2. Rejected.

## Implementation Details

### Configuration Changes

**1. `backend/.cargo/config.toml`**:
```toml
[target.x86_64-pc-windows-msvc]
rustflags = ["-C", "target-feature=+crt-static"]
```

**2. `backend/tauri.conf.json`**:
```json
"bundle": {
  "windows": {
    "webviewInstallMode": {
      "type": "embedBootstrapper"
    }
  }
}
```
