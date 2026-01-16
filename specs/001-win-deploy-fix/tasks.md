# Tasks: Windows Deployment Dependencies Fix

**Input**: Design documents from `/specs/001-win-deploy-fix/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are MANUAL acceptance tests as this feature involves build configuration changes that are difficult to unit test.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create backend/.cargo directory if not exists
- [x] T002 Verify backend/tauri.conf.json exists

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

*No foundational tasks required for this configuration-only feature.*

---

## Phase 3: User Story 1 - Seamless Windows Installation (Priority: P1) 🎯 MVP

**Goal**: Windows users can install and run the application on fresh Windows systems without manual dependency installation.

**Independent Test**: Install the application on a clean Windows Sandbox instance with no pre-installed runtimes.

### Implementation for User Story 1

- [x] T003 [P] [US1] Create or update backend/.cargo/config.toml to enable static CRT linking
- [x] T004 [P] [US1] Update backend/tauri.conf.json to set webviewInstallMode to embedBootstrapper
- [x] T005 [US1] Document manual verification steps in quickstart.md (already created, verify content)

**Checkpoint**: At this point, the Windows build configuration is complete and ready for manual verification.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T006 Verify build succeeds with `npm run tauri build` (on Windows machine or CI)
- [ ] T007 Run manual verification steps from quickstart.md on Windows Sandbox

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **User Stories (Phase 3)**: Depends on Setup completion
- **Polish (Final Phase)**: Depends on User Story 1 completion

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Setup (Phase 1)

### Within Each User Story

- Configuration files can be updated in parallel (T003 and T004)

### Parallel Opportunities

- T003 (`.cargo/config.toml`) and T004 (`tauri.conf.json`) edit different files and can be done in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 3: User Story 1 (Apply configs)
3. **STOP and VALIDATE**: Build and test on Windows Sandbox
4. Deploy if ready
