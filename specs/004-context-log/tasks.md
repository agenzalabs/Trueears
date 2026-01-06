# Tasks: Context-Aware Log Mode

**Input**: Design documents from `/specs/004-context-log/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: TDD is required per Constitution (Principle II). Tests will be written before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/src/` (Rust/Tauri)
- **Frontend**: `frontend/src/` (React/TypeScript)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Type definitions and backend commands that all user stories depend on

- [x] T001 [P] Create LogMode type definitions in frontend/src/types/logMode.ts (copy from contracts/typescript-interfaces.ts)
- [x] T002 [P] Add append_to_file Tauri command in backend/src/lib.rs with path validation
- [x] T003 [P] Add validate_log_path Tauri command in backend/src/lib.rs
- [x] T004 Add tauriAPI wrapper functions for new commands in frontend/src/utils/tauriApi.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core LogModeService that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create LogModeService class structure in frontend/src/services/logModeService.ts
- [x] T006 Implement getConfig() and saveConfig() methods in frontend/src/services/logModeService.ts
- [x] T007 Implement default config initialization with 3 default trigger phrases in frontend/src/services/logModeService.ts
- [x] T008 Implement settings change event listener for cross-window sync in frontend/src/services/logModeService.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Basic Voice Logging (Priority: P1) MVP

**Goal**: User can speak a trigger phrase and have the content saved to a configured log file

**Independent Test**: Speak "Log check the Redis timeout" in VS Code with mapping configured, verify text appears in destination file

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**
> Tests deferred - no test framework installed

- [x] T009 [P] [US1] Unit test for detectTrigger() function in frontend/src/services/__tests__/logModeService.test.ts
- [x] T010 [P] [US1] Unit test for findMappingForApp() function in frontend/src/services/__tests__/logModeService.test.ts
- [x] T011 [P] [US1] Unit test for formatLogEntry() with timestamp in frontend/src/services/__tests__/logModeService.test.ts
- [x] T012 [P] [US1] Integration test for saveLogEntry() flow in frontend/src/services/__tests__/logModeService.test.ts

### Implementation for User Story 1

- [x] T013 [US1] Implement detectTrigger() method with longest-match-first strategy in frontend/src/services/logModeService.ts
- [x] T014 [US1] Implement findMappingForApp() method with case-insensitive matching in frontend/src/services/logModeService.ts
- [x] T015 [US1] Implement formatLogEntry() with timestamp formatting in frontend/src/services/logModeService.ts
- [x] T016 [US1] Implement saveLogEntry() orchestration method in frontend/src/services/logModeService.ts
- [x] T017 [US1] Add trigger detection branch in useDictation hook after Whisper transcription in frontend/src/hooks/useDictation.ts
- [x] T018 [US1] Add handleLogMode() function to process Log Mode flow in frontend/src/hooks/useDictation.ts
- [x] T019 [US1] Implement clipboard fallback with error notification in frontend/src/services/logModeService.ts
- [x] T020 [US1] Add success feedback (sound + visual) for log saved in frontend/src/hooks/useDictation.ts

**Checkpoint**: User Story 1 complete - basic voice logging works with pre-configured mappings

---

## Phase 4: User Story 2 - First-Time App Configuration (Priority: P2)

**Goal**: When user triggers Log Mode in an unmapped app, a configuration prompt appears

**Independent Test**: Trigger Log Mode in Slack (unmapped), verify prompt appears, configure path, verify log saved

### Tests for User Story 2

- [x] T021 [P] [US2] Unit test for ConfigPrompt component rendering in frontend/src/components/__tests__/ConfigPrompt.test.tsx
- [x] T022 [P] [US2] Unit test for onConfirm saves mapping and logs entry in frontend/src/components/__tests__/ConfigPrompt.test.tsx
- [x] T023 [P] [US2] Unit test for onCancel copies to clipboard in frontend/src/components/__tests__/ConfigPrompt.test.tsx

### Implementation for User Story 2

- [x] T024 [US2] Create ConfigPrompt component structure in frontend/src/components/ConfigPrompt.tsx
- [x] T025 [US2] Add file path input with validation in frontend/src/components/ConfigPrompt.tsx
- [x] T026 [US2] Add confirm/cancel buttons with handlers in frontend/src/components/ConfigPrompt.tsx
- [x] T027 [US2] Add addAppMapping() method to LogModeService in frontend/src/services/logModeService.ts
- [x] T028 [US2] Integrate ConfigPrompt into Log Mode flow when mapping not found in frontend/src/hooks/useDictation.ts
- [x] T029 [US2] Style ConfigPrompt with TailwindCSS (dark/light theme) in frontend/src/components/ConfigPrompt.tsx

**Checkpoint**: User Story 2 complete - first-time configuration works for unmapped apps

---

## Phase 5: User Story 3 - Customizing Trigger Phrases (Priority: P3)

**Goal**: User can add/edit/remove trigger phrases in Settings

**Independent Test**: Add "Remember" as trigger in Settings, speak "Remember buy milk", verify Log Mode activates

### Tests for User Story 3

- [ ] T030 [P] [US3] Unit test for TriggerPhraseList component in frontend/src/components/settings/__tests__/TriggerPhraseList.test.tsx
- [ ] T031 [P] [US3] Unit test for add/edit/delete operations in frontend/src/components/settings/__tests__/TriggerPhraseList.test.tsx

### Implementation for User Story 3

