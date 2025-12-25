# Tasks: Cancel Recording

**Input**: Design documents from `/specs/001-cancel-recording/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, quickstart.md ✓

**Tests**: Required per Constitution Principle II (Test-First is NON-NEGOTIABLE)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `frontend/src/` (Tauri + React desktop app)
- **Tests**: `frontend/tests/`

---

## Phase 1: Setup

**Purpose**: No new project setup needed - modifying existing codebase

- [ ] T001 Create feature branch `001-cancel-recording` from dev (if not already on it)
- [ ] T002 Verify development environment with `cd frontend && npm run dev`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before user stories

**⚠️ CRITICAL**: These changes enable both user stories

### Tests for Foundational Layer

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T003 [P] Unit test for `cancelRecording()` method in `frontend/tests/unit/useAudioRecorder.test.ts`
- [ ] T004 [P] Unit test for `cancelDictation()` method in `frontend/tests/unit/useDictation.test.ts`

### Implementation for Foundational Layer

- [ ] T005 [P] Add `cancelRecording()` method to `frontend/src/hooks/useAudioRecorder.ts` that stops MediaRecorder, stops MediaStream tracks, clears audioChunksRef, and returns void (no Blob)
- [ ] T006 Extend `DictationStatus` type with `'cancelled'` in `frontend/src/hooks/useDictation.ts`
- [ ] T007 Add `cancelDictation()` method to `frontend/src/hooks/useDictation.ts` that calls `cancelRecording()`, sets status to `'cancelled'`, and uses ref-based debounce flag

**Checkpoint**: Foundation ready - `cancelRecording()` and `cancelDictation()` implemented and tested

---

## Phase 3: User Story 1 - Cancel Recording via Escape Key (Priority: P1) 🎯 MVP

**Goal**: User presses Escape during recording to immediately discard audio without transcription

**Independent Test**: Start recording, press Escape, verify no transcription occurs and status shows cancelled

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T008 [US1] Integration test for Escape key cancellation behavior in `frontend/tests/integration/cancel-recording.test.ts`

### Implementation for User Story 1

- [ ] T009 [US1] Update Escape key handler in `frontend/src/components/RecorderOverlay.tsx` to call `handleCancelRecording()` instead of `handleStopRecording()` when `recordingStatus === 'recording'`
- [ ] T010 [US1] Add `handleCancelRecording()` function to RecorderOverlay that calls `cancelDictation()` from useDictation hook
- [ ] T011 [US1] Verify cancellation works in all recording modes (Auto, Toggle, Push-to-Talk) - manual testing per quickstart.md

**Checkpoint**: User Story 1 complete - Escape key discards recording without transcription

---

## Phase 4: User Story 2 - Cancelled Status Feedback (Priority: P2)

**Goal**: User receives distinct visual (amber X) and audio (cancel sound) feedback after cancellation

**Independent Test**: Cancel a recording, observe amber X indicator and distinct cancel sound plays

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T012 [P] [US2] Unit test for `playCancelSound()` in `frontend/tests/unit/soundUtils.test.ts`
- [ ] T013 [P] [US2] Unit test for cancelled status display in `frontend/tests/unit/StatusIndicator.test.ts`

### Implementation for User Story 2

- [ ] T014 [P] [US2] Add `playCancelSound()` function to `frontend/src/utils/soundUtils.ts` using Web Audio API (440Hz triangle wave, 0.3s duration)
- [ ] T015 [P] [US2] Add cancelled status case to `frontend/src/components/StatusIndicator.tsx` with amber X icon (`text-amber-400`, X mark icon)
- [ ] T016 [US2] Call `playCancelSound()` in `cancelDictation()` method in `frontend/src/hooks/useDictation.ts`
- [ ] T017 [US2] Verify cancelled status auto-transitions to idle after display duration (matches success/error timing)

**Checkpoint**: User Story 2 complete - amber X indicator shows and cancel sound plays

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [ ] T018 Run full test suite with `cd frontend && npm run test`
- [ ] T019 Verify memory release on cancel - no audio data retained (per SC-005)
- [ ] T020 Run quickstart.md validation checklist manually
- [ ] T021 Verify cancel response time <100ms (per SC-001)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on Foundational completion, can run in parallel with US1
- **Polish (Phase 5)**: Depends on all user stories complete

### User Story Dependencies

- **User Story 1 (P1)**: Requires T005, T006, T007 from Foundational
- **User Story 2 (P2)**: Requires T006, T007 from Foundational - independent of US1

### Within Each Phase

- Tests MUST be written and FAIL before implementation
- Hook changes before component changes
- Core implementation before integration

### Parallel Opportunities

- T003, T004 can run in parallel (different test files)
- T005 can run in parallel with T006 (different hooks, no conflict)
- T012, T013 can run in parallel (different test files)
- T014, T015 can run in parallel (different source files)
- US1 and US2 implementation phases can run in parallel after Foundational completes

---

## Parallel Example: Foundational Tests

```bash
# Launch all foundational tests together:
Task: "Unit test for cancelRecording() in frontend/tests/unit/useAudioRecorder.test.ts"
Task: "Unit test for cancelDictation() in frontend/tests/unit/useDictation.test.ts"
```

## Parallel Example: User Story 2 Implementation

```bash
# Launch all US2 independent tasks together:
Task: "Add playCancelSound() function to frontend/src/utils/soundUtils.ts"
Task: "Add cancelled status case to frontend/src/components/StatusIndicator.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test Escape key cancellation works
5. Deploy/demo if ready (core cancel functionality works)

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → MVP ready (cancel works)
3. Add User Story 2 → Test independently → Full feature (feedback works)
4. Each story adds value without breaking previous stories

---

## Summary

| Metric | Value |
|--------|-------|
| Total Tasks | 21 |
| Setup Tasks | 2 |
| Foundational Tasks | 5 |
| User Story 1 Tasks | 4 |
| User Story 2 Tasks | 6 |
| Polish Tasks | 4 |
| Parallel Opportunities | 8 tasks can run in parallel |
| Files Modified | 5 |
| Test Files Created | 4 |

---

## Notes

- [P] tasks = different files, no dependencies
- [US1]/[US2] labels map tasks to specific user stories
- Each user story is independently completable and testable
- Verify tests fail before implementing (TDD per Constitution Principle II)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
