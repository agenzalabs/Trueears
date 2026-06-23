---
id: 031
title: Verify Other Docs Auth Contradictions
stage: general
date: 2026-06-23
surface: agent
model: claude-opus-4-8
feature: none
branch: main
user: AmmarAamir786
command: (chat) verify other docs for auth contradictions
labels: ["docs","auth","accuracy","verification"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - docs/ARCHITECTURE.md (keyring -> file storage, 2 spots)
 - docs/reference/tauri-commands.md (token storage + GOOGLE_CLIENT_ID requirement)
 - docs/DEVELOPMENT.md (API_URL default + stale GOOGLE_CLIENT_ID error entry)
 - docs/troubleshooting/faq.md (API-key storage claim)
tests:
 - none (documentation only)
---

## Prompt

verify the other docs for auth contradictions

## Response snapshot

Grepped all docs for auth/storage/version terms. Verified findings against code (lib.rs store impl, auth.rs, config.rs).

Contradictions found and fixed:
- docs/ARCHITECTURE.md: "Auth (OAuth/keyring)" box label and "token storage via OS keyring" -> file storage (auth.json). keyring crate is declared but unused.
- docs/reference/tauri-commands.md: "Stores tokens in secure storage" -> local auth.json file; "Requires GOOGLE_CLIENT_ID env var" -> corrected (public client ID baked in; env var only overrides; secret only on auth-server).
- docs/DEVELOPMENT.md: API_URL default trueears.onrender.com -> trueears-1.onrender.com (matches desktop default in auth.rs); rewrote stale "Missing GOOGLE_CLIENT_ID error" entry (no longer occurs due to baked-in default) into a "Google sign-in fails" troubleshooting entry (port 8585 callback, API_URL).
- docs/troubleshooting/faq.md: API-key storage claim said OS credential manager / never plaintext -- FALSE. Tauri Store plugin writes plaintext settings.json in app data dir. Corrected (verified app.store("settings.json") in lib.rs).

Verified-correct (no change): docs/guides/getting-started.md, docs/guides/deployment.md (only Apple signing), docs/README.md (link only), DEVELOPMENT.md line 201 (already correct about settings.json).

## Outcome

- ✅ Impact: All auth/storage statements across docs now match the code; removed keychain/keyring myths and a stale troubleshooting entry.
- 🧪 Tests: none (docs only).
- 📁 Files: ARCHITECTURE.md, reference/tauri-commands.md, DEVELOPMENT.md, troubleshooting/faq.md.
- 🔁 Next prompts: optional commit of docs changes (029-031 PHRs + 6 doc files); implement the two known auth gaps.
- 🧠 Reflection: faq.md API-key claim was the most dangerous (security over-promise); store plugin is plaintext, not OS keychain.

## Evaluation notes (flywheel)

- Failure modes observed: Repeated "secure/keychain" storage over-claims across multiple docs; one stale error entry; one wrong onrender subdomain.
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Add a docs/code consistency check (grep guard for "keychain"/"keyring" storage claims) to CI.
