# Data Model: Context-Aware Log Mode

**Feature**: 004-context-log
**Date**: 2025-12-28

## Entity Definitions

### 1. LogModeConfig

The root configuration object for Log Mode, stored as a single JSON value in Tauri Store.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `enabled` | boolean | Yes | Master toggle for Log Mode feature |
| `triggerPhrases` | TriggerPhrase[] | Yes | List of voice triggers that activate Log Mode |
| `appMappings` | AppLogMapping[] | Yes | App-to-file routing configuration |

**Storage Key**: `SCRIBE_LOG_MODE_CONFIG`

**Default Value**:
```json
{
  "enabled": true,
  "triggerPhrases": [
    { "id": "default-log", "phrase": "Log", "enabled": true },
    { "id": "default-note", "phrase": "Note to self", "enabled": true },
    { "id": "default-remember", "phrase": "Remember", "enabled": true }
  ],
  "appMappings": []
}
```

---

### 2. TriggerPhrase

A voice phrase that activates Log Mode when detected at the start of a transcription.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | string | Yes | UUID v4 | Unique identifier |
| `phrase` | string | Yes | 1-50 chars, no leading/trailing whitespace | The trigger phrase text |
| `enabled` | boolean | Yes | - | Whether this trigger is active |

**Validation Rules**:
- `phrase` must be unique (case-insensitive comparison)
- `phrase` must not be empty or whitespace-only
- `phrase` should not be a substring of another trigger phrase (warn user)

**State Transitions**: None (static configuration)

---

### 3. AppLogMapping

A mapping between an application and its designated log file.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | string | Yes | UUID v4 | Unique identifier |
| `appIdentifier` | string | Yes | Executable name or path | App identifier for matching (e.g., "Code.exe") |
| `appDisplayName` | string | Yes | 1-100 chars | Human-readable app name (e.g., "VS Code") |
| `logFilePath` | string | Yes | Absolute path, .md/.txt/.log extension | Destination file for log entries |
| `createdAt` | string | Yes | ISO 8601 datetime | When this mapping was created |

**Validation Rules**:
- `appIdentifier` must be unique (only one mapping per app)
- `logFilePath` must be an absolute path
- `logFilePath` must have allowed extension (.md, .txt, .log)
- `logFilePath` must not contain path traversal sequences (..)

**State Transitions**: None (static configuration)

---

### 4. LogEntry

A single log entry written to a file. This is not stored in settings; it's the output format.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `timestamp` | string | Yes | Format: `YYYY-MM-DD HH:MM` (local time) |
| `content` | string | Yes | The transcribed text (trigger phrase stripped) |
| `sourceApp` | string | No | App identifier that triggered this entry |

**File Format**:
```markdown
- [2025-12-28 14:30] Check the Redis timeout issue
- [2025-12-28 14:35] Remember to follow up with client
```

Each entry is a single line: `- [TIMESTAMP] CONTENT\n`

---

### 5. ActiveWindowInfo (Existing - Reused)

Already defined in Scribe. Used for app matching.

| Field | Type | Description |
|-------|------|-------------|
| `app_name` | string | Executable name (e.g., "chrome.exe") |
| `window_title` | string | Window title text |
| `executable_path` | string | Full path to executable |
| `url` | string? | Browser URL if applicable |

**Usage**: Match `appIdentifier` in `AppLogMapping` against `app_name` or `executable_path`.

---

## Relationships

```
LogModeConfig (1)
    │
    ├── triggerPhrases (1:N) ── TriggerPhrase
    │
    └── appMappings (1:N) ── AppLogMapping
                                   │
                                   └── matches ── ActiveWindowInfo (runtime)
                                   │
                                   └── writes to ── LogEntry (output file)
```

---

## Data Flow

### Configuration Flow (Settings)
```
User Settings UI
       │
       ▼
LogModeSettings.tsx
       │
       ▼
logModeService.ts ──► tauriAPI.setStoreValue('SCRIBE_LOG_MODE_CONFIG', config)
       │
       ▼
Tauri Store (settings.json)
       │
       ▼
Event: 'settings-changed' ──► All windows sync
```

### Runtime Flow (Dictation)
```
User speaks "Log check the Redis timeout"
       │
       ▼
Whisper API ──► rawText: "Log check the Redis timeout"
       │
       ▼
Trigger Detection (logModeService.detectTrigger)
       │
       ├── Match found: "Log"
       │   ├── Strip trigger: "check the Redis timeout"
       │   ├── Get ActiveWindowInfo
       │   ├── Find AppLogMapping for current app
       │   │   ├── Found: Use configured file path
       │   │   └── Not Found: Show configuration prompt
       │   ├── Format timestamp
       │   └── Call append_to_file Tauri command
       │
       └── No match: Continue normal dictation flow
```

---

## Indexes & Lookups

### By App Identifier (Runtime)
When looking up the file path for an app:
```typescript
function findMappingForApp(appIdentifier: string): AppLogMapping | undefined {
  return config.appMappings.find(
    m => m.appIdentifier.toLowerCase() === appIdentifier.toLowerCase()
  );
}
```

### By Trigger Phrase (Runtime)
When detecting if transcription starts with a trigger:
```typescript
function detectTrigger(text: string): { trigger: TriggerPhrase; content: string } | null {
  const lowerText = text.toLowerCase();
  // Sort by length descending to match longest phrase first
  const sortedPhrases = config.triggerPhrases
    .filter(t => t.enabled)
    .sort((a, b) => b.phrase.length - a.phrase.length);

  for (const trigger of sortedPhrases) {
    const lowerPhrase = trigger.phrase.toLowerCase();
    if (lowerText.startsWith(lowerPhrase)) {
      const content = text.slice(trigger.phrase.length).trim();
      return { trigger, content };
    }
  }
  return null;
}
```

---

## Migration Strategy

### From Empty State
- On first load, if `SCRIBE_LOG_MODE_CONFIG` is not set, initialize with default config
- Default includes 3 trigger phrases, no app mappings

### Future Schema Changes
- Add `version` field to `LogModeConfig` for future migrations
- Use same migration pattern as App Profiles (check for version, apply transforms)
