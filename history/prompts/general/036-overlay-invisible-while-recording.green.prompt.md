---
id: 036
title: Debug overlay invisible while recording
stage: green
date: 2026-07-29
surface: agent
model: claude-opus-5
feature: none
branch: fix/onboarding-shortcut-order-detection
user: shayan-devv
command: debug session (no slash command)
labels: ["overlay", "bug", "multi-monitor", "race-condition", "window-geometry"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - backend/src/lib.rs
  - backend/src/shortcuts.rs
  - frontend/src/hooks/useOverlayAnchor.ts
  - frontend/src/hooks/useDictation.ts
  - frontend/src/components/RecorderOverlay.tsx
  - frontend/src/components/Toast.tsx
tests:
  - cargo check (backend) - PASS
  - tsc --noEmit (frontend) - PASS
  - eslint on changed files - PASS (pre-existing warnings only)
  - npm run vite:build - PASS
  - standalone anchor-geometry check across 5 monitor layouts - PASS
---

## Prompt

Hey, I want you to debug an issue that I am facing. Sometimes the overlay doesn't appear on the screen, but it still records; the overlay doesn't show on the screen.

## Response snapshot

Found three independent causes, all of which produce exactly "no overlay, recording still works".

1. **Capsule drawn on the wrong screen (multi-monitor).** The overlay window spans the
   bounding box of all monitors; the capsule was placed at `left: 50%` of that box with
   `bottom = |min(windowY, 0)| + 48`. That anchors it to the centre of the *union* of all
   displays, not to the screen in use. Verified numerically: in every multi-monitor layout
   tested the capsule landed on a different monitor than the one the user works on. The
   vertical term also mixed physical pixels into a CSS offset, so it drifted with DPI
   scaling (123px instead of 60px above the bottom edge at 125%, per the user's own log).

2. **Stale window geometry.** The window was sized once in `setup()`. Any later display
   change (dock/undock, resolution or DPI switch, monitor sleep, RDP) leaves it covering
   nothing visible for the rest of the session, and the frontend read its position exactly
   once at mount so it never noticed.

3. **Timers from the previous session hiding the live one.** `cancelDictation`,
   `stopDictation` and the log-mode handlers each scheduled an untracked `setTimeout` to
   reset the status to `idle`. Pressing the shortcut again within that window (cancel and
   retry, ~1.5s) let the old timer flip the *new* recording to `idle`, after which the 5s
   idle auto-hide removed the overlay mid-recording. The same applies to `uiMode`:
   a `show-warning` left `uiMode: 'warning'` behind with a pending 3s hide timer that
   nothing cleared when recording started.

Fixes: new `useOverlayAnchor` hook resolves the anchor against the monitor under the
cursor (cursor -> primary -> current -> legacy fallback), converts physical to CSS pixels,
and recomputes on window moved/resized/scale-changed plus on demand before showing;
`sync_overlay_geometry()` in Rust re-applies the desktop-spanning geometry on every
activation (Windows/macOS only - Linux keeps its small centred panel) and logs the result;
all delayed resets in `useDictation` go through a single tracked timer that a new session
cancels; `isRecording` is exposed from the recorder and hard-guards all three auto-hide
paths so the overlay can never be hidden while the microphone is live.

## Outcome

- ✅ Impact: overlay now anchors to the active screen, survives display changes, and can no longer be hidden by a previous session's timer while recording.
- 🧪 Tests: cargo check, tsc --noEmit, eslint, vite build, plus a standalone geometry check over 5 monitor layouts (single @100%/@125%, external right/above/L-shaped).
- 📁 Files: 5 modified, 1 added (`frontend/src/hooks/useOverlayAnchor.ts`).
- 🔁 Next prompts: consider `tauri-plugin-single-instance` (the log shows a second instance failing to register Ctrl+Shift+K); consider anchoring to the foreground window's monitor instead of the cursor's.
- 🧠 Reflection: the log file was the fastest route to the real geometry (`pos=(-250,-250), size=2420x1580, scale=1.25`) and made the DPI mismatch provable rather than theoretical.

## Evaluation notes (flywheel)

- Failure modes observed: three distinct root causes behind one symptom; fixing only the most obvious (state race) would have left the multi-monitor case broken.
- Graders run and results (PASS/FAIL): PASS (build + typecheck + lint + geometry check).
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): reproduce on a two-monitor setup and confirm from the new `Overlay window after show:` log line that the geometry matches the active display.
