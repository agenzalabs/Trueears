# Quickstart Guide: Context-Aware Log Mode

**Feature**: 004-context-log
**Date**: 2025-12-28

This guide provides step-by-step instructions for implementing the Context-Aware Log Mode feature.

---

## Prerequisites

Before starting implementation, ensure:

1. ✅ Feature spec reviewed: `specs/004-context-log/spec.md`
2. ✅ Research completed: `specs/004-context-log/research.md`
3. ✅ Data model understood: `specs/004-context-log/data-model.md`
4. ✅ Contracts reviewed: `specs/004-context-log/contracts/`
5. ✅ Branch checked out: `004-context-log`

---

## Implementation Order

Follow this order to ensure testable increments:

### Phase 1: Backend Foundation (P1 - Core)

**Goal**: Enable file append capability from Rust backend.

1. **Add `append_to_file` Tauri command** (`backend/src/lib.rs`)
   - Implement path validation
   - Implement file append logic
   - Add error handling

2. **Add `validate_log_path` command** (`backend/src/lib.rs`)
   - Path format validation
   - Permission checking

**Test**: Call commands from frontend dev tools, verify file creation/append.

---

### Phase 2: Settings Storage (P1 - Core)

**Goal**: Persist Log Mode configuration.

1. **Create type definitions** (`frontend/src/types/logMode.ts`)
   - Copy interfaces from `contracts/typescript-interfaces.ts`

2. **Create LogModeService** (`frontend/src/services/logModeService.ts`)
   - `getConfig()` / `saveConfig()`
   - Default config initialization
   - Settings change event handling

**Test**: Read/write config via service, verify persistence across app restart.

---

### Phase 3: Trigger Detection (P1 - Core)

**Goal**: Detect trigger phrases in transcriptions.

1. **Add detection logic** (`frontend/src/services/logModeService.ts`)
   - `detectTrigger(text)` method
   - Case-insensitive matching
   - Longest-match-first strategy

2. **Integrate into dictation flow** (`frontend/src/hooks/useDictation.ts`)
   - After Whisper transcription
   - Before LLM post-processing
   - Branch to Log Mode flow if trigger detected

**Test**: Speak "Log test message", verify trigger detection (log to console initially).

---

### Phase 4: File Writing Flow (P1 - Core)

**Goal**: Complete the log entry save flow.

1. **Add log entry formatting** (`frontend/src/services/logModeService.ts`)
   - Timestamp formatting
   - Markdown bullet format

2. **Add file write orchestration**
   - Find mapping for current app
   - Call `append_to_file` command
   - Handle errors with clipboard fallback

3. **Add feedback** (reuse existing overlay/sound)
   - Success: Show checkmark, play sound
   - Fallback: Show clipboard notification

**Test**: Speak "Log test message" in mapped app, verify file content.

---

### Phase 5: First-Time Configuration Prompt (P2)

**Goal**: Handle unmapped apps gracefully.

1. **Create ConfigPrompt component** (`frontend/src/components/ConfigPrompt.tsx`)
   - Modal with file path input
   - Browse button (if dialog available)
   - Cancel option (clipboard fallback)

2. **Integrate into Log Mode flow**
   - Show prompt when no mapping found
   - Save new mapping on confirm
   - Proceed with log entry save

**Test**: Trigger Log Mode in unmapped app, complete configuration flow.

---

### Phase 6: Settings UI (P3)

**Goal**: Allow users to manage Log Mode settings.

1. **Add Log Mode tab** (`frontend/src/components/SettingsWindow.tsx`)
   - New tab in navigation

2. **Create LogModeSettings component** (`frontend/src/components/settings/LogModeSettings.tsx`)
   - Master enable/disable toggle
   - Trigger phrases section
   - App mappings section

3. **Create sub-components**
   - `TriggerPhraseList.tsx`
   - `AppMappingList.tsx`

**Test**: Add/edit/delete triggers and mappings via UI, verify persistence.

---

## File Locations

### New Files to Create

```
frontend/src/
├── types/
│   └── logMode.ts                    # Type definitions
├── services/
│   └── logModeService.ts             # Business logic
└── components/
    ├── ConfigPrompt.tsx              # First-time config modal
    └── settings/
        ├── LogModeSettings.tsx       # Main settings component
        ├── TriggerPhraseList.tsx     # Trigger management
        └── AppMappingList.tsx        # Mapping management

backend/src/
└── lib.rs                            # Add new Tauri commands
```

### Files to Modify

```
frontend/src/
├── hooks/
│   └── useDictation.ts               # Add trigger detection branch
└── components/
    └── SettingsWindow.tsx            # Add Log Mode tab

backend/src/
└── lib.rs                            # Register new commands
```

---

## Key Code Snippets

### Trigger Detection Integration Point

```typescript
// In useDictation.ts, after transcription:
const rawText = await dictationController.processTranscription(audioBlob, apiKey, model);

// NEW: Check for Log Mode trigger
if (logModeService.isEnabled()) {
  const detection = await logModeService.detectTrigger(rawText);
  if (detection.detected && detection.content) {
    // Branch to Log Mode flow
    await handleLogMode(detection.content, activeWindowInfo);
    return; // Skip normal dictation flow
  }
}

// Continue normal flow...
const formattedText = await dictationController.postProcessTranscription(...);
```

### Timestamp Formatting

```typescript
function formatTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function formatLogEntry(content: string): string {
  return `- [${formatTimestamp()}] ${content}`;
}
```

### Rust append_to_file Command

```rust
#[tauri::command]
async fn append_to_file(path: String, content: String) -> Result<(), String> {
    use std::fs::{OpenOptions, create_dir_all};
    use std::io::Write;
    use std::path::Path;

    // Validate path
    let path = Path::new(&path);
    if !path.is_absolute() {
        return Err("INVALID_PATH: Path must be absolute".to_string());
    }
    if path.to_string_lossy().contains("..") {
        return Err("INVALID_PATH: Path contains traversal sequences".to_string());
    }
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
    if !["md", "txt", "log"].contains(&ext) {
        return Err("INVALID_EXTENSION: Only .md, .txt, .log files allowed".to_string());
    }

    // Create parent directories
    if let Some(parent) = path.parent() {
        create_dir_all(parent).map_err(|e| format!("IO_ERROR: {}", e))?;
    }

    // Append to file
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| format!("IO_ERROR: {}", e))?;

    writeln!(file, "{}", content).map_err(|e| format!("IO_ERROR: {}", e))?;

    Ok(())
}
```

---

## Testing Checklist

### Unit Tests
- [ ] `logModeService.detectTrigger()` with various inputs
- [ ] `logModeService.findMappingForApp()` lookup logic
- [ ] Timestamp formatting
- [ ] Path validation

### Integration Tests
- [ ] Full flow: Speak trigger → File append
- [ ] Clipboard fallback on file error
- [ ] Settings persistence across restart
- [ ] Cross-window settings sync

### Manual Tests
- [ ] Trigger detection with each default phrase
- [ ] First-time config prompt flow
- [ ] Settings UI: add/edit/delete operations
- [ ] Error scenarios (locked file, invalid path)

---

## Common Gotchas

1. **Case sensitivity**: Trigger matching must be case-insensitive
2. **Path separators**: Windows uses `\`, normalize paths
3. **Empty content**: Don't log if content is empty after stripping trigger
4. **Race conditions**: Settings changes while dictation in progress
5. **File encoding**: Use UTF-8 for all log files
