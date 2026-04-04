---
id: 022
title: Add Vercel Rust runtime auth-server
stage: general
date: 2026-04-04
surface: agent
model: GPT-5.3-Codex
feature: none
branch: fixes
user: Mega
command: implement vercel rust runtime support
labels: ["vercel","rust-runtime","auth-server","deployment"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - auth-server/Cargo.toml
 - auth-server/src/lib.rs
 - auth-server/src/main.rs
 - auth-server/api/auth.rs
 - auth-server/vercel.json
 - auth-server/README.md
tests:
 - cargo check --manifest-path auth-server/Cargo.toml (pass)
 - cargo fmt --manifest-path auth-server/Cargo.toml (pass)
---

## Prompt

https://vercel.com/docs/functions/runtimes/rust
can you modify accordsinjg to this so i can deploy to vercel

## Response snapshot

Implemented Vercel Rust runtime support for auth-server by adding a dedicated serverless handler binary in api/auth.rs, introducing vercel_runtime integration in Cargo.toml, extracting reusable app-building logic into src/lib.rs, keeping local server mode in src/main.rs, adding vercel.json rewrite routing, and documenting Vercel deployment settings in README.

## Outcome

- ✅ Impact: auth-server now supports both local Axum server execution and Vercel Rust serverless deployment.
- 🧪 Tests: cargo check and cargo fmt passed for auth-server.
- 📁 Files: Added Vercel handler/config and refactored shared app initialization.
- 🔁 Next prompts: Deploy auth-server directory to Vercel and verify /health and /auth/google endpoints.
- 🧠 Reflection: Vercel runtime compatibility required aligning Axum/tower stack with vercel_runtime expectations.

## Evaluation notes (flywheel)

- Failure modes observed: Initial compile failed due VercelLayer trait mismatch with prior Axum/Tower versions.
- Graders run and results (PASS/FAIL): cargo check PASS, cargo fmt PASS.
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Add a short CI job that validates the auth-vercel binary build path.
