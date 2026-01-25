# Implementation Plan: Cancel Recording

**Branch**: `001-cancel-recording` | **Date**: 2025-12-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-cancel-recording/spec.md`

## Summary

Add cancel recording functionality allowing users to abort an ongoing recording by pressing Escape. The recording is discarded without transcription, the overlay displays a distinct "cancelled" status (amber/yellow), and a unique cancellation sound plays. This addresses the current behavior where Escape triggers `handleStopRecording()` which still processes and tranTrueearss the audio.

## Technical Context

**Language/Version**: TypeScript 5.8+ (frontend), Rust (backend - not needed for this feature)
**Primary Dependencies**: React 19, TailwindCSS 4, Web Audio API
**Storage**: N/A (no persistence changes)
**Testing**: Vitest (unit tests for hooks), manual testing for UI/UX
**Target Platform**: Windows desktop (Tauri 2.x)
**Project Type**: Desktop app (Tauri + React)
**Performance Goals**: Cancel response <100ms (per SC-001)
**Constraints**: Memory release on cancel, no API calls on cancel
**Scale/Scope**: Single user desktop app, ~5 files modified

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Simplicity & Speed | Bundle impact <25MB, UI response <100ms | ✅ Minimal code addition (~50 lines), no new dependencies |
| II. Test-First (NON-NEGOTIABLE) | Tests written before implementation | ✅ Unit tests for `cancelDictation` and `cancelRecording` planned |
| III. Type Safety | TypeScript strict mode, explicit contracts | ✅ `DictationStatus` type extended with 'cancelled' |
| IV. Clean Architecture | Layer separation respected (UI→Hooks→Services→Backend) | ✅ Changes in hooks layer only, UI consumes via existing pattern |
| V. Security | API keys in secure store, no clipboard overreach | ✅ No security surface changes |
| VI. Platform-Native | Uses Tauri backend for system APIs | ✅ No backend changes needed, uses Web Audio API |
| VII. Incremental Changes | PR touches <5 files, feature flagged if experimental | ✅ ~5 files: 2 hooks, 1 component, 1 util, 1 type |

## Project Structure

### Documentation (this feature)

```text
specs/001-cancel-recording/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # N/A (no API changes)
└── tasks.md             # Phase 2 output (/sp.tasks command)
```

### Source Code (repository root)

```text
frontend/src/
├── hooks/
│   ├── useAudioRecorder.ts    # Add cancelRecording()
│   └── useDictation.ts        # Add cancelDictation(), extend DictationStatus
├── components/
│   ├── RecorderOverlay.tsx    # Update Escape key handler
│   └── StatusIndicator.tsx    # Add 'cancelled' status display
├── utils/
│   └── soundUtils.ts          # Add playCancelSound()
└── types/                     # (if DictationStatus moved to separate file)

frontend/tests/
├── unit/
│   ├── useAudioRecorder.test.ts
│   └── useDictation.test.ts
└── integration/
    └── cancel-recording.test.ts
```

**Structure Decision**: Desktop app with Tauri backend + React frontend. All changes are frontend-only (no Rust modifications needed). Files follow existing convention in `frontend/src/`.

## Complexity Tracking

> No violations - implementation is simple and follows existing patterns.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
