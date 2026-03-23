# Tasks: Terms of Service & Privacy Consent

**Input**: Design documents from `/specs/005-terms-privacy-consent/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests ARE included based on Constitution Principle II (Test-First Development - NON-NEGOTIABLE)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `frontend/src/`
- **Tests**: `frontend/tests/` (Vitest) or `tests/` (Playwright E2E)

---

## Phase 1: Installer Integration ✅ COMPLETED

**Purpose**: Add NSIS license page to installer

- [x] T001 Create combined terms-and-privacy.txt in `backend/assets/legal/`
- [x] T002 Configure `tauri.conf.json` with `licenseFile: "./assets/legal/terms-and-privacy.txt"`
- [x] T003 Set bundler targets to `["nsis"]` only (MSI has WiX path space bug)
- [x] T004 Test installer shows license page and requires acceptance

---

## Phase 2: Settings Tab ✅ COMPLETED

**Purpose**: Add Legal & Privacy tab to Settings

- [x] T005 Create LegalPrivacySettings component in `frontend/src/components/settings/LegalPrivacySettings.tsx`
- [x] T006 Add collapsible sections for Terms of Service, Privacy Policy, and Data Controls
- [x] T007 Display "Last updated - January 16, 2026" for each section
- [x] T008 Add Legal & Privacy navigation item to SettingsWindow sidebar
- [x] T009 Wire up LegalPrivacySettings to Settings content area

**Checkpoint**: Settings tab complete - users can view legal documents

---

## ~~Phase 3: Frontend Consent Flow~~ (REMOVED)

**Decision**: Installer-only consent is sufficient. No frontend blocking consent screen needed.

**Rationale**: 
- Installer EULA provides legal consent at install time
- Settings tab provides ongoing document access
- Simpler UX - users don't see redundant consent screens
- Avoids complex version tracking and re-consent logic

---

## ~~Phase 4: Re-consent Flow~~ (OUT OF SCOPE)

**Decision**: Version-based re-consent deferred.

**Rationale**:
- Complex to implement and maintain
- Installer updates can include new EULA if terms change materially
- Users can review updated terms in Settings tab after any app update

---

## Summary

**Implemented:**
- ✅ Phase 1: NSIS installer license page (installer-based consent)
- ✅ Phase 2: Legal & Privacy settings tab (in-app document access)

**Out of Scope:**
- ❌ Frontend consent gate before onboarding (redundant with installer)
- ❌ Version-based re-consent flow (deferred - can use installer for material changes)

---

## Validation Checklist

- [x] Installer shows license page during fresh install
- [x] License text renders in standard small font across Windows versions
- [x] Installer aborts if user declines
- [x] Settings > Legal & Privacy tab displays all legal content
- [x] Legal sections are collapsible with proper theming
- [x] "Last updated" dates are displayed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories - **This is the MVP**
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Reuses LegalDocumentViewer from US1
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Extends useConsent hook from US1

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD - Constitution Principle II)
- Components with [P] marker can be implemented in parallel
- ConsentScreen depends on LegalDocumentViewer and ConsentButtons
- Integration into SettingsWindow comes last

### Parallel Opportunities

**Phase 1 (Setup):**
```
T002, T003, T004 can all run in parallel (different files)
```

**Phase 3 (US1) - after tests written:**
```
T017, T018 can run in parallel (different components)
```

**Phase 4 (US2) + Phase 5 (US3):**
```
If staffed, US2 and US3 can proceed in parallel after US1 complete
```

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Write component tests for ConsentScreen in frontend/tests/components/ConsentScreen.test.tsx"
Task: "Write component tests for LegalDocumentViewer in frontend/tests/components/LegalDocumentViewer.test.tsx"
Task: "Write component tests for ConsentButtons in frontend/tests/components/ConsentButtons.test.tsx"

# Launch parallel-safe components together:
Task: "Create LegalDocumentViewer component in frontend/src/components/consent/LegalDocumentViewer.tsx"
Task: "Create ConsentButtons component in frontend/src/components/consent/ConsentButtons.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T013)
3. Complete Phase 3: User Story 1 (T014-T023)
4. **STOP and VALIDATE**: Test first-run consent flow independently
5. Deploy/demo if ready - **This delivers legal compliance!**

### Incremental Delivery

| Increment | Delivers | Business Value |
|-----------|----------|----------------|
| US1 Complete | First-run consent | Legal compliance for new installs |
| US2 Complete | Settings access | Regulatory requirement met (ongoing access) |
| US3 Complete | Re-consent flow | Full GDPR/CalOPPA compliance |

### Suggested PR Strategy

Based on Constitution Principle VII (Incremental Changes):

- **PR 1**: Phase 1 + Phase 2 + Phase 3 (US1) - Core consent flow
- **PR 2**: Phase 4 (US2) - Settings access
- **PR 3**: Phase 5 (US3) + Phase 6 - Re-consent + polish

---

## Task Summary

| Phase | Tasks | Parallelizable |
|-------|-------|----------------|
| Phase 1: Setup | 5 | 3 |
| Phase 2: Foundational | 8 | 0 (sequential) |
| Phase 3: US1 (MVP) | 10 | 5 |
| Phase 4: US2 | 6 | 1 |
| Phase 5: US3 | 6 | 2 |
| Phase 6: Polish | 6 | 4 |
| **Total** | **41** | **15** |

---

## Notes

- [P] tasks = different files, no dependencies - can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (RED phase of TDD)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
