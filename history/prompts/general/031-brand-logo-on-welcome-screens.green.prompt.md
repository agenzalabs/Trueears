---
id: 031
title: Use Trueears app icon as logo on welcome/brand screens
stage: green
date: 2026-06-23
surface: agent
model: claude-opus-4-8
feature: none
branch: fix/onboarding-shortcut-order-detection
user: devvshayan@gmail.com
command: general
labels: ["onboarding", "branding", "ui"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - frontend/src/assets/trueears-logo.ico
  - frontend/src/components/common/BrandLogo.tsx
  - frontend/src/components/onboarding/StepSignIn.tsx
  - frontend/src/components/onboarding/StepSuccess.tsx
  - frontend/src/components/auth/AccountSection.tsx
tests:
  - npx tsc --noEmit -p frontend/tsconfig.json (exit 0)
  - npx vite build (exit 0, trueears-logo.ico bundled)
---

## Prompt

instead of using the mic icon as app logo on all welcome screens everywhere, use
trueears logo

## Response snapshot

No SVG/PNG brand logo existed in the repo (`backend/icons/icon.png` is a 1x1
placeholder); the only real mark was the Windows app icon `build/icon.ico`. User
chose to use that app icon. Copied it to `frontend/src/assets/trueears-logo.ico`
and added a shared `BrandLogo` component (`<img>` of the icon, typed via
vite/client's `*.ico` module declaration).

Replaced the mic-icon-as-logo in the three brand spots — `StepSignIn.Visual`
(welcome), `StepSuccess` (logo card), and `AccountSection` ("Trueears Logo") — with
`<BrandLogo>`. Left the legitimate microphone icons untouched: the Transcription
tab icon (`SettingsWindow`), push-to-talk mode icon (`PreferencesSettings`), and the
"Microphone Audio" data row (`LegalPrivacySettings`).

## Outcome

- ✅ Impact: Welcome/brand screens now show the Trueears app icon instead of a generic mic glyph; one shared component makes future rebrands a single-file swap.
- 🧪 Tests: tsc PASS; vite build PASS with `dist/assets/trueears-logo.ico` emitted.
- 📁 Files: BrandLogo.tsx (new), trueears-logo.ico (new), StepSignIn/StepSuccess/AccountSection.
- 🔁 Next prompts: Replace trueears-logo.ico with a high-res SVG/PNG when brand assets are available; the favicon link (/build/icon.ico) may also need fixing.
- 🧠 Reflection: .ico imports type-check via vite/client; quality at large sizes is bounded by the icon's largest embedded resolution.
