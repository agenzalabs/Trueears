# Research: Context-Aware Log Mode

**Feature**: 004-context-log
**Date**: 2025-12-28
**Status**: Complete

## Research Questions Resolved

### 1. Trigger Phrase Detection Architecture

**Decision**: Detect trigger phrases **after Whisper transcription, before LLM post-processing** in the dictation flow.

**Rationale**:
- The raw transcription from Whisper is the cleanest source for trigger phrase matching
- Avoids dependency on LLM formatting which could alter the trigger phrase
- Allows early exit from the normal dictation pipeline
- Simple string prefix matching is sufficient (no NLP required)

**Alternatives Considered**:
- **During LLM post-processing**: Rejected - Adds complexity and coupling
- **Before transcription (audio-level)**: Rejected - Not feasible without advanced voice recognition
- **After paste (content analysis)**: Rejected - Too late, would require undo/rollback

**Injection Point**: `frontend/src/hooks/useDictation.ts` at line ~91-94, after `rawText` is received from Whisper but before `postProcessTranscription()` is called.

---

### 2. Settings Storage Pattern

**Decision**: Use existing **Tauri Store** pattern with key `Trueears_LOG_MODE_CONFIG`.

**Rationale**:
- Consistent with App Profiles storage pattern
- Cross-window sync already implemented via `settings-changed` event
- Secure storage on disk (not localStorage)
- Already has migration pattern if needed

**Storage Structure**:
```typescript
interface LogModeConfig {
  enabled: boolean;
  triggerPhrases: TriggerPhrase[];
  appMappings: AppLogMapping[];
}

interface TriggerPhrase {
  id: string;
  phrase: string;      // e.g., "Log", "Note to self"
  enabled: boolean;
}

interface AppLogMapping {
  id: string;
  appIdentifier: string;    // e.g., "Code.exe", "chrome.exe"
  appDisplayName: string;   // e.g., "VS Code", "Chrome"
  logFilePath: string;      // e.g., "C:\Notes\dev-log.md"
  createdAt: string;        // ISO date
}
```

**Alternatives Considered**:
- **Separate JSON file**: Rejected - Fragmentation of settings storage
- **SQLite database**: Rejected - Overkill for simple key-value mappings
- **localStorage**: Rejected - Not secure, doesn't sync across windows

---

### 3. File Write Implementation

**Decision**: Add new Tauri command `append_to_file` in backend with path validation.

**Rationale**:
- No existing file write capability in Trueears backend
- Rust's `std::fs` is sufficient, no external crates needed
- Must be async to avoid blocking the main thread
- Path validation required for security (prevent directory traversal)

**Implementation**:
```rust
#[tauri::command]
async fn append_to_file(path: String, content: String) -> Result<(), String> {
    // 1. Validate path (no ../, must be absolute, must be .md/.txt)
    // 2. Create parent directories if needed
    // 3. Open file in append mode (create if not exists)
    // 4. Write content with newline
    // 5. Return success or error message
}
```

**Security Considerations**:
- Reject relative paths (must be absolute)
- Reject paths containing `..`
- Whitelist file extensions (.md, .txt, .log)
- Log file writes for audit purposes

**Alternatives Considered**:
- **Use clipboard only**: Rejected - Loses the "silent capture" value proposition
- **Use Tauri FS plugin**: Considered - Could work but adds dependency; custom command is simpler
- **Write via frontend/Node**: Not applicable - Tauri frontend has no Node.js

---

### 4. Active Window Detection Reuse

**Decision**: Reuse existing `get_active_window_info` Tauri command.

**Rationale**:
- Already captures `app_name`, `window_title`, `executable_path`
- Already integrated into dictation flow
- Windows implementation is complete and tested
- Active window info is available at `startDictation()` time

**Implementation**:
- Log Mode will receive the same `ActiveWindowInfo` used for App Profiles
- App identifier matching: Use `executable_path` or `app_name` for consistency
- Allow "Default" mapping for apps without specific configuration

