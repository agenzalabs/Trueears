---
id: "0011"
title: "Prevent log config click-through"
stage: green
date: 2025-12-29
surface: agent
model: "unknown"
feature: "004-context-log"
branch: "004-context-log"
user: "devv-shayan"
command: "interactive"
labels: ["windows", "overlay", "mouse-events", "bugfix"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - frontend/src/components/RecorderOverlay.tsx
  - frontend/src/components/StatusIndicator.tsx
  - frontend/src/index.tsx
tests:
  - npm exec tsc -- -p frontend/tsconfig.json
  - npm run vite:build
---

## Prompt

<system-reminder>
The user opened the file d:\Scribe\frontend\src\components\RecorderOverlay.tsx in the IDE.
This may or may not be related to the current task.
</system-reminder>go for 1 first

## Response snapshot

- Updated `RecorderOverlay` hover handlers so they never toggle `setIgnoreMouseEvents(true)` while `recordingStatus === 'log-config-needed'`.
- Ran `tsc` + Vite build; fixed a couple TS issues surfaced by typecheck (spinner usage + explicit ErrorBoundary prop/state declarations).

## Outcome

- ✅ Impact: Prevents the overlay from getting stuck in click-through mode while the Log Mode config prompt is on screen.
- 🧪 Tests: `tsc` + `npm run vite:build` PASS.
- 📁 Files: RecorderOverlay hover guard; small TS fixes in StatusIndicator and index ErrorBoundary.
- 🔁 Next prompts: Re-test ConfigPrompt clickability when no window is behind; if still broken, implement a dedicated non-transparent config window.
- 🧠 Reflection: This is the smallest likely local fix; if it doesn’t help, we’re back to the Windows transparent hit-test limitation.

## Evaluation notes (flywheel)

- Failure modes observed: If WebView2/Windows can’t hit-test transparent always-on-top windows when the desktop is behind, frontend-only changes won’t fully solve it.
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): After confirming this guard, create a separate non-transparent Tauri window for ConfigPrompt.
