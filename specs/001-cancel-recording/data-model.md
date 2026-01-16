# Data Model: Cancel Recording

**Feature**: 001-cancel-recording
**Date**: 2025-12-24
**Status**: Complete

## Entities

### 1. DictationStatus (Extended)

**Location**: `frontend/src/hooks/useDictation.ts`

**Current Definition**:
```typescript
type DictationStatus = 'idle' | 'recording' | 'processing' | 'success' | 'error';
```

**Extended Definition**:
```typescript
type DictationStatus = 'idle' | 'recording' | 'processing' | 'success' | 'error' | 'cancelled';
```

**State Transitions**:
```
                    ┌─────────────┐
                    │    idle     │
                    └──────┬──────┘
                           │ start recording
                           ▼
                    ┌─────────────┐
              ┌─────│  recording  │─────┐
              │     └─────────────┘     │
              │ Escape                  │ stop (normal)
              ▼                         ▼
       ┌─────────────┐          ┌─────────────┐
       │  cancelled  │          │ processing  │
       └──────┬──────┘          └──────┬──────┘
              │                        │
              │ timeout                │ API complete
              ▼                        ▼
       ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
       │    idle     │   │   success   │   │    error    │
       └─────────────┘   └──────┬──────┘   └──────┬──────┘
                                │ timeout         │ timeout
                                ▼                 ▼
                         ┌─────────────┐   ┌─────────────┐
                         │    idle     │   │    idle     │
                         └─────────────┘   └─────────────┘
```

**Validation Rules**:
- `cancelled` can only be reached from `recording`
- `cancelled` always transitions to `idle` after display timeout
- No API calls occur during `cancelled` transition

---

### 2. AudioRecorderState (Extended)

**Location**: `frontend/src/hooks/useAudioRecorder.ts`

**New Method Signature**:
```typescript
interface UseAudioRecorder {
  // Existing
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob>;
  isRecording: boolean;

  // New
  cancelRecording: () => void;
}
```

**Internal State Changes**:
| Property | On Cancel |
|----------|-----------|
| `mediaRecorderRef.current` | `.stop()` called, set to `null` |
| `streamRef.current` | All tracks stopped, set to `null` |
| `audioChunksRef.current` | Cleared to `[]` |
| `isRecording` | Set to `false` |

---

### 3. StatusIndicator Props (Extended)

**Location**: `frontend/src/components/StatusIndicator.tsx`

**Current Status Type**:
```typescript
status: 'idle' | 'recording' | 'processing' | 'success' | 'error' | 'setup' | 'settings' | 'warning' | 'none';
```

**Visual Mapping for Cancelled**:
| Status | Icon | Color | Description |
|--------|------|-------|-------------|
| `cancelled` | X mark | `text-amber-400` | User intentionally aborted |

---

## No Persistent Data Changes

This feature does not modify:
- Database schemas
- Local storage
- Backend state
- Configuration files

All changes are in-memory UI state only.
