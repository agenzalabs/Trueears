# Implementation Plan: Terms of Service & Privacy Consent

**Branch**: `005-terms-privacy-consent` | **Date**: 2026-01-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-terms-privacy-consent/spec.md`

## Summary

Implement a first-run consent flow that requires users to accept Terms of Service and Privacy Policy before using Trueears. This feature adds legal compliance for data collection (microphone, clipboard, window info) by:
1. Displaying a consent screen on first launch (before onboarding)
2. Persisting consent state in Tauri secure store
3. Adding legal document access in Settings
4. Supporting re-consent when terms are updated

## Technical Context

**Language/Version**: TypeScript 5.8+ (frontend), Rust (backend - minimal changes)
**Primary Dependencies**: React 19.x, TailwindCSS 4.x, @tauri-apps/plugin-store
**Storage**: Tauri secure store (`settings.json`) - same as existing settings
**Testing**: Vitest (unit), Playwright (integration)
**Target Platform**: Windows (primary), future macOS/Linux
**Project Type**: Tauri desktop app (web frontend + Rust backend)
**Performance Goals**: Consent screen renders <100ms, no impact on cold start (<2s)
**Constraints**: Offline-capable (documents bundled), consent check adds <50ms to startup
**Scale/Scope**: Single-user desktop app, per-device consent storage

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Simplicity & Speed | Bundle impact <25MB, UI response <100ms | ✅ Legal docs are ~20KB text, consent check is O(1) store read |
| II. Test-First (NON-NEGOTIABLE) | Tests written before implementation | ✅ Will write tests for useConsent hook, ConsentScreen component, version comparison |
| III. Type Safety | TypeScript strict mode, explicit contracts | ✅ ConsentRecord interface defined, typed hook return values |
| IV. Clean Architecture | Layer separation respected (UI→Hooks→Services→Backend) | ✅ ConsentScreen (UI) → useConsent (hook) → tauriAPI (service) → store (backend) |
| V. Security | API keys in secure store, no clipboard overreach | ✅ Consent data uses same secure store as API keys, no new permissions needed |
| VI. Platform-Native | Uses Tauri backend for system APIs | ✅ Uses existing Tauri store plugin, no new native code required |
| VII. Incremental Changes | PR touches <5 files when possible | ⚠️ Feature requires ~8-10 files, but can be split into 3 PRs: (1) consent flow, (2) settings access, (3) re-consent |

## Project Structure

### Documentation (this feature)

```text
specs/005-terms-privacy-consent/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── typescript-interfaces.ts
└── tasks.md             # Phase 2 output (via /sp.tasks)
```

### Source Code (repository root)

```text
frontend/src/
├── components/
│   ├── consent/
│   │   ├── ConsentScreen.tsx        # NEW: Full-screen consent UI
│   │   ├── LegalDocumentViewer.tsx  # NEW: Scrollable document display
│   │   └── ConsentButtons.tsx       # NEW: Accept/Decline buttons
│   ├── settings/
│   │   └── LegalSettings.tsx        # NEW: Settings tab for legal docs
│   ├── onboarding/
│   │   └── OnboardingWizard.tsx     # MODIFY: Add consent check before wizard
│   └── SettingsWindow.tsx           # MODIFY: Add Legal tab, consent gate
├── hooks/
│   ├── useConsent.ts                # NEW: Consent state management
│   └── useSettings.ts               # MODIFY: Add consent-related settings
├── types/
│   └── consent.ts                   # NEW: ConsentRecord, LegalDocument types
├── content/
│   ├── terms-of-service.md          # NEW: Terms document (bundled)
│   └── privacy-policy.md            # NEW: Privacy document (bundled)
└── utils/
    └── consentService.ts            # NEW: Version comparison logic

frontend/tests/
├── hooks/
│   └── useConsent.test.ts           # NEW: Unit tests for consent hook
├── components/
│   └── ConsentScreen.test.tsx       # NEW: Component tests
└── integration/
    └── consent-flow.test.ts         # NEW: E2E consent flow tests
