<!--
============================================================================
SYNC IMPACT REPORT
============================================================================
Version Change: 1.0.0 → 1.1.0 (MINOR - added auth-server component)

Modified Principles: N/A

Added Sections:
  - Auth Server stack in Technology Stack table
  - Auth Server file organization
  - SEC-007 through SEC-010 (auth-server security requirements)
  - PERF-007 (auth-server API latency)
  - REL-004, REL-005 (auth-server reliability)

Removed Sections: N/A

Templates Requiring Updates:
  - .specify/templates/plan-template.md: ✅ Compatible (Constitution Check section ready)
  - .specify/templates/spec-template.md: ✅ Compatible (no constitution-specific refs)
  - .specify/templates/tasks-template.md: ✅ Compatible (supports TDD workflow)

Follow-up TODOs: None
============================================================================
-->

# Scribe Constitution

## Core Principles

### I. Simplicity & Speed First

Every feature MUST prioritize lightweight implementation and fast user experience.
Scribe is a **desktop dictation tool** that MUST remain fast, responsive, and resource-efficient.

- Bundle size MUST stay under 25MB
- UI interactions MUST respond within 100ms
- Memory footprint MUST stay under 150MB during operation
- Prefer native platform APIs over heavy abstractions
- YAGNI: Do NOT implement features until explicitly needed

**Rationale**: Users expect dictation tools to be instant and unobtrusive. A slow or bloated app defeats the purpose of voice-to-text productivity.

### II. Test-First Development (NON-NEGOTIABLE)

TDD is mandatory for all feature development. Tests MUST be written and failing before implementation.

- Red-Green-Refactor cycle strictly enforced
- Unit tests for business logic (services, controllers, hooks)
- Integration tests for user journeys (recording → transcription → paste)
- Contract tests for external APIs (Groq Whisper, LLM endpoints)
- No PR may be merged without corresponding test coverage

**Rationale**: AI-powered applications have complex state flows. Without TDD, regressions in transcription accuracy or clipboard handling become invisible until user complaints.

### III. Type Safety & Explicit Contracts

TypeScript strict mode is mandatory. All data boundaries MUST have explicit types.

- Frontend: TypeScript with `strict: true`, no `any` types except justified exceptions
- Backend: Rust's type system enforces safety at compile time
- API boundaries: Explicit interface definitions for Tauri commands
- External APIs: Type definitions for Groq API responses

**Rationale**: Voice dictation involves audio blobs, API responses, clipboard data, and window metadata. Type safety prevents silent data corruption across these boundaries.

### IV. Clean Architecture Separation

Maintain strict separation between layers: UI → Hooks → Services → Backend.

- **UI Components**: Presentation only, no business logic
- **Hooks**: State management and orchestration
- **Services**: External API calls and data transformation
- **Controllers**: Complex business logic coordination
- **Backend (Rust)**: Platform APIs, system integration, security-critical operations

Cross-layer imports MUST flow downward only (UI → Services, not Services → UI).

**Rationale**: Desktop apps with multiple windows (overlay, settings) share state. Clean architecture prevents spaghetti dependencies and enables independent testing.

### V. Security-Conscious Development

Handle API keys, user audio, and clipboard data with care.

- API keys MUST use secure storage (`@tauri-apps/plugin-store`), never localStorage for secrets
- Audio recordings MUST NOT be persisted beyond the current transcription session
- Clipboard access MUST be minimal and explicit (read only when selection detected, write only final output)
- No telemetry or analytics without explicit user consent
- LLM prompts MUST prevent injection attacks via user-spoken content

**Rationale**: Dictation apps have privileged access to microphone, clipboard, and keyboard. Users trust Scribe with sensitive data; that trust MUST be honored.

### VI. Platform-Native Experience

Leverage Tauri and native platform capabilities over web workarounds.

- Use Rust backend for: global shortcuts, window detection, clipboard, keyboard simulation
- Use Web APIs for: audio recording, UI rendering, settings storage
- Respect platform conventions (Windows Win32 APIs, future macOS/Linux support)
- Overlay window MUST be non-intrusive and respect window manager behavior

**Rationale**: Electron-like bloat is explicitly rejected. Tauri was chosen for its native integration; this choice MUST be honored in all features.

### VII. Incremental & Reversible Changes

All changes MUST be small, testable, and reversible.

- PRs SHOULD touch fewer than 5 files when possible
- Large features MUST be broken into independently deployable increments
- Database/schema changes MUST include rollback migrations
- Feature flags for experimental functionality
- No "big bang" refactors without explicit approval

**Rationale**: A voice dictation tool is productivity software. Users cannot afford downtime from broken releases. Incremental delivery reduces blast radius.

## Technology Stack & Code Standards

