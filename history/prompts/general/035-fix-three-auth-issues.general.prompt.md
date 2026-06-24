---
id: 035
title: Fix Three Auth Issues
stage: green
date: 2026-06-23
surface: agent
model: claude-opus-4-8
feature: none
branch: main
user: AmmarAamir786
command: (chat) implement all three auth fixes (1, 2, 3a+3b)
labels: ["auth","security","oauth","jwt","cold-start","tauri","axum"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - auth-server/src/handlers/auth.rs (ID-token signature verification via JWKS; DB-write retries)
 - auth-server/src/db.rs (acquire_timeout; ping helper)
 - auth-server/src/lib.rs (/ready route + readiness_check)
 - backend/src/auth.rs (refresh wiring; jwt_exp/token_expired/ensure_fresh_access_token; expiry-aware get_auth_state; exchange retry+timeout in all builds; /ready pre-warm)
 - backend/src/lib.rs (get_valid_access_token + refresh_auth_token commands; registered)
 - frontend/src/services/authService.ts (getValidAccessToken, refreshToken)
 - frontend/src/hooks/useAuth.ts (use getValidAccessToken on load)
 - frontend/src/services/paymentService.ts (authedFetch w/ 401 refresh+retry; routed all protected calls)
tests:
 - frontend `tsc --noEmit`: PASS (clean)
 - auth-server `cargo check` (MSVC, stable 1.96): PASS exit 0 (3 pre-existing warnings, none from this change)
 - backend `cargo check` (MSVC, stable 1.96): PASS exit 0 (no warnings)
 - Note: required installing Rust + VS Build Tools (VC.Tools + Win11 SDK) on this machine first; not yet run-tested via `npm run dev`
---

## Prompt

so now we have three issues identified i say lets fix all three and the question youre asking i say lets do bith a and b for this 3rd fix

## Response snapshot

Implemented all three:

Issue 1 (signature verification): Replaced auth-server decode_id_token with async JWKS verification — decode_header to get kid, fetch https://www.googleapis.com/oauth2/v3/certs (JwkSet), DecodingKey::from_jwk, decode::<GoogleIdTokenClaims> with Validation RS256 + set_audience(client_id) + set_issuer(accounts.google.com). google_auth call now .await. jsonwebtoken 9.3.1 confirmed.

Issue 2 (token refresh + expiry): backend/src/auth.rs — removed #[allow(dead_code)] from refresh_tokens; added jwt_exp/now_unix/token_expired (decode JWT exp without sig) and ensure_fresh_access_token (refresh if expired w/ 60s leeway); rewrote get_auth_state to require valid access OR valid refresh token. New Tauri commands get_valid_access_token + refresh_auth_token (registered). Frontend: authService.getValidAccessToken/refreshToken; useAuth uses getValidAccessToken on load; paymentService.authedFetch refreshes on 401 and retries once (all protected calls routed through it).

Issue 3a (desktop cold-start): exchange_code_for_tokens now uses reqwest builder w/ 30s timeout and retries transient 5xx/network errors (MAX_ATTEMPTS=3, 750ms*n backoff) in ALL builds; 4xx returns immediately (consumed code). start_google_oauth fires best-effort GET <api_url>/ready to pre-warm server+DB while user is on consent screen.

Issue 3b (server cold-start): db.rs acquire_timeout(30s) + ping(); lib.rs /ready route (readiness_check pings DB); google_auth retries upsert_user and store_refresh_token (2 retries, 500ms*n) to tolerate cold Neon.

## Outcome

- ✅ Impact: Forged ID tokens now rejected; sessions auto-refresh for 30 days instead of breaking at 15 min; first-sign-in-after-idle should succeed (server pre-warm + DB retries + acquire_timeout, plus desktop retry).
- 🧪 Tests: Compile-checks PASS — frontend tsc clean; auth-server + backend `cargo check` exit 0 under MSVC (installed Rust + VS Build Tools to do it). Not yet run-tested via `npm run dev`.
- 📁 Files: 8 files across auth-server, backend, frontend.
- 🔁 Next prompts: run builds; deploy auth-server (Render+Vercel share build_app_from_env so /ready is on both); consider caching Google JWKS; bump version when building per CLAUDE.md.
- 🧠 Reflection: 4xx-vs-5xx retry distinction matters (single-use code); the DB-after-Google-exchange failure can only be fixed server-side, which is why 3b is essential alongside 3a.

## Evaluation notes (flywheel)

- Failure modes observed: env lacks toolchains -> no local compile verification.
- Graders run and results (PASS/FAIL): N/A (not compiled)
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): cache JWKS in AppState with TTL to drop the per-login certs fetch.
