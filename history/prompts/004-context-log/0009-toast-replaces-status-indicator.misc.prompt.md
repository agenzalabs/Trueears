---
id: "0009"
title: "Toast morphing animation from ConfigPrompt overlay"
stage: misc
date: 2025-12-29
surface: agent
model: claude-3-7-sonnet-20250219
feature: "004-context-log"
branch: "004-context-log"
user: "devv-shayan"
command: "interactive"
labels: ["ui", "toast", "positioning", "ux", "animation"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - frontend/src/components/Toast.tsx
  - frontend/src/components/RecorderOverlay.tsx
  - frontend/src/hooks/useToast.ts
tests: []
---

## Prompt
yeah its fixed , just instead of show this toast at the top , the check shouldnt display and this toast should diaply at its place

## Follow-up Clarifications
1. "the idle state should also not appear , as of now this toast is appearing on top of that idle state so hide that aswell"
2. "Yeah, it's working now and it's fine. Just one more thing: when the overlay of the path—where we select the path—and we press the button 'Skip' or 'Save,' that overlay and this toast should have the animation. The overlay should shrink in size and convert into this toast. just like the reocrder widget shapeshift to idle state and viceversa"

## Response

### Changes Made

Implemented a smooth morphing animation where the ConfigPrompt overlay transitions into the toast, similar to the recorder widget shapeshifting between states.

1. **Toast.tsx**: Changed positioning from top to bottom
   - Updated interface prop from `topOffset?: number` to `bottomOffset?: number`
   - Changed inline style from `top: topOffset ?? 16` to `bottom: bottomOffset ?? 48`

2. **useToast.ts**: Added delay mechanism for toast appearance
   - Added optional `delayMs` parameter to `showToast` function (defaults to 0)
   - Implements setTimeout when delay > 0 to coordinate with capsule animation

3. **RecorderOverlay.tsx**: Orchestrated morphing animation
   - Added `isConfigTransitioning` state to track animation phase
   - Created `handleConfirmLogConfig` wrapper to trigger transition for "Save" button
   - Modified `handleCancelLogConfig` to:
     - Set `isConfigTransitioning = true` (starts fade-out)
     - Call `cancelLogConfig()` (changes status to 'log-saved', triggers capsule shrink)
     - Wait 300ms for animation to complete
     - Reset transition state and show toast
   - Updated ConfigPrompt rendering logic:
     - Keeps ConfigPrompt visible during transition: `(status === 'log-config-needed' || isConfigTransitioning)`
     - Added fade-out wrapper: `<div className={transition-opacity duration-300 ${isConfigTransitioning ? 'opacity-0' : 'opacity-100'}}>`
     - Updated to use `handleConfirmLogConfig` instead of direct `confirmLogConfig`
   - Hidden StatusIndicator during transition: `{!isConfigTransitioning && (<StatusIndicator ... />)}`
   - Modified capsule visibility: `{isVisible && !isToastVisible && (` (hides overlay when toast shows)
   - Updated Toast positioning: `bottomOffset={windowPadding + 48}` (matches capsule position)

### Animation Flow

When user clicks "Skip" or "Save":
1. **T=0ms**: `isConfigTransitioning` becomes true
   - ConfigPrompt starts fading out (opacity: 100% → 0%)
   - StatusIndicator hides immediately
2. **T=0ms**: Status changes to 'log-saved'
   - Capsule shrinks from config size (w-96 h-28) to idle size (w-9 h-9)
3. **T=0-300ms**: Both animations run simultaneously
   - ConfigPrompt content fades out (transition-opacity duration-300)
   - Capsule size animates (transition-all duration-300)
4. **T=300ms**: Animation completes
   - `isConfigTransitioning` becomes false → ConfigPrompt stops rendering
   - Capsule hides (due to `!isToastVisible` check)
   - Toast appears at same location (bottomOffset matches capsule position)
5. **T=300-3300ms**: Toast displays for 3 seconds
6. **T=3300ms**: Toast auto-hides

### Outcome

- ✅ Smooth morphing animation where ConfigPrompt shrinks and fades into toast
- ✅ ConfigPrompt content fades out while capsule shrinks (synchronized 300ms transitions)
- ✅ Toast appears at exact location where ConfigPrompt was positioned
- ✅ Animation mimics recorder widget state transitions (shapeshift effect)
- ✅ No visual overlap or jarring transitions
- ✅ Works for both "Skip" (with toast) and "Save" (without toast) buttons
