---
id: 028
title: Tutorial shortcut closes settings window
stage: green
date: 2026-06-23
surface: agent
model: claude-opus-4-8
feature: none
branch: chore/add-coderabbit-config
user: ahmed369ww@gmail.com
command: general
labels: ["onboarding", "tutorial", "shortcuts", "bugfix", "tauri"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - backend/src/shortcuts.rs
tests:
  - cargo check --manifest-path backend/Cargo.toml (exit 0)
---

## Prompt

issue fixed now here is this problem when i click crl shift k reecogin start but when i
click on fields and speak and again press ctrl shift k it closes the wondow instead of
writign in that field ahen i repoen it start from my profile where on wihc step i seinged in

(Two screenshots: the onboarding "Shortcut" step showing the recorder waveform active at
the bottom, and the "Tutorial - Send a Message" step with the mock chat input.)

## Response snapshot

Root cause: On the tutorial step, `StepTutorial` renames the settings window to
"Tutorial - Slack" / "Tutorial - Gmail" / "Tutorial - Notion" so the recorder can detect
tutorial mode. But `handle_recording_shortcut_pressed` decided whether to close the
settings window by checking `window_title.contains("Trueears Settings")`. During the
tutorial that check is false, so the handler closed the settings window on the stop press
("closes the window instead of writing in that field"). Because onboarding step state is
held in the (now destroyed) window, reopening restarted onboarding from an earlier step.

Fix (`backend/src/shortcuts.rs`):
- `is_in_settings` now also true when `in_tutorial` (TUTORIAL_MODE non-empty).
- Settings window is only auto-closed when `onboarding_complete` is true, so the whole
  onboarding flow (including the dictation tutorial) keeps its window.

Also flagged to the user that the recorder still firing on the Shortcut step means the
earlier Rust guard (PHR 027) was not compiled into their running app — they need to fully
restart `npm run dev` so `tauri dev` recompiles the backend.

## Outcome

- ✅ Impact: Tutorial dictation no longer closes the onboarding window; onboarding progress is preserved.
- 🧪 Tests: cargo check PASS. Runtime verification pending after a full `tauri dev` restart.
- 📁 Files: backend/src/shortcuts.rs
- 🔁 Next prompts: Confirm post-restart that the Shortcut step shows no recorder and the Tutorial step inserts text.
- 🧠 Reflection: Renaming a window for one purpose (mode detection) silently broke a title-based check elsewhere; gating window-close on persisted onboarding state is more robust.

## Evaluation notes (flywheel)

- Failure modes observed: title-based window identification broken by intentional retitling; Rust changes not recompiled in a running dev session.
- Graders run and results (PASS/FAIL): cargo check PASS.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
