---
id: 019
title: Render no such file start command
stage: general
date: 2026-04-04
surface: agent
model: GPT-5.3-Codex
feature: none
branch: fixes
user: Mega
command: Render deploy troubleshooting
labels: ["render","deployment","auth-server","start-command"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - auth-server/src/config.rs
 - history/prompts/general/019-render-no-such-file-start-command.general.prompt.md
tests:
 - cargo check --manifest-path auth-server/Cargo.toml (pass with warnings)
---

## Prompt

==> Uploaded in 18.3s. Compression took 11.6s
==> Build successful 🎉
Menu
==> Deploying...
==> Setting WEB_CONCURRENCY=1 by default, based on available CPUs in the instance
==> Running './auth-server/target/release/auth-server'
bash: line 1: ./auth-server/target/release/auth-server: No such file or directory
==> Exited with status 127
==> Common ways to troubleshoot your deploy: https://render.com/docs/troubleshooting-deploys

## Response snapshot

Diagnosed status 127 as an incorrect relative binary path for the Render start command. Recommended the correct start command for auth-server root-directory mode and added a code hardening update so auth-server reads Render PORT automatically.

## Outcome

- ✅ Impact: Correct startup command path identified; service should start instead of exiting 127.
- 🧪 Tests: auth-server compiles successfully after PORT fallback change.
- 📁 Files: Updated auth-server config to prefer PORT, plus this prompt record.
- 🔁 Next prompts: Re-deploy with corrected start command and verify health checks pass.
- 🧠 Reflection: Monorepo root-directory settings directly determine relative path used in start command.

## Evaluation notes (flywheel)

- Failure modes observed: Binary path included an extra folder segment relative to Render working directory.
- Graders run and results (PASS/FAIL): cargo check PASS.
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Set Root Directory + Start Command pair explicitly and deploy.
