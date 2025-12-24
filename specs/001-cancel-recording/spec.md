# Feature Specification: Cancel Recording

**Feature Branch**: `001-cancel-recording`
**Created**: 2025-12-24
**Status**: Draft
**Input**: User description: "Add cancel recording functionality - Escape key discards audio without transcription, shows cancelled status"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cancel Recording via Escape Key (Priority: P1)

A user starts recording audio for dictation but changes their mind mid-recording. They want to quickly discard the recording without triggering transcription or pasting any text. By pressing the Escape key during recording, the audio is immediately discarded, no API calls are made, and the overlay shows a brief "cancelled" indicator before returning to idle state.

**Why this priority**: This is the core functionality requested. Users need a quick, keyboard-accessible way to abort a recording without consequences. Without this, users are forced to wait for transcription of unwanted audio or find workarounds.

**Independent Test**: Can be fully tested by starting a recording, pressing Escape, and verifying no transcription occurs and the overlay shows cancelled status before returning to idle.

**Acceptance Scenarios**:

1. **Given** the user is actively recording audio, **When** the user presses the Escape key, **Then** recording stops immediately without transcription, audio data is discarded, and the overlay displays a cancelled status indicator.

2. **Given** the user is actively recording audio in any recording mode (Auto, Toggle, or Push-to-Talk), **When** the user presses the Escape key, **Then** the cancellation behavior is consistent across all modes.

3. **Given** the user has cancelled a recording, **When** the cancelled status is displayed, **Then** the overlay automatically transitions to idle state after a brief visual confirmation (same duration as success/error indicators).

4. **Given** the user is actively recording, **When** the user presses Escape, **Then** no network requests are made to transcription or LLM services.

---

### User Story 2 - Cancelled Status Feedback (Priority: P2)

After cancelling a recording, the user receives clear visual and audio feedback that their action was successful. The overlay displays a distinct "cancelled" indicator (different from success and error states) and plays a unique cancellation sound, so the user understands the recording was intentionally discarded rather than failed.

**Why this priority**: Multi-modal feedback (visual + audio) confirms the user's intent was recognized. Without distinct cancelled feedback, users might confuse cancellation with an error, leading to confusion about what happened.

**Independent Test**: Can be fully tested by cancelling a recording and observing the status indicator displays a cancelled state visually distinct from success (green checkmark) and error (red X) states, and a distinct cancellation sound plays.

**Acceptance Scenarios**:

1. **Given** the user has just cancelled a recording, **When** the cancelled status is displayed, **Then** the indicator is visually distinct from success (green) and error (red) states.

2. **Given** the cancelled status is displayed, **When** the display duration completes, **Then** the overlay returns to idle/hidden state following the same pattern as success/error states.

3. **Given** the user has just cancelled a recording, **When** cancellation occurs, **Then** a distinct cancellation sound plays that is different from the success sound.

---

### Edge Cases

- What happens if user presses Escape multiple times rapidly during recording?
  - System should handle gracefully, cancelling once and ignoring subsequent presses.

- What happens if user presses Escape while in processing state (after recording stopped but before transcription completes)?
  - System should cancel the pending transcription request if possible, or wait for completion since the recording phase is already finished.

- What happens if user presses Escape when not recording (overlay visible but idle)?
  - Overlay should hide/close as per existing behavior.

- What happens if recording is very short (< 0.5 seconds) and user cancels?
  - System should still respect cancellation and discard the minimal audio data.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST stop audio recording immediately when user presses Escape key during active recording.
- **FR-002**: System MUST discard all captured audio data when recording is cancelled (no persistence, no transmission).
- **FR-003**: System MUST NOT make any network requests (transcription API, LLM API) when recording is cancelled.
- **FR-004**: System MUST display a cancelled status indicator after successful cancellation.
- **FR-005**: System MUST transition from cancelled status to idle state after a brief display duration.
- **FR-006**: System MUST support cancellation in all recording modes (Auto, Toggle, Push-to-Talk).
- **FR-007**: System MUST handle rapid repeated Escape key presses gracefully (debounce or ignore after first cancellation).
- **FR-008**: Cancelled status indicator MUST be visually distinct from success and error indicators.
- **FR-009**: System MUST play a distinct cancellation sound when recording is cancelled, different from the success sound.

### Key Entities

- **DictationStatus**: Current state of the dictation flow. Extended to include 'cancelled' as a valid status alongside existing states (idle, recording, processing, success, error).

- **AudioBuffer**: Temporary storage for recorded audio data. Must be cleared/discarded on cancellation without being processed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can cancel a recording within 100ms of pressing Escape (matching existing UI responsiveness requirements).
- **SC-002**: 100% of cancelled recordings result in zero transcription API calls.
- **SC-003**: Cancelled status indicator displays for the same duration as success/error indicators (consistent UX timing).
- **SC-004**: Users can distinguish cancelled state from error state in usability testing (visual differentiation is clear).
- **SC-005**: Memory used by cancelled recording audio is released immediately upon cancellation (no memory leaks from discarded audio).

## Assumptions

- Escape key is not conflicting with other system-wide shortcuts that would prevent capture.
- The existing overlay keyboard event handling infrastructure can be extended to differentiate between cancel and stop actions.
- The cancelled status uses a distinct color scheme (recommended: amber/yellow) to differentiate from success (green) and error (red).
- Cancellation display duration matches the existing success/error display duration for consistency.
