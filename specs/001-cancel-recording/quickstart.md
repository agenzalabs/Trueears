# Quickstart: Cancel Recording Feature

**Feature**: 001-cancel-recording
**Date**: 2025-12-24

## Overview

This feature adds the ability to cancel an ongoing recording by pressing the Escape key. The recording is discarded without transcription, a "cancelled" status is displayed briefly, and a distinct cancellation sound plays.

## Files to Modify

| File | Change |
|------|--------|
| `frontend/src/hooks/useAudioRecorder.ts` | Add `cancelRecording()` method |
| `frontend/src/hooks/useDictation.ts` | Add `cancelled` status, `cancelDictation()` method |
| `frontend/src/components/RecorderOverlay.tsx` | Update Escape key handler |
| `frontend/src/components/StatusIndicator.tsx` | Add amber cancelled state |
| `frontend/src/utils/soundUtils.ts` | Add `playCancelSound()` function |

## Implementation Order

1. **useAudioRecorder.ts** - Add `cancelRecording()` (foundational)
2. **useDictation.ts** - Extend type, add `cancelDictation()` (depends on #1)
3. **soundUtils.ts** - Add `playCancelSound()` (independent)
4. **StatusIndicator.tsx** - Add cancelled visual state (independent)
5. **RecorderOverlay.tsx** - Wire up Escape key (depends on #2, #3, #4)

## Key Patterns

### Cancel vs Stop

```typescript
// STOP: Processes audio and triggers transcription
const blob = await stopRecording();
await transcribe(blob);

// CANCEL: Discards audio, no processing
cancelRecording(); // Returns void, no Blob created
```

### Status Flow

```typescript
// Normal flow: recording → processing → success/error → idle
// Cancel flow: recording → cancelled → idle (no processing step)
```

### Sound Design

```typescript
// Success: 880Hz sine wave, 1s duration (celebratory)
// Cancel: 440Hz triangle wave, 0.3s duration (soft acknowledgment)
```

## Testing Checklist

- [ ] Escape during recording discards audio
- [ ] No API calls made on cancel
- [ ] Amber X indicator displays briefly
- [ ] Cancel sound plays (distinct from success)
- [ ] Works in Auto, Toggle, and Push-to-Talk modes
- [ ] Rapid Escape presses handled gracefully
- [ ] Memory released (no audio data retained)

## Local Development

```bash
# Run frontend dev server
cd frontend && npm run dev

# Run tests
cd frontend && npm run test

# Test specific file
cd frontend && npm run test -- useAudioRecorder.test.ts
```