### Stack Requirements

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | React | 19.x |
| Language | TypeScript | 5.8+ (strict mode) |
| Styling | TailwindCSS | 4.x |
| Build | Vite | 6.x |
| Desktop Backend | Tauri (Rust) | 2.x |
| Auth Server | Axum (Rust) | 0.7.x |
| Auth Database | PostgreSQL | 14+ |
| Auth Tokens | JWT (jsonwebtoken) | 9.x |
| AI - STT | Groq Whisper API | whisper-large-v3-turbo |
| AI - LLM | Groq Chat API | Configurable |

### Code Conventions

**TypeScript/React**:
- Functional components with hooks (no class components)
- Custom hooks for reusable stateful logic (`useAudioRecorder`, `useDictation`)
- Services for API calls, controllers for business orchestration
- Explicit return types on all exported functions

**Rust**:
- Follow Rust 2021 edition idioms
- Use `Result<T, E>` for fallible operations, never panic in production paths
- Tauri commands MUST validate inputs before processing
- Prefer async/await for I/O operations

**File Organization**:
```
frontend/src/
├── components/     # React UI components
├── hooks/          # Custom React hooks
├── services/       # External API integrations
├── controllers/    # Business logic orchestration
├── types/          # TypeScript type definitions
└── utils/          # Pure utility functions

backend/src/
├── main.rs         # Tauri entry point
├── lib.rs          # Core app logic and commands
├── automation.rs   # Keyboard & clipboard
├── shortcuts.rs    # Global hotkey handling
└── window.rs       # Active window detection

auth-server/src/
├── main.rs         # Axum server entry point
├── config.rs       # Environment configuration
├── db.rs           # Database connection pool
├── handlers/       # HTTP route handlers
│   ├── auth.rs     # OAuth & token endpoints
│   └── user.rs     # User management endpoints
├── middleware/     # Request middleware
│   └── auth_middleware.rs  # JWT validation
├── models/         # Database models
│   └── user.rs     # User entity
└── utils/          # Utilities
    └── jwt.rs      # Token generation/validation

auth-server/migrations/  # SQLx migrations (PostgreSQL)
```

## Security & Performance

### Security Requirements

- **SEC-001**: API keys MUST be stored via Tauri's secure store plugin, not localStorage
- **SEC-002**: Audio buffers MUST be cleared from memory after transcription completes
- **SEC-003**: Clipboard read operations MUST only occur when user initiates select-to-transform
- **SEC-004**: LLM system prompts MUST include injection-prevention instructions
- **SEC-005**: No network requests except to configured AI endpoints and auth-server
- **SEC-006**: Settings window MUST mask API key inputs
- **SEC-007**: Auth server MUST use HTTPS in production (TLS termination at load balancer acceptable)
- **SEC-008**: JWT secrets MUST be loaded from environment variables, never hardcoded
- **SEC-009**: Passwords MUST be hashed with SHA-256 minimum (bcrypt/argon2 preferred)
- **SEC-010**: OAuth tokens from Google MUST be validated server-side before trusting claims
- **SEC-011**: Database credentials MUST use environment variables via `dotenvy`

### Performance Budgets

- **PERF-001**: Cold start to ready state: <2 seconds
- **PERF-002**: Hotkey response to recording start: <100ms
- **PERF-003**: Transcription display after recording stops: <3 seconds (network dependent)
- **PERF-004**: Memory during idle: <50MB
- **PERF-005**: Memory during recording: <150MB
- **PERF-006**: Bundle size: <25MB
- **PERF-007**: Auth server API response time: p95 <200ms for token validation, <500ms for OAuth flows

### Reliability Targets

- **REL-001**: Graceful degradation when AI APIs are unavailable (show raw transcription)
- **REL-002**: No data loss if app crashes during transcription (retry on restart not required, but no corruption)
- **REL-003**: Settings MUST persist across app restarts
- **REL-004**: Auth server MUST handle database connection failures gracefully (retry with backoff)
- **REL-005**: Desktop app MUST function offline (local dictation) when auth-server is unreachable

## Governance

### Amendment Process

1. Proposed changes MUST be documented in a PR with rationale
2. Changes to NON-NEGOTIABLE principles require explicit justification
3. All amendments MUST update the version and `Last Amended` date
4. Breaking changes to principles require MAJOR version bump

### Version Policy

- **MAJOR**: Principle removal, redefinition, or backward-incompatible governance change
- **MINOR**: New principle added, section expanded, or materially new guidance
- **PATCH**: Wording clarifications, typo fixes, non-semantic refinements

### Compliance

- All PRs MUST verify compliance with Core Principles
- Code reviews SHOULD reference relevant principles when approving/rejecting
- Violations of NON-NEGOTIABLE principles block merge
- Use `.specify/memory/constitution.md` as the authoritative source

**Version**: 1.1.0 | **Ratified**: 2025-12-24 | **Last Amended**: 2025-12-24