```

**Structure Decision**: Follows existing codebase patterns - consent components in `components/consent/`, hook in `hooks/`, types in `types/`. Legal documents bundled as markdown in `content/` folder (new). No backend changes needed - uses existing store plugin.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| 8-10 files touched | Consent flow requires UI, hook, types, content, tests | Could skip tests (rejected - violates Principle II) or skip Settings integration (rejected - violates FR-008) |

## Design Decisions

### D1: Consent Check Location
**Decision**: Check consent in `SettingsWindow.tsx` BEFORE onboarding check
**Rationale**: Legal consent must be obtained before ANY data collection, including microphone permission requests in onboarding

### D2: Document Storage Format
**Decision**: Bundle legal documents as markdown files, render with a simple markdown renderer
**Rationale**:
- Markdown is human-editable and version-controllable
- Keeps bundle small (~20KB vs loading from remote)
- Works offline (FR-010)
- Can be styled consistently with app theme

### D3: Version Comparison Strategy
**Decision**: Semantic versioning (major.minor) where major changes require re-consent
**Rationale**: Aligns with spec assumption - minor wording changes don't require re-consent, only material changes (new data collection, rights changes)

### D4: Consent Storage Keys
**Decision**: Add to existing `settings.json` store with keys:
- `Trueears_CONSENT_STATUS`: 'accepted' | 'declined' | null
- `Trueears_CONSENT_TIMESTAMP`: ISO 8601 string
- `Trueears_CONSENT_TERMS_VERSION`: string (e.g., '1.0.0')
- `Trueears_CONSENT_PRIVACY_VERSION`: string (e.g., '1.0.0')
- `Trueears_CONSENT_APP_VERSION`: string (e.g., '0.2.0')

**Rationale**: Uses proven secure store mechanism, consistent with existing settings pattern

### D5: UI Flow
**Decision**: Full-screen consent modal that blocks all app interaction
```
App Launch
    ↓
Check Trueears_CONSENT_STATUS
    ↓
[null/needs update] → ConsentScreen (blocks)
    ↓
[accepted] → Normal app flow (onboarding or main)
    ↓
[declined] → Decline message with "Reconsider" / "Exit" options
```

**Rationale**: Ensures FR-006 (block all functionality until consent)

## Implementation Phases

### Phase 1: Core Consent Flow (P1 User Story)
1. Create consent types (`types/consent.ts`)
2. Create `useConsent` hook with tests
3. Create `ConsentScreen` component with tests
4. Bundle legal documents as markdown
5. Integrate consent check in `SettingsWindow.tsx`

### Phase 2: Settings Access (P2 User Story)
1. Create `LegalSettings` component
2. Add "Legal" tab to Settings navigation
3. Create `LegalDocumentViewer` for full document display

### Phase 3: Re-Consent Flow (P3 User Story)
1. Add version comparison logic to `useConsent`
2. Create "Terms Updated" variant of consent screen
3. Add version constants and update detection

## Testing Strategy

### Unit Tests (Vitest)
- `useConsent.test.ts`: Hook initialization, state transitions, store persistence
- `consentService.test.ts`: Version comparison logic

### Component Tests (Vitest + Testing Library)
- `ConsentScreen.test.tsx`: Renders correctly, button interactions, accessibility
- `LegalDocumentViewer.test.tsx`: Markdown rendering, scroll behavior

### Integration Tests (Playwright)
- Fresh install shows consent screen
- Accept flow proceeds to onboarding
- Decline flow shows message and options
- Settings shows legal documents
- App restart doesn't re-prompt if consented

## Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Legal document content inadequate | Medium | High | Document assumptions in spec; can update content without code changes |
| Consent storage corruption | Low | Medium | Graceful fallback: show consent screen again (fail-safe) |
| Performance impact on cold start | Low | Low | Consent check is single store read (~1ms) |
| User confusion about consent | Medium | Medium | Clear, plain-language UI with "Why we need this" explanations |

## Dependencies

- **No new npm packages required** - uses existing react-markdown or simple custom renderer
- **No backend changes** - uses existing Tauri store plugin
- **No database changes** - local device storage only

## Next Steps

After this plan is approved:
1. Run `/sp.tasks` to generate detailed task list
2. Implement Phase 1 (Core Consent Flow) first
3. Create PR for Phase 1, then iterate on Phases 2-3
