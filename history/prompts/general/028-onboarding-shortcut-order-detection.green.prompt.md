---
id: 028
title: Onboarding shortcut order-detection hardening
stage: green
date: 2026-06-23
surface: agent
model: claude-opus-4-8
feature: none
branch: main
user: devvshayan@gmail.com
command: general
labels: ["onboarding", "shortcuts", "bugfix", "tauri", "reliability"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - frontend/src/components/onboarding/StepTrigger.tsx
tests:
  - npx tsc --noEmit -p frontend/tsconfig.json (exit 0)
---

## Prompt

verify the order-detection issue and prepare a fix

(Context: customer reported the onboarding "Try the Shortcut" keys only light up
when pressing K *before* Ctrl+Shift, not the natural Ctrl+Shift+K order.)

## Response snapshot

Verified root cause: the OS global hotkey (Ctrl+Shift+K, registered in
`shortcuts.rs`) swallows the "k" keydown when modifiers are already held, so
`StepTrigger`'s page-level key tracking structurally cannot complete the combo in
the natural order. Pressing K first avoids the OS hotkey, so the page fallback sees
all keys — hence the order asymmetry.

`f6bc848` already routed onboarding presses to the `onboarding-trigger` event
(`activateShortcut` → green + success), which makes the natural order work via the
global-event path. Remaining fragility: that path is the *only* one that can catch
the natural order, yet it depended on a single async-registered listener with an
unmount/registration race and no stuck-key reset.

Fix (StepTrigger.tsx): hardened the listener effect — added an `isActive` guard so
listeners registering after unmount are torn down (no leak/double-fire), a `blur`
handler to clear stuck modifier keys, and clarifying comments documenting that the
global event is the authoritative signal for natural-order presses while the key
tracking is a fallback for K-first/visual feedback.

## Outcome

- ✅ Impact: Natural-order Ctrl+Shift+K reliably confirmed via the global event; no leaked/stale listeners; no stuck green keys on blur.
- 🧪 Tests: tsc --noEmit PASS. Runtime behavior still needs manual verification on Windows.
- 📁 Files: frontend/src/components/onboarding/StepTrigger.tsx
- 🔁 Next prompts: Manually verify in a dev build that natural-order Ctrl+Shift+K turns the keys green and auto-advances.
- 🧠 Reflection: When the OS consumes a hotkey, the webview cannot observe it; the global-shortcut event must be the source of truth, not page-level key tracking.
