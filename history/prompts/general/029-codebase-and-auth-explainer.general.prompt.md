---
id: 029
title: Codebase And Auth Explainer
stage: explainer
date: 2026-06-23
surface: agent
model: claude-opus-4-8
feature: none
branch: main
user: AmmarAamir786
command: (chat) understand codebase + explain auth
labels: ["explainer","architecture","auth","oauth","onboarding"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - (read-only review; no files modified)
tests:
 - none
---

## Prompt

understand the codebase and explain the functionalitires and what we have build  in simple terms. also how does our auth work?

## Response snapshot

Explained Trueears as a context-aware desktop voice-dictation app (Tauri 2 + React 19 frontend, Rust backend, Axum auth-server, Axum payment-service). Walked through the dictation flow (Ctrl+Shift+K → Web Audio capture → Groq Whisper STT → active-window detection → app-profile match → Groq LLM formatting → clipboard auto-paste) and Select-to-Transform.

Auth: Google OAuth where the desktop app never holds the client secret. Frontend invokes `start_google_login` → `backend/src/auth.rs` starts a local server on 127.0.0.1:8585, opens browser to Google, catches the auth code, POSTs it to auth-server `/auth/google`. Auth-server exchanges code with Google (using secret), decodes ID token (userinfo fallback), upserts user in Postgres, mints its own JWT access + refresh tokens (refresh hash stored in DB), returns them. Rust stores tokens in `auth.json` file (NOT OS keychain) and emits `auth-success`; `useAuth` hook updates state + passes token to paymentService. Logout deletes file + revokes server-side.

Flagged code-vs-docs gaps: file-based token storage (not keychain), callback port 8585 (docs say 8080), API defaults to Render URL, ID-token signature not verified, refresh path is `#[allow(dead_code)]`/unwired, and the "scribe"→"Trueears" rename corrupted identifiers like `GroqService.tranTrueears`.

## Outcome

- ✅ Impact: Gave user an accurate, verified mental model of system architecture and the real auth flow.
- 🧪 Tests: none (read-only explanation).
- 📁 Files: none modified.
- 🔁 Next prompts: Possibly fix unverified ID-token signature; wire up token refresh; clean "scribe" rename scars.
- 🧠 Reflection: Reading actual source over docs surfaced several doc/code mismatches worth correcting.

## Evaluation notes (flywheel)

- Failure modes observed: Architecture doc was partly aspirational (keychain, port 8080, Tauri 1.5) vs. real code.
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Update docs/architecture/auth-system.md + overview.md to match implementation (file storage, port 8585, refresh status).
