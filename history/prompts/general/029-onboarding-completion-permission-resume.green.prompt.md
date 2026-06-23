---
id: 029
title: Onboarding completion race, mic-block recovery, progress resume
stage: green
date: 2026-06-23
surface: agent
model: claude-opus-4-8
feature: none
branch: fix/onboarding-shortcut-order-detection
user: devvshayan@gmail.com
command: general
labels: ["onboarding", "bugfix", "permissions", "ux", "tauri"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - frontend/src/components/onboarding/OnboardingWizard.tsx
  - frontend/src/components/onboarding/StepPermissions.tsx
tests:
  - npx tsc --noEmit -p frontend/tsconfig.json (exit 0)
---

## Prompt

do 1 3 and 4

(From an onboarding UX review: #1 finishing onboarding can loop back to step 1;
#3 denying the mic permission is a dead-end; #4 closing mid-onboarding restarts
from step 1.)

## Response snapshot

**#1 — Completion race (OnboardingWizard.tsx).** `handleFinish` called the async
`markOnboardingComplete()` without awaiting, then `window.location.reload()`, so
the reload could race the store write and re-show onboarding. Made `handleFinish`
async, `await`s persistence before reload, reloads in `finally` so a transient
error can't strand the user on the success screen.

**#4 — Progress resume (OnboardingWizard.tsx).** Persist the current step to
`Trueears_ONBOARDING_STEP` as the user advances and restore it on mount, so closing
the app mid-flow resumes where they left off. Resume/persist only engage for a fresh
run (no explicit `initialStep`); the permissions-recovery entry (`initialStep =
'permissions'`) is untouched. Added a hydration gate to avoid flashing step 1, and
the resume key is cleared on finish. Required changing the `initialStep` prop from a
defaulted value to a true optional so "fresh" vs "explicit step" is distinguishable.

**#3 — Mic-permission dead-end (StepPermissions.tsx).** Once denied, the OS won't
re-prompt, leaving the user stuck with Continue disabled. Added a `blocked` state
(set on `NotAllowedError` and on an initial `permissions.query` === 'denied'), a
platform-aware recovery panel with exact re-enable steps, a best-effort "Open
microphone settings" deep-link (`ms-settings:privacy-microphone` /
`x-apple.systempreferences:…`), and relabeled the button to "Try Again".

## Outcome

- ✅ Impact: No more finish-then-restart loop; mid-onboarding progress survives restart; denied-mic users have a guided recovery path.
- 🧪 Tests: tsc --noEmit PASS. Runtime behavior still needs manual verification on Windows.
- 📁 Files: OnboardingWizard.tsx, StepPermissions.tsx
- 🔁 Next prompts: Verify resume across an app restart; verify the mic-settings deep-link opens on Windows.
- 🧠 Reflection: Async persistence before a hard reload must be awaited; permission denials need an explicit recovery path because the OS prompt is one-shot.
