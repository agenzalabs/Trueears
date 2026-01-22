# Research: Terms of Service & Privacy Consent

**Feature**: 005-terms-privacy-consent
**Date**: 2026-01-16

## Research Summary

This document consolidates research findings for implementing the consent flow feature.

---

## R1: Existing Settings Storage Pattern

### Decision
Use the existing Tauri secure store (`settings.json`) with the same pattern as other settings.

### Rationale
- Proven mechanism already used for API keys and preferences
- Cross-window synchronization via `settings-changed` event already works
- No additional dependencies required
- Secure storage (not localStorage)

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| Separate consent.json file | Adds complexity, no benefit over existing store |
| localStorage | Not secure, doesn't sync across windows |
| IndexedDB | Overkill for simple key-value consent data |
| Backend/cloud storage | Violates offline requirement (FR-010) |

### Implementation Reference
- Store wrapper: `frontend/src/utils/tauriApi.ts` (lines 276-294)
- Hook pattern: `frontend/src/hooks/useSettings.ts`
- Backend commands: `backend/src/lib.rs` (lines 35-70)

---

## R2: First-Run Detection Pattern

### Decision
Follow the existing `SCRIBE_ONBOARDING_COMPLETE` pattern - store a boolean flag that indicates consent has been given.

### Rationale
- Consistent with how onboarding complete is tracked
- Simple check on app startup: `if (!consentGiven) showConsentScreen()`
- Works offline, instant check

### Key Insight from Codebase
The onboarding check in `SettingsWindow.tsx` (lines 120-128):
```typescript
if (!onboardingComplete || micPermissionGranted === false) {
  return <OnboardingWizard initialStep={initialStep} />;
}
```

Consent check must come BEFORE this - we add a similar pattern:
```typescript
if (consentStatus !== 'accepted') {
  return <ConsentScreen />;
}
if (!onboardingComplete || micPermissionGranted === false) {
  return <OnboardingWizard initialStep={initialStep} />;
}
```

---

## R3: Document Bundling Strategy

### Decision
Bundle legal documents as markdown files imported directly into the React app.

### Rationale
- Markdown is version-controllable (changes tracked in git)
- Easy to update without code changes
- Can use existing markdown rendering (if available) or simple custom renderer
- Bundle size impact: ~10-20KB for both documents

### Implementation Approach
```typescript
// Option 1: Import as raw string (via Vite)
import termsContent from '../content/terms-of-service.md?raw';
import privacyContent from '../content/privacy-policy.md?raw';

// Option 2: Store in TypeScript constants
export const TERMS_CONTENT = `# Terms of Service\n...`;
export const PRIVACY_CONTENT = `# Privacy Policy\n...`;
```

**Chosen**: Option 1 (raw imports) - cleaner separation, easier to edit

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| Fetch from remote URL | Violates offline requirement (FR-010) |
| Load from filesystem | Adds complexity, file might be missing |
| Embed in HTML | Harder to version control, ugly escaping |

---

## R4: Version Comparison for Re-Consent

### Decision
Use semantic versioning (MAJOR.MINOR.PATCH) where MAJOR changes trigger re-consent.

### Rationale
- Simple comparison: `storedVersion.split('.')[0] !== currentVersion.split('.')[0]`
- Clear contract: bump major version when data practices change
- Matches industry standard (apps do this for GDPR compliance)

### Version Comparison Logic
```typescript
function requiresReconsent(storedVersion: string | null, currentVersion: string): boolean {
  if (!storedVersion) return true; // Never consented

  const storedMajor = parseInt(storedVersion.split('.')[0], 10);
  const currentMajor = parseInt(currentVersion.split('.')[0], 10);

  return currentMajor > storedMajor; // Re-consent only for major bumps
}
```

### Version Constants
```typescript
export const CURRENT_TERMS_VERSION = '1.0.0';
export const CURRENT_PRIVACY_VERSION = '1.0.0';
```

---

## R5: UI Component Patterns

### Decision
Follow existing component patterns:
- Full-screen modal for consent (like OnboardingWizard)
- Theme-aware styling (light/dark)
- Immediate save on action (no explicit Save button)

### Key Patterns from Codebase
1. **Theme awareness**: All components accept `theme` prop
2. **Immediate persistence**: Actions save to store immediately
3. **Event emission**: After save, emit `settings-changed` for cross-window sync
4. **Loading states**: Show skeleton or spinner while loading from store

### Component Structure
```
ConsentScreen (full-screen)
├── Header ("Before you start...")
├── DocumentTabs (Terms | Privacy)
├── DocumentViewer (scrollable markdown)
├── Checkbox ("I have read and agree to...")
└── ActionButtons (Accept | Decline)
```

---

## R6: Testing Framework

### Decision
Use Vitest for unit/component tests (already in project), Playwright for E2E.

### Rationale
- Vitest is fast, compatible with Vite
- React Testing Library for component tests
- Playwright for full app E2E (consent flow requires window management)

### Test Categories
| Category | Tool | Coverage |
|----------|------|----------|
| Hook logic | Vitest | State transitions, persistence |
| Components | Vitest + RTL | Rendering, interactions |
| Integration | Playwright | Full consent flow, window behavior |

---

## R7: Accessibility Requirements

### Decision
Ensure consent screen is fully accessible:
- Keyboard navigation (Tab through elements)
- Screen reader support (proper ARIA labels)
- Focus management (trap focus in modal)
- Readable font size (minimum 16px body text)

### Implementation Notes
- Use semantic HTML (`<dialog>` or role="dialog")
- Ensure document is scrollable via keyboard
- Accept/Decline buttons must be focusable
- Checkbox must have associated label

---

## Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| Where to store consent data? | Tauri secure store (settings.json) |
| How to bundle documents? | Vite raw imports |
| When to show re-consent? | Major version bump only |
| How to handle corrupted data? | Default to "no consent", re-show screen |

---

## References

- Existing settings hook: `frontend/src/hooks/useSettings.ts`
- Onboarding pattern: `frontend/src/components/onboarding/OnboardingWizard.tsx`
- Store API: `frontend/src/utils/tauriApi.ts`
- Microsoft Store policies: https://learn.microsoft.com/en-us/windows/apps/publish/store-policies
