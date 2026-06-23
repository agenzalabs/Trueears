---
id: 030
title: Fix Auth Architecture Docs
stage: general
date: 2026-06-23
surface: agent
model: claude-opus-4-8
feature: none
branch: main
user: AmmarAamir786
command: (chat) fix docs to match code, verify first
labels: ["docs","architecture","auth","accuracy"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - docs/architecture/auth-system.md (rewritten as as-built)
 - docs/architecture/overview.md (tech-stack + security section corrected)
tests:
 - none (documentation only)
---

## Prompt

yes fix the docs but verify again from code, i dont want to make the docs wrong

## Response snapshot

Re-verified every claim against source before editing: auth-server/src/{lib.rs,config.rs,handlers/auth.rs}, migrations/001_create_users.sql, backend/Cargo.toml, backend/src/auth.rs, frontend groqService/groqChatService, auth-server/Cargo.toml.

Verified facts: Axum 0.8 (not 0.7), Tauri 2.9.2, Vite 8, TS 5.9; tokens stored in plaintext `auth.json` (keyring crate declared but UNUSED — only a comment references it); real routes are POST /auth/google, /auth/refresh, /auth/logout, GET /auth/user, GET /health (no /user/profile); desktop API_URL default https://trueears-1.onrender.com with :3001 debug fallback; callback server 127.0.0.1:8585, 5-min timeout; ID-token signature NOT verified (only iss/aud/exp); refresh_tokens() is dead code; get_auth_state checks token presence not expiry; access JWT 900s / refresh 2592000s; frontend calls Groq STT+chat endpoints directly.

Rewrote docs/architecture/auth-system.md as an accurate "As-Built" doc (components, flow, token model, storage, commands, API table, DB schema, config tables, security + explicit Known Gaps). Surgically corrected docs/architecture/overview.md tech-stack versions and the Security Architecture diagram/principles (file storage instead of keychain) + added pointer to known gaps.

## Outcome

- ✅ Impact: Architecture docs now match the implementation; removed misleading claims (keychain, port 8080, Axum 0.7, /user/profile, Tauri 1.5).
- 🧪 Tests: none (docs only).
- 📁 Files: docs/architecture/auth-system.md, docs/architecture/overview.md.
- 🔁 Next prompts: optionally implement the two known gaps (ID-token signature verification, wire token refresh + fix get_auth_state expiry check).
- 🧠 Reflection: User explicitly required re-verification; reading source first caught extra errors (Axum 0.8, /user/profile non-existent, keyring unused).

## Evaluation notes (flywheel)

- Failure modes observed: Prior doc was an aspirational design draft, not as-built; several specifics were wrong.
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Add a CI doc-lint or periodic "docs vs code" check to prevent drift.
