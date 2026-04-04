---
id: 017
title: Render exit 127 auth-server
stage: general
date: 2026-04-04
surface: agent
model: GPT-5.3-Codex
feature: none
branch: fixes
user: Mega
command: Render deploy troubleshooting
labels: ["render","deployment","auth-server","ops"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - docs/DEVELOPMENT.md
 - backend/src/auth.rs
 - backend/tauri.conf.json
 - .env
 - .env.example
 - auth-server/src/config.rs
tests:
 - cargo fmt --manifest-path backend/Cargo.toml -- --check (pass)
 - cargo check --manifest-path auth-server/Cargo.toml (pass with warnings)
 - npm run vite:build (pass)
---

## Prompt

warning: struct `RefreshToken` is never constructed
  --> src/models/user.rs:18:12
Menu
   |
18 | pub struct RefreshToken {
   |            ^^^^^^^^^^^^
warning: fields `expires_in`, `token_type`, `scope`, and `refresh_token` are never read
  --> src/models/user.rs:61:9
   |
58 | pub struct GoogleTokenResponse {
   |            ------------------- fields in this struct
...
61 |     pub expires_in: i64,
   |         ^^^^^^^^^^
62 |     pub token_type: String,
   |         ^^^^^^^^^^
63 |     pub scope: String,
   |         ^^^^^
64 |     #[serde(default)]
65 |     pub refresh_token: Option<String>,
   |         ^^^^^^^^^^^^^
   |
   = note: `GoogleTokenResponse` has a derived impl for the trait `Debug`, but this is intentionally ignored during dead code analysis
warning: fields `email_verified` and `iat` are never read
  --> src/models/user.rs:74:9
   |
70 | pub struct GoogleIdTokenClaims {
   |            ------------------- fields in this struct
...
74 |     pub email_verified: bool,
   |         ^^^^^^^^^^^^^^
...
82 |     pub iat: i64,
   |         ^^^
   |
   = note: `GoogleIdTokenClaims` has a derived impl for the trait `Debug`, but this is intentionally ignored during dead code analysis
warning: `auth-server` (bin "auth-server") generated 13 warnings (run `cargo fix --bin "auth-server" -p auth-server` to apply 5 suggestions)
    Finished `release` profile [optimized] target(s) in 2m 27s
warning: the following packages contain code that will be rejected by a future version of Rust: sqlx-postgres v0.7.4
note: to see what the problems were, use the option `--future-incompat-report`, or run `cargo report future-incompatibilities --id 1`
==> Uploading build...
==> Uploaded in 19.1s. Compression took 15.1s
==> Build successful 🎉
==> Deploying...
==> Setting WEB_CONCURRENCY=1 by default, based on available CPUs in the instance
==> Exited with status 127
==> Common ways to troubleshoot your deploy: https://render.com/docs/troubleshooting-deploys
what is this erir i fpelyed on redenr

## Response snapshot

Explained that Rust compiler warnings are non-fatal and not the deploy blocker. Diagnosed Render exit status 127 as a runtime start-command issue (command/binary not found), and provided exact root directory, build command, and start command values for auth-server deployment on Render.

## Outcome

- ✅ Impact: User can distinguish harmless build warnings from fatal startup command failure.
- 🧪 Tests: Local checks already passing; deployment fix is Render service configuration.
- 📁 Files: Existing deployment-related defaults previously updated to onrender URL.
- 🔁 Next prompts: Share Render start command currently configured if failure persists.
- 🧠 Reflection: Render 127 after successful build almost always maps to a bad start command or wrong working directory.

## Evaluation notes (flywheel)

- Failure modes observed: Build logs mixed warnings with runtime failure, obscuring root cause.
- Graders run and results (PASS/FAIL): N/A for Render runtime.
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Set explicit start command to built binary path and redeploy.
