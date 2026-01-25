# Feature Specification: Context-Aware Log Mode

**Feature Branch**: `004-context-log`
**Created**: 2025-12-28
**Status**: Draft
**Input**: User description: "Context-Aware Log Mode - Voice-triggered logging that saves transcriptions to app-specific files"

## Overview

Context-Aware Log Mode enables users to capture thoughts and notes via voice without interrupting their current workflow. When a user speaks a customizable trigger phrase (e.g., "Log...", "Note to self..."), Trueears detects the active application, determines the mapped destination file, and silently appends the tranTrueearsd text in Markdown format. This feature transforms Trueears from a "typing replacement" into a "thought capture engine."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Basic Voice Logging (Priority: P1)

As a developer deep in a coding session, I want to capture a quick thought without leaving my IDE, so that I don't lose focus or forget important ideas.

**Why this priority**: This is the core value proposition. If a user can speak a trigger phrase and have text saved to a file, the feature delivers value.

**Independent Test**: Can be fully tested by speaking a trigger phrase in any application with a configured file mapping and verifying the text appears in the destination file.

**Acceptance Scenarios**:

1. **Given** the user is in VS Code with a file mapping configured (VS Code → `dev-notes.md`), **When** the user says "Log check the Redis timeout issue", **Then** Trueears appends `- [2025-12-28 14:30] check the Redis timeout issue` to `dev-notes.md` and provides sound + visual confirmation.

2. **Given** the user is in any application with a configured mapping, **When** the user speaks a trigger phrase followed by their note, **Then** the trigger phrase is stripped and only the note content is saved.

3. **Given** the destination file does not exist, **When** the user triggers a log, **Then** Trueears creates the file and appends the entry.

---

### User Story 2 - First-Time App Configuration (Priority: P2)

As a user who triggers Log Mode in an unmapped application, I want to be prompted to configure a destination file, so that I can set up my workflow once and use it seamlessly afterward.

**Why this priority**: Without this, users would lose their dictation when no mapping exists. This ensures graceful handling of unconfigured apps.

**Independent Test**: Can be fully tested by triggering Log Mode in an app with no existing mapping and verifying a configuration prompt appears.

**Acceptance Scenarios**:

1. **Given** the user is in Slack (no mapping configured), **When** the user says "Log remember to follow up with client", **Then** Trueears displays a configuration prompt asking for the destination file path for Slack.

2. **Given** the configuration prompt is displayed, **When** the user provides a file path (e.g., `C:\Notes\slack-notes.md`), **Then** Trueears saves this mapping and appends the current log entry to that file.

3. **Given** the configuration prompt is displayed, **When** the user cancels the prompt, **Then** Trueears copies the transcription to the clipboard as a fallback and notifies the user.

---

### User Story 3 - Customizing Trigger Phrases (Priority: P3)

As a power user, I want to customize which voice phrases trigger Log Mode, so that I can use natural language that fits my workflow.

**Why this priority**: The feature works with default triggers. Customization enhances usability but is not required for core functionality.

**Independent Test**: Can be fully tested by adding a custom trigger phrase in Settings and verifying it activates Log Mode.

**Acceptance Scenarios**:

1. **Given** the user opens Settings → Log Mode → Trigger Phrases, **When** the user adds "Remember..." as a new trigger, **Then** saying "Remember buy milk" activates Log Mode.

2. **Given** multiple trigger phrases are configured, **When** the user speaks any of them, **Then** Log Mode activates with the matched phrase stripped from the output.

3. **Given** a trigger phrase is removed from Settings, **When** the user speaks that phrase, **Then** Log Mode does NOT activate (normal dictation behavior).

---

### User Story 4 - Managing App-to-File Mappings (Priority: P3)

As a user, I want to view and edit my app-to-file mappings in Settings, so that I can organize my notes by context.

**Why this priority**: Users can configure mappings on first use (P2). A dedicated management UI is a quality-of-life improvement.

**Independent Test**: Can be fully tested by opening Settings, modifying a mapping, and verifying the change takes effect.

