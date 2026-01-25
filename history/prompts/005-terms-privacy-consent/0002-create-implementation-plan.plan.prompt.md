---
id: "0002"
title: "Create Implementation Plan"
stage: plan
date: 2026-01-16
surface: agent
model: claude-opus-4-5-20251101
feature: 005-terms-privacy-consent
branch: 005-terms-privacy-consent
user: devv-shayan
command: /sp.plan
labels: ["planning", "architecture", "consent", "legal", "design"]
links:
  spec: specs/005-terms-privacy-consent/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/005-terms-privacy-consent/plan.md
  - specs/005-terms-privacy-consent/research.md
  - specs/005-terms-privacy-consent/data-model.md
  - specs/005-terms-privacy-consent/quickstart.md
  - specs/005-terms-privacy-consent/contracts/typescript-interfaces.ts
tests:
  - null
---

## Prompt

User triggered `/sp.plan` after approving the specification for Terms of Service & Privacy Consent feature. The command executes the implementation planning workflow to generate design artifacts.

## Response snapshot

Generated comprehensive implementation plan with:

**Phase 0 - Research (research.md)**:
- R1: Storage pattern - Use existing Tauri secure store
- R2: First-run detection - Follow Trueears_ONBOARDING_COMPLETE pattern
- R3: Document bundling - Vite raw imports for markdown
- R4: Version comparison - Semantic versioning with major-only re-consent
- R5: UI patterns - Full-screen modal, theme-aware
- R6: Testing - Vitest + Playwright
- R7: Accessibility requirements

**Phase 1 - Design Artifacts**:
- data-model.md: ConsentRecord entity, state transitions, validation rules
- contracts/typescript-interfaces.ts: Full TypeScript contracts for hooks, components, services
- quickstart.md: Developer guide for implementation

**Key Design Decisions**:
- D1: Consent check BEFORE onboarding in SettingsWindow
- D2: Markdown documents bundled via Vite raw imports
- D3: Major version bumps trigger re-consent
- D4: 5 new store keys (STATUS, TIMESTAMP, TERMS_VERSION, PRIVACY_VERSION, APP_VERSION)
- D5: Full-screen blocking modal UI

**Constitution Check**: All 7 principles pass (⚠️ Principle VII requires splitting into 3 PRs)

## Outcome

- Impact: Complete implementation plan ready for task generation
- Tests: Testing strategy defined (Vitest unit, Playwright E2E)
- Files: 5 files created in specs/005-terms-privacy-consent/
- Next prompts: /sp.tasks to generate implementation tasks
- Reflection: Exploration agent provided excellent codebase context, enabling accurate design decisions

## Evaluation notes (flywheel)

- Failure modes observed: None
- Graders run and results (PASS/FAIL): Constitution Check - 6 PASS, 1 WARNING (mitigated by PR split)
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Proceed to /sp.tasks for task breakdown