**Gap Identified**:
- macOS/Linux: Window detection is stubbed (returns "Unknown")
- This is an existing limitation, not specific to Log Mode
- Log Mode will work on macOS/Linux but without context-aware file routing

---

### 5. Settings UI Pattern

**Decision**: Add "Log Mode" tab to Settings window following App Profiles pattern.

**Rationale**:
- Consistent with existing UI patterns
- Users are already familiar with App Profiles UI
- Tab-based navigation is established
- Can reuse component patterns (list, form, toggles)

**Component Structure**:
```
frontend/src/components/settings/
├── LogModeSettings.tsx          # Main tab component
├── TriggerPhraseList.tsx        # Trigger phrase management
├── AppMappingList.tsx           # App-to-file mapping management
└── LogModeSettingsTypes.ts      # Type definitions
```

**UI Elements**:
1. **Enable/Disable Toggle**: Master switch for Log Mode
2. **Trigger Phrases Section**:
   - List of phrases with enable/disable toggles
   - Add/Edit/Delete actions
   - Default phrases pre-populated
3. **App Mappings Section**:
   - Table: App Name | File Path | Actions
   - Add button opens modal/form
   - File picker for path selection (Tauri dialog)
   - Delete confirmation

**Alternatives Considered**:
- **Inline settings in main window**: Rejected - Too complex, breaks pattern
- **Separate Log Mode window**: Rejected - Overkill, inconsistent

---

### 6. Timestamp Format

**Decision**: Use `YYYY-MM-DD HH:MM` format in user's local timezone.

**Rationale**:
- ISO-like format is sortable and unambiguous
- Matches spec requirement exactly
- Local timezone is more intuitive for personal notes
- Minute precision is sufficient (no need for seconds)

**Implementation**:
```typescript
const timestamp = new Date().toLocaleString('sv-SE', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
}).replace(' ', ' '); // "2025-12-28 14:30"
```

---

### 7. Error Handling Strategy

**Decision**: Clipboard fallback with user notification on any file write failure.

**Rationale**:
- Matches spec requirement FR-012 and SC-005 (zero data loss)
- Users can manually paste if file write fails
- Notification explains what happened and why
- Retry logic (500ms) for transient failures (locked files)

**Error Flow**:
1. Attempt file append
2. If fails, wait 500ms and retry once
3. If still fails:
   - Copy content to clipboard
   - Show error notification with reason
   - Log error for debugging

**Error Types to Handle**:
- File locked by another process
- Permission denied
- Disk full
- Invalid path
- Network drive offline

---

### 8. Audio/Visual Feedback

**Decision**: Reuse existing feedback system with distinct "log saved" indication.

**Rationale**:
- Existing sound/visual feedback infrastructure exists
- Consistent user experience across features
- Distinguishes Log Mode from normal dictation

**Implementation**:
- **Sound**: Use different tone or existing "success" sound
- **Visual**: Flash checkmark on overlay (different color/animation than paste)
- **Overlay text**: Brief "Logged to [filename]" message

---

## Technology Decisions Summary

| Area | Decision | Confidence |
|------|----------|------------|
| Trigger Detection | After Whisper, before LLM | High |
| Settings Storage | Tauri Store, single config key | High |
| File Write | New Tauri command with validation | High |
| Window Detection | Reuse existing infrastructure | High |
| UI Pattern | New tab in Settings | High |
| Timestamp | YYYY-MM-DD HH:MM local | High |
| Error Handling | Clipboard fallback + notification | High |
| Feedback | Reuse existing with log-specific variant | Medium |

## Dependencies Identified

1. **Tauri Dialog Plugin**: May be needed for file picker (check if already included)
2. **Tauri Store Plugin**: Already in use, no changes needed
3. **Overlay Component**: Needs minor extension for log feedback

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| File write permission errors | User loses content | Clipboard fallback (implemented) |
| Trigger phrase false positives | Wrong mode activated | Only match at START of text |
| Large log files (performance) | Slow append | Append mode is O(1), no read required |
| macOS/Linux window detection | No context awareness | Fall back to "Default" mapping |
