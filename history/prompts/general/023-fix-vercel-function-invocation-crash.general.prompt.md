---
id: 023
title: Fix Vercel invocation crash
stage: general
date: 2026-04-04
surface: agent
model: GPT-5.3-Codex
feature: none
branch: fixes
user: Mega
command: investigate FUNCTION_INVOCATION_FAILED on Vercel
labels: ["vercel","auth-server","runtime","bugfix"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - auth-server/src/lib.rs
tests:
 - cargo check --manifest-path auth-server/Cargo.toml (pass)
---

## Prompt

This Serverless Function has crashed.

Your connection is working correctly.

Vercel is working correctly.

500: INTERNAL_SERVER_ERROR
Code: FUNCTION_INVOCATION_FAILED
ID: sin1::fnxgd-1775307421180-7d26f0f515e6

If you are a visitor, contact the website owner or try again later.
If you are the owner, learn how to fix the error and check the logs. 
is this a pr0blem

## Response snapshot

Identified likely root cause in auth-server startup code: environment variables were being cleared before loading config, which can remove Vercel-provided secrets and cause immediate function invocation failure. Patched env loader to preserve host runtime env vars and only use .env files for fallback/override behavior. Verified compile success.

## Outcome

- ✅ Impact: Prevents Vercel runtime env variables from being wiped at function startup.
- 🧪 Tests: cargo check passed for auth-server.
- 📁 Files: auth-server/src/lib.rs updated.
- 🔁 Next prompts: Redeploy and confirm /health no longer returns FUNCTION_INVOCATION_FAILED.
- 🧠 Reflection: Platform env clearing is safe locally but breaks serverless runtimes where secrets are injected by host.

## Evaluation notes (flywheel)

- Failure modes observed: startup config panic due missing env after removal.
- Graders run and results (PASS/FAIL): cargo check PASS.
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Add startup logging for presence (not values) of required env keys in Vercel mode.