**Acceptance Scenarios**:

1. **Given** the user opens Settings → Log Mode → App Mappings, **When** viewing the list, **Then** all configured mappings are displayed (App Name → File Path).

2. **Given** a mapping exists, **When** the user edits the file path, **Then** future logs from that app go to the new path.

3. **Given** a mapping exists, **When** the user deletes the mapping, **Then** the next log from that app triggers the first-time configuration prompt.

---

### Edge Cases

- **What happens when the destination file is locked by another application?**
  - Trueears retries once after 500ms. If still locked, copies to clipboard and notifies user.

- **What happens when the destination path is invalid or inaccessible (e.g., network drive offline)?**
  - Trueears copies to clipboard and displays an error notification with the issue.

- **What happens when the user speaks only the trigger phrase with no content (e.g., just "Log")?**
  - Trueears ignores the command and does not create an empty entry.

- **What happens when the trigger phrase is spoken mid-sentence (e.g., "I need to log this bug")?**
  - Trueears only activates if the trigger phrase is at the START of the dictation.

- **What happens when multiple apps share the same file mapping?**
  - This is allowed. Entries from both apps append to the same file.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST detect customizable trigger phrases at the start of a dictation to activate Log Mode.
- **FR-002**: System MUST strip the trigger phrase from the output before saving.
- **FR-003**: System MUST determine the active application when Log Mode is triggered.
- **FR-004**: System MUST look up the destination file path based on the active application.
- **FR-005**: System MUST append the tranTrueearsd text to the destination file in Markdown bullet format with timestamp: `- [YYYY-MM-DD HH:MM] <text>`.
- **FR-006**: System MUST create the destination file if it does not exist.
- **FR-007**: System MUST provide audio and visual confirmation when a log entry is saved successfully.
- **FR-008**: System MUST prompt the user to configure a file mapping when Log Mode is triggered in an unmapped application.
- **FR-009**: System MUST persist app-to-file mappings across sessions.
- **FR-010**: System MUST allow users to add, edit, and remove trigger phrases in Settings.
- **FR-011**: System MUST allow users to view, edit, and delete app-to-file mappings in Settings.
- **FR-012**: System MUST fall back to copying to clipboard if file write fails, with user notification.
- **FR-013**: System MUST NOT create empty log entries (trigger phrase only, no content).

### Key Entities

- **Trigger Phrase**: A user-configurable phrase (e.g., "Log", "Note to self") that activates Log Mode. Attributes: phrase text, enabled/disabled status.
- **App Mapping**: A relationship between an application identifier (exe name or app name) and a destination file path. Attributes: app identifier, file path, created date.
- **Log Entry**: A single captured note. Attributes: timestamp, content text, source app, destination file.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can capture a thought and have it saved to a file within 3 seconds of finishing speaking.
- **SC-002**: 95% of log attempts with valid mappings result in successful file writes.
- **SC-003**: Users can configure a new app mapping in under 10 seconds via the first-time prompt.
- **SC-004**: Users can manage (view/edit/delete) all their mappings and triggers from a single Settings screen.
- **SC-005**: Zero data loss: if file write fails, content is preserved in clipboard 100% of the time.

## Assumptions

- Users have write access to the file paths they configure.
- The timestamp format (`YYYY-MM-DD HH:MM`) uses the user's local timezone.
- Default trigger phrases ship with the app: "Log", "Note to self", "Remember" (all customizable).
- The active window detection logic already exists in Trueears (reuse from App Profiles feature).
- Sound and visual feedback mechanisms already exist in Trueears (reuse from current dictation flow).

## Out of Scope

- Syncing log files to cloud services (Dropbox, Google Drive) - handled by user's existing sync setup.
- Rich text formatting (bold, links) - plain Markdown only.
- Log file organization/rotation - users manage their own files.
- Reading back previous logs via voice - this is a write-only feature.
- Integration with specific note-taking apps (Notion API, Obsidian plugins) - file-based only.
