ID: 003
TITLE: codebase-performance-audit
STAGE: misc
DATE_ISO: 2026-01-22
SURFACE: agent
MODEL: claude-opus-4-5-20251101
FEATURE: none
BRANCH: dev
USER: user
COMMAND: analyze-performance
LABELS: ["performance", "audit", "rust", "react", "tauri"]
LINKS: null
FILES_YAML:
 - frontend/src/components/RecorderOverlay.tsx
 - frontend/src/components/AudioVisualizer.tsx
 - frontend/src/hooks/useAudioRecorder.ts
 - backend/src/automation.rs
 - backend/src/installed_apps.rs
 - auth-server/src/handlers/auth.rs
TESTS_YAML: null
PROMPT_TEXT: |
  Please analyze the performance of the whole codebase (`frontend/`, `backend/`, `auth-server/`).
  Focus on:
  1. Frontend rendering performance and bundle size implications.
  2. Backend (Tauri) resource usage and IPC performance.
  3. Auth server response times and database query efficiency (look for N+1 issues or unoptimized queries).
  4. Critical bottlenecks.

  Provide a report on performance risks and optimization opportunities.
RESPONSE_TEXT: |
  Comprehensive performance audit identifying critical bottlenecks in frontend IPC polling, backend synchronous file walking, and audio visualization resource churn.
