---
id: "0012"
title: "Fix ConfigPrompt blocking outside clicks"
stage: green
date: 2025-12-29
surface: agent
model: "unknown"
feature: "004-context-log"
branch: "004-context-log"
user: "devv-shayan"
command: "interactive"
labels: ["windows", "tauri", "overlay", "mouse-events", "bugfix"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - frontend/src/components/RecorderOverlay.tsx
  - frontend/src/utils/tauriApi.ts
  - backend/src/lib.rs
  - backend/src/window.rs
tests:
  - npm exec tsc -- -p frontend/tsconfig.json
  - npm run vite:build
  - cargo check --manifest-path backend/Cargo.toml
---

## Prompt

<system-reminder>
The user opened the file d:\Trueears\frontend\src\components\RecorderOverlay.tsx in the IDE.
This may or may not be related to the current task.
</system-reminder>So now I'm not able to minimize or click anywhere, as beside the config prompt widget when it open, is this your fix ?

## Response snapshot

Implemented log-config-specific click-through by polling the global cursor position and toggling `setIgnoreCursorEvents` based on whether the cursor is over the capsule, so other windows remain clickable while the ConfigPrompt stays interactive.
Added a `get_cursor_position` Tauri command (Windows) and removed the focus-stealing logic that could prevent interacting with other apps.

## Outcome

- ✅ Impact: Restores the ability to click outside the ConfigPrompt (e.g., minimize other windows) while keeping the prompt clickable.
- 🧪 Tests: `tsc`, `vite build`, and `cargo check` passed.
- 📁 Files: Added cursor-position plumbing + capsule hit-testing in the overlay.
- 🔁 Next prompts: Re-test the original “not clickable when desktop behind” scenario; if it persists, proceed to a separate non-transparent window for ConfigPrompt.
- 🧠 Reflection: Window-level ignore-cursor-events needs an OS-level cursor source to avoid getting stuck when mouse events stop firing.

## Evaluation notes (flywheel)

- Failure modes observed: If cursor/win coordinate transforms are off on mixed-DPI setups, hover hit-testing may be imprecise.
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Add DPI/position recache when monitor/layout changes or increase hit margin if false negatives are observed.
