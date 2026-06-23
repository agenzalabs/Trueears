---
id: 030
title: Mic settings deep-link capability and accurate permission visual
stage: green
date: 2026-06-23
surface: agent
model: claude-opus-4-8
feature: none
branch: fix/onboarding-shortcut-order-detection
user: devvshayan@gmail.com
command: general
labels: ["onboarding", "permissions", "tauri", "capabilities", "ux"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - backend/capabilities/settings-window.json
  - frontend/src/components/onboarding/StepPermissions.tsx
tests:
  - cargo check (exit 0)
  - npx tsc --noEmit -p frontend/tsconfig.json (exit 0)
---

## Prompt

yes handle both follow-ups

(Follow-ups to the mic-permission recovery: 1) the "Open microphone settings"
deep-link needed its scheme allowlisted in the opener capabilities; 2) the
permission-step visual still promised a browser prompt that never appears.)

## Response snapshot

**1 — Opener capability.** Onboarding renders in the `settings` window
(`index.tsx:67`). Added a scoped `opener:allow-open-url` permission to
`backend/capabilities/settings-window.json` allowing `ms-settings:*` (Windows mic
privacy) and `x-apple.systempreferences:*` (macOS) so the "Open microphone
settings" button actually launches the OS panel instead of silently no-op'ing.
Verified the schema format against `gen/schemas/desktop-schema.json` (OpenerScopeEntry
= `{ url }` glob) and confirmed `cargo check` accepts it.

**2 — Accurate visual.** The right-pane `PermissionsVisual` showed a fake
"'Trueears' wants to use your microphone / Click Allow when your browser asks"
dialog. On Windows the app auto-allows the WebView2 mic permission
(`configure_windows_webview_media`) so no prompt ever appears — the old copy sent
users hunting for a non-existent pop-up. Replaced it with "One click, no pop-ups
… Trueears enables your mic directly — there's no system prompt to confirm" plus a
"Handled automatically" badge.

## Outcome

- ✅ Impact: Mic-settings deep-link works on Windows/macOS; permission step no longer promises a phantom prompt.
- 🧪 Tests: cargo check PASS, tsc PASS. Runtime deep-link still needs a manual Windows click-through.
- 📁 Files: backend/capabilities/settings-window.json, frontend/src/components/onboarding/StepPermissions.tsx
- 🔁 Next prompts: Manually confirm the button opens Windows Settings > Microphone.
- 🧠 Reflection: WebView auto-allow removes the browser prompt, so onboarding copy and any deep-links must reflect OS-level (not webview) permission reality.
