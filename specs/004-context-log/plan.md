# Implementation Plan: Context-Aware Log Mode

**Branch**: `004-context-log` | **Date**: 2025-12-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-context-log/spec.md`

## Summary

Context-Aware Log Mode enables voice-triggered logging where users speak trigger phrases (e.g., "Log...", "Note to self...") to capture thoughts directly to app-specific markdown files. The feature integrates into the existing dictation pipeline, detecting triggers after Whisper transcription and routing content to configured log files based on the active application. A new Tauri command handles file append operations, and settings are stored using the existing Tauri Store pattern.

## Technical Context

**Language/Version**: TypeScript 5.8+ (frontend), Rust 1.70+ (backend)
**Primary Dependencies**: React 19, TailwindCSS 4, Tauri 2.x, Tauri Store Plugin
**Storage**: Tauri Store (JSON file) for config, Local filesystem for log files (.md/.txt/.log)
**Testing**: Vitest (frontend), cargo test (backend)
**Target Platform**: Windows 10+ (primary), macOS/Linux (future)
**Project Type**: Desktop application (Tauri + React)
**Performance Goals**: Log entry saved within 3 seconds of speaking, UI response <100ms
**Constraints**: Bundle size <25MB, Memory <150MB, Minimal file I/O blocking
**Scale/Scope**: Single user, unlimited log files, ~10-100 log entries per day

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Simplicity & Speed | Bundle impact <25MB, UI response <100ms | PASS - Minimal new code, async file I/O |
| II. Test-First (NON-NEGOTIABLE) | Tests written before implementation | PASS - TDD workflow planned |
| III. Type Safety | TypeScript strict mode, explicit contracts | PASS - Full type definitions in contracts/ |
| IV. Clean Architecture | Layer separation respected | PASS - LogModeService handles logic, UI is presentation only |
| V. Security | API keys in secure store, no clipboard overreach | PASS - No secrets involved, clipboard only on fallback |
| VI. Platform-Native | Uses Tauri backend for system APIs | PASS - File write via Tauri command |
| VII. Incremental Changes | PR touches <5 files, feature flagged if experimental | PASS - Feature has master enable toggle |

## Project Structure

### Documentation (this feature)

```text
specs/004-context-log/
├── plan.md              # This file
├── spec.md              # Feature requirements
├── research.md          # Technical decisions
├── data-model.md        # Data structures
├── quickstart.md        # Implementation guide
├── contracts/           # Interface definitions
│   ├── tauri-commands.md
│   └── typescript-interfaces.ts
├── checklists/
│   └── requirements.md  # Quality checklist
└── tasks.md             # (Created by /sp.tasks)
```

### Source Code (repository root)

```text
backend/src/
├── lib.rs               # Add: append_to_file, validate_log_path commands
└── (existing files)     # No changes to existing modules

frontend/src/
├── types/
│   └── logMode.ts       # NEW: Type definitions
├── services/
│   └── logModeService.ts # NEW: Log Mode business logic
├── hooks/
│   └── useDictation.ts  # MODIFY: Add trigger detection branch
├── components/
│   ├── ConfigPrompt.tsx # NEW: First-time config modal
│   ├── SettingsWindow.tsx # MODIFY: Add Log Mode tab
│   └── settings/
│       ├── LogModeSettings.tsx    # NEW: Main settings component
│       ├── TriggerPhraseList.tsx  # NEW: Trigger management
│       └── AppMappingList.tsx     # NEW: Mapping management
└── (existing files)
```

**Structure Decision**: Uses existing Tauri + React web application structure. New files follow established patterns (services/, components/settings/). Backend changes are minimal (2 new Tauri commands).

## Key Design Decisions

| Decision | Rationale | Reference |
|----------|-----------|-----------|
| Trigger detection after Whisper | Cleanest text source, before LLM formatting | research.md |
| Tauri Store for config | Consistent with existing settings pattern | research.md |
| Custom Tauri command for file write | No existing capability, minimal code | research.md |
| Longest-match-first trigger matching | Handles "Note to self" vs "Note" correctly | data-model.md |
| Clipboard fallback on error | Zero data loss guarantee (SC-005) | spec.md |

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| File permission errors | User loses content | Clipboard fallback (FR-012) |
| Trigger phrase false positives | Wrong mode activated | Only match at START of text |
| Large log files (>10MB) | Slow append | Append mode is O(1), no read required |
| macOS/Linux window detection | No context awareness | Fall back to "Default" mapping |
| Settings sync race condition | Stale config used | Re-read config at trigger time |

## Implementation Phases

See [quickstart.md](./quickstart.md) for detailed implementation steps.

| Phase | Priority | Description | Files Touched |
|-------|----------|-------------|---------------|
| 1. Backend Foundation | P1 | Add Tauri commands | 1 (lib.rs) |
| 2. Settings Storage | P1 | LogModeService + types | 2 new files |
| 3. Trigger Detection | P1 | Integration into dictation | 2 files (service + hook) |
| 4. File Writing Flow | P1 | Complete save flow | 1 file (service) |
| 5. Config Prompt | P2 | First-time UX | 1 new component |
| 6. Settings UI | P3 | Management UI | 4 new components |

## Complexity Tracking

> No constitution violations. All gates passed.

## Related Artifacts

- **Spec**: [spec.md](./spec.md) - Feature requirements
- **Research**: [research.md](./research.md) - Technical decisions
- **Data Model**: [data-model.md](./data-model.md) - Entity definitions
- **Contracts**: [contracts/](./contracts/) - Interface definitions
- **Quickstart**: [quickstart.md](./quickstart.md) - Implementation guide

## Next Steps

Run `/sp.tasks` to generate the detailed task breakdown for implementation.
