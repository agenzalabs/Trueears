---
id: 027
title: Onboarding shortcut Groq prompt and paste fixes
stage: green
date: 2026-06-22
surface: agent
model: claude-opus-4-8
feature: none
branch: chore/add-coderabbit-config
user: ahmed369ww@gmail.com
command: general
labels: ["onboarding", "shortcuts", "bugfix", "tauri"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - backend/src/shortcuts.rs
  - frontend/src/components/RecorderOverlay.tsx
tests:
  - cargo check --manifest-path backend/Cargo.toml (exit 0)
  - npx tsc --noEmit -p frontend/tsconfig.json (exit 0)
---

## Prompt

if i press control shift k it asks me for my groq api key even though i have already provided it
and secondly if i try to paste my groq key it doesnt let me [Image #1]

(Screenshot showed the onboarding "Try the Shortcut" / StepTrigger screen with the
RecorderOverlay SetupView ("Enter Groq API Key (gsk_...)" + SAVE) popped up over it.)

## Response snapshot

Diagnosed two bugs:

1. **Shortcut summons the Groq key prompt during onboarding.** The global
   Ctrl+Shift+K handler in `shortcuts.rs` only suppressed the recorder when the
   async-set `ONBOARDING_TRIGGER_ACTIVE` flag was true. That flag is flipped via
   an async IPC call when `StepTrigger` mounts, so a key press could arrive (or a
   remount could reorder the set/clear calls) before it propagated — the backend
   then emitted `shortcut-pressed` to the `main` overlay, which showed `SetupView`
   because the overlay's API-key copy was empty/stale.

   Fix: added a race-proof, persisted guard in `handle_recording_shortcut_pressed`.
   When `Trueears_ONBOARDING_COMPLETE` != "true" and `Trueears_TUTORIAL_MODE` is
   empty (the tutorial step is the only onboarding step that needs the real
   recorder), the shortcut routes to `onboarding-trigger` instead of summoning the
   recorder.

2. **Can't paste into the key prompt.** The `main` overlay window is created with
   `"focus": false` and shown without activation (so it never steals focus during
   normal dictation), so its input never gets real keyboard focus. Added
   `getCurrentWindow().setFocus()` in the setup branch of `handleStartRecording`
   so the SetupView input accepts typing and paste when it does appear
   post-onboarding.

## Outcome

- ✅ Impact: Onboarding shortcut test no longer pops the Groq key prompt; key prompt is focusable/pasteable when legitimately shown.
- 🧪 Tests: cargo check PASS, tsc --noEmit PASS. Runtime behavior still needs manual verification on Windows.
- 📁 Files: backend/src/shortcuts.rs, frontend/src/components/RecorderOverlay.tsx
- 🔁 Next prompts: Verify in a dev build that StepTrigger turns green and no overlay appears; confirm paste works in a post-onboarding SetupView.
- 🧠 Reflection: Persisted state is a more reliable gate than an async-set shared flag for cross-window shortcut routing.

## Evaluation notes (flywheel)

- Failure modes observed: async IPC flag race; overlay window lacking keyboard focus.
- Graders run and results (PASS/FAIL): cargo check PASS; tsc PASS.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
