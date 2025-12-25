# Research: Cancel Recording Feature

**Feature**: 001-cancel-recording
**Date**: 2025-12-24
**Status**: Complete

## Research Areas

### 1. Current Escape Key Behavior

**Finding**: The current Escape key handler in `RecorderOverlay.tsx` (lines 387-393) calls `handleStopRecording()` when recording, which triggers the full transcription flow.

```typescript
// Current behavior (RecorderOverlay.tsx:390-392)
if (e.key === 'Escape' && isVisible) {
  if (recordingStatus === 'recording') handleStopRecording();
  else setIsVisible(false);
}
```

**Decision**: Replace `handleStopRecording()` with `handleCancelRecording()` when Escape is pressed during recording.

**Rationale**: Escape universally means "cancel/abort" in UI conventions. Users expect Escape to discard, not complete.

**Alternatives considered**:
- Keep Escape as stop, add Ctrl+Escape for cancel → Rejected: More complex, unexpected modifier
- Add cancel button to overlay → Could be added later as enhancement, but keyboard-first is primary

---

### 2. Audio Recorder Cancellation Pattern

**Finding**: `useAudioRecorder.ts` has no cancel method. `stopRecording()` always creates and returns a Blob.

**Decision**: Add `cancelRecording()` method that:
1. Stops the MediaRecorder
2. Stops all MediaStream tracks
3. Clears `audioChunksRef.current = []`
4. Does NOT create or return a Blob
5. Resets state to initial

**Rationale**: Clean separation - cancel discards data, stop preserves it.

**Alternatives considered**:
- Add `discard` parameter to `stopRecording()` → Rejected: Mixing concerns, harder to maintain
- Return null from `stopRecording()` on cancel → Rejected: Type confusion, caller must handle

---

### 3. DictationStatus Extension

**Finding**: Current `DictationStatus` type is `'idle' | 'recording' | 'processing' | 'success' | 'error'`.

**Decision**: Add `'cancelled'` status: `'idle' | 'recording' | 'processing' | 'success' | 'error' | 'cancelled'`

**Rationale**: Distinct status enables distinct UI (amber indicator) and sound.

**Alternatives considered**:
- Reuse 'error' status → Rejected: Misleading, error implies failure not user intent
- Skip to 'idle' immediately → Rejected: No visual feedback that cancel was recognized

---

### 4. Cancel Sound Design

**Finding**: `soundUtils.ts` uses Web Audio API with oscillator to generate success sound (880Hz sine wave, 1s duration).

**Decision**: Create `playCancelSound()` using similar pattern but:
- Lower frequency: 440Hz (A4) for softer, less celebratory tone
- Shorter duration: 0.3s for quick acknowledgment
- Triangle wave for softer timbre

**Rationale**: Distinct from success (which is higher, longer, sine wave) but still pleasant.

**Alternatives considered**:
- Use external audio file → Rejected: Adds bundle size, constitution principle I
- No sound → Rejected: User explicitly chose distinct sound in spec clarification
- Error-like sound → Rejected: Cancel is not error, should feel neutral/soft

---

### 5. StatusIndicator Cancelled State

**Finding**: `StatusIndicator.tsx` shows green checkmark for success, red X for error. Uses Tailwind classes.

**Decision**: Add amber/yellow X icon for cancelled state:
- Color: `text-amber-400` (consistent with warning palette)
- Icon: X mark (same as error, but amber indicates intentional abort vs failure)

**Rationale**: X communicates "did not complete" while amber differentiates from red error.

**Alternatives considered**:
- Circle with slash → More distinct but requires custom SVG
- Empty circle → Too subtle, unclear meaning
- Amber checkmark → Confusing, checkmark implies success

---

### 6. Debouncing Rapid Escape Presses

**Finding**: No debounce currently exists for Escape key in `RecorderOverlay.tsx`.

**Decision**: Use a ref-based flag (`isCancellingRef`) similar to `isProcessingRef` in `useDictation.ts` to prevent multiple cancellations.

**Rationale**: Simplest approach, matches existing pattern in codebase.

**Alternatives considered**:
- lodash debounce → Adds dependency, overkill for simple case
- setTimeout-based cooldown → More complex state management

---

## Summary of Decisions

| Area | Decision | Files Affected |
|------|----------|----------------|
| Escape key | Call `cancelDictation()` instead of `stopDictation()` | RecorderOverlay.tsx |
| Audio cancel | New `cancelRecording()` method | useAudioRecorder.ts |
| Status type | Add 'cancelled' to DictationStatus | useDictation.ts |
| Cancel function | New `cancelDictation()` method | useDictation.ts |
| Cancel sound | New `playCancelSound()` (440Hz, 0.3s, triangle) | soundUtils.ts |
| UI indicator | Amber X icon for cancelled | StatusIndicator.tsx |
| Debounce | Ref-based flag | useDictation.ts |