- [x] T032 [US3] Create TriggerPhraseList component structure in frontend/src/components/settings/TriggerPhraseList.tsx
- [x] T033 [US3] Add phrase list display with enable/disable toggles in frontend/src/components/settings/TriggerPhraseList.tsx
- [x] T034 [US3] Add "Add Phrase" form with validation in frontend/src/components/settings/TriggerPhraseList.tsx
- [x] T035 [US3] Add edit/delete actions for each phrase in frontend/src/components/settings/TriggerPhraseList.tsx
- [x] T036 [US3] Add addTriggerPhrase() method to LogModeService in frontend/src/services/logModeService.ts
- [x] T037 [US3] Add updateTriggerPhrase() method to LogModeService in frontend/src/services/logModeService.ts
- [x] T038 [US3] Add deleteTriggerPhrase() method to LogModeService in frontend/src/services/logModeService.ts

**Checkpoint**: User Story 3 complete - trigger phrase customization works

---

## Phase 6: User Story 4 - Managing App-to-File Mappings (Priority: P3)

**Goal**: User can view/edit/delete app mappings in Settings

**Independent Test**: Open Settings, edit VS Code mapping to new file path, verify future logs use new path

### Tests for User Story 4

- [ ] T039 [P] [US4] Unit test for AppMappingList component in frontend/src/components/settings/__tests__/AppMappingList.test.tsx
- [ ] T040 [P] [US4] Unit test for CRUD operations in frontend/src/components/settings/__tests__/AppMappingList.test.tsx

### Implementation for User Story 4

- [x] T041 [US4] Create AppMappingList component structure in frontend/src/components/settings/AppMappingList.tsx
- [x] T042 [US4] Add mapping table display (App Name | File Path | Actions) in frontend/src/components/settings/AppMappingList.tsx
- [x] T043 [US4] Add edit modal for file path in frontend/src/components/settings/AppMappingList.tsx
- [x] T044 [US4] Add delete confirmation and action in frontend/src/components/settings/AppMappingList.tsx
- [x] T045 [US4] Add updateAppMapping() method to LogModeService in frontend/src/services/logModeService.ts
- [x] T046 [US4] Add deleteAppMapping() method to LogModeService in frontend/src/services/logModeService.ts

**Checkpoint**: User Story 4 complete - app mapping management works

---

## Phase 7: Settings Integration (Combines US3 + US4)

**Goal**: Log Mode tab in Settings window with all management UI

### Implementation

- [x] T047 Create LogModeSettings component combining TriggerPhraseList and AppMappingList in frontend/src/components/settings/LogModeSettings.tsx
- [x] T048 Add master enable/disable toggle for Log Mode in frontend/src/components/settings/LogModeSettings.tsx
- [x] T049 Add "Log Mode" tab to SettingsWindow navigation in frontend/src/components/SettingsWindow.tsx
- [x] T050 Wire LogModeSettings to SettingsWindow tab system in frontend/src/components/SettingsWindow.tsx

**Checkpoint**: All Settings UI integrated into main Settings window

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T051 [P] Add retry logic (500ms) for locked files in frontend/src/services/logModeService.ts
- [x] T052 [P] Add empty content validation (FR-013) in frontend/src/services/logModeService.ts
- [x] T053 [P] Add error logging for debugging in frontend/src/services/logModeService.ts
- [ ] T054 Run quickstart.md validation - full end-to-end test
- [ ] T055 Code cleanup and remove any console.log statements

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 must complete before US2 (US2 depends on Log Mode flow)
  - US3 and US4 can run in parallel after US1
- **Settings Integration (Phase 7)**: Depends on US3 + US4 completion
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Foundation only - Core MVP
- **User Story 2 (P2)**: Depends on US1 (adds to existing Log Mode flow)
- **User Story 3 (P3)**: Foundation only - Parallel with US4
- **User Story 4 (P3)**: Foundation only - Parallel with US3

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Service methods before hook integration
- Core implementation before UI
- Story complete before moving to next priority

### Parallel Opportunities

- T001, T002, T003 can run in parallel (different files)
- All test tasks within a phase marked [P] can run in parallel
- US3 and US4 can run in parallel after US1 completion
- All Polish tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "T009 Unit test for detectTrigger()"
Task: "T010 Unit test for findMappingForApp()"
Task: "T011 Unit test for formatLogEntry()"
Task: "T012 Integration test for saveLogEntry()"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test with hardcoded mapping in code
5. Deploy/demo if ready - basic Log Mode works!

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy (MVP!)
3. Add User Story 2 → First-time config works → Deploy
4. Add User Stories 3 + 4 → Full Settings UI → Deploy
5. Polish → Production ready

### Suggested MVP Scope

For fastest time-to-value, implement only:
- Phase 1: Setup
- Phase 2: Foundational
- Phase 3: User Story 1

This delivers a working Log Mode with manual config (edit settings.json). Users can start capturing thoughts immediately.

---

## Task Summary

| Phase | Task Count | Description |
|-------|------------|-------------|
| Phase 1: Setup | 4 | Types + Tauri commands |
| Phase 2: Foundational | 4 | LogModeService core |
| Phase 3: US1 (P1) | 12 | Basic voice logging |
| Phase 4: US2 (P2) | 9 | First-time config |
| Phase 5: US3 (P3) | 9 | Trigger customization |
| Phase 6: US4 (P3) | 8 | Mapping management |
| Phase 7: Integration | 4 | Settings tab |
| Phase 8: Polish | 5 | Quality + cleanup |
| **Total** | **55** | |

### Tasks per User Story

- US1: 12 tasks (includes 4 tests)
- US2: 9 tasks (includes 3 tests)
- US3: 9 tasks (includes 2 tests)
- US4: 8 tasks (includes 2 tests)

### Parallel Opportunities

- 6 tasks in Setup can run in parallel
- 11 test tasks can run in parallel (within their phases)
- US3 and US4 (17 tasks) can run in parallel

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently testable
- TDD: Write tests first, verify they fail, then implement
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
