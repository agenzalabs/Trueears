# Implementation Plan: Windows Deployment Dependencies Fix

**Branch**: `001-win-deploy-fix` | **Date**: 2025-12-26 | **Spec**: [specs/001-win-deploy-fix/spec.md](specs/001-win-deploy-fix/spec.md)
**Input**: Feature specification from `/specs/001-win-deploy-fix/spec.md`

## Summary

This feature resolves critical Windows deployment issues where the application fails to launch on fresh installations due to missing Microsoft Visual C++ Runtime and WebView2 Runtime.

The solution involves two configuration changes:
1. Enabling static linking of the C runtime (CRT) in the Rust build configuration to remove the external MSVC dependency.
2. Configuring the Tauri bundler to automatically embed the WebView2 bootstrapper in the installer.

This ensures a seamless "install and run" experience for Windows users without manual dependency management.

## Technical Context

**Language/Version**: Rust 1.70+ (Tauri backend), Node.js/npm (Frontend build)
**Primary Dependencies**: Tauri CLI, Microsoft Visual C++ Build Tools (dev only)
**Storage**: N/A (Configuration only)
**Testing**: Manual validation on clean Windows environment (Sandbox), potentially automated via CI
**Target Platform**: Windows 10/11 (x86_64)
**Project Type**: Desktop Application (Tauri)
**Performance Goals**: Minimal impact on binary size (~1MB increase for static CRT), no runtime performance degradation
**Constraints**: Must not break Linux/macOS builds, must work on clean Windows installs
**Scale/Scope**: Configuration changes only, affects build/deployment pipeline

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Simplicity & Speed | Bundle impact <25MB, UI response <100ms | ✅ Static linking adds ~1MB, bootstrapper adds negligible size (downloads on demand) or ~200KB. Well within limits. |
| II. Test-First (NON-NEGOTIABLE) | Tests written before implementation | ⚠️ Configuration changes are hard to unit test. Will rely on manual acceptance testing in Windows Sandbox as defined in spec. |
| III. Type Safety | TypeScript strict mode, explicit contracts | ✅ N/A (Config changes only) |
| IV. Clean Architecture | Layer separation respected (UI→Hooks→Services→Backend) | ✅ N/A (Build config only) |
| V. Security | API keys in secure store, no clipboard overreach | ✅ No security impact. WebView2 comes from official MS source. |
| VI. Platform-Native | Uses Tauri backend for system APIs | ✅ Uses native Tauri configuration and Rust compiler flags. |
| VII. Incremental Changes | PR touches <5 files, feature flagged if experimental | ✅ Touches 2 files: `backend/.cargo/config.toml` and `backend/tauri.conf.json`. |

## Project Structure

### Documentation (this feature)

```text
specs/001-win-deploy-fix/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (N/A)
├── quickstart.md        # Phase 1 output (N/A)
├── contracts/           # Phase 1 output (N/A)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
backend/
├── .cargo/
│   └── config.toml      # NEW: Rust build configuration for static linking
├── tauri.conf.json      # MODIFIED: Bundler configuration for WebView2
```

**Structure Decision**: This feature only affects build configuration files in the `backend/` directory. No source code changes are required in `src/` directories.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| II. Test-First (Partial) | Configuration changes cannot be unit tested | Integration testing via Windows Sandbox is the only viable verification method for installer behavior. |
