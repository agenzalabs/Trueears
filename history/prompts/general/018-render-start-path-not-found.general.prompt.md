---
id: 018
title: Render start path not found
stage: general
date: 2026-04-04
surface: agent
model: GPT-5.3-Codex
feature: none
branch: fixes
user: Mega
command: Render deploy troubleshooting
labels: ["render","deployment","auth-server"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - history/prompts/general/018-render-start-path-not-found.general.prompt.md
tests:
 - none
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

Diagnosed Render status 127 as an incorrect start command path. Recommended using the binary path relative to the configured Root Directory and provided exact command combinations for both root-directory modes.

## Outcome

- ✅ Impact: Clarified why Render cannot find executable and how to fix it.
- 🧪 Tests: Not run (Render configuration fix).
- 📁 Files: Prompt history only.
- 🔁 Next prompts: Confirm Render Root Directory value and start command update.
- 🧠 Reflection: In monorepos, start command path must match the selected service root.

## Evaluation notes (flywheel)

- Failure modes observed: Service built successfully but runtime command referenced a non-existent nested path.
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Set root directory + start command pair explicitly and redeploy.
