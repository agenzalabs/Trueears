# Development Guide

Local development setup, code conventions, and contribution workflow.

## Prerequisites

- Node.js v18+
- Rust (latest stable)
- Visual Studio Build Tools (Windows only)

## Project Structure

```
scribe/
├── frontend/           # React TypeScript frontend
│   ├── src/
│   │   ├── components/ # React UI components
│   │   ├── hooks/      # Custom React hooks
│   │   ├── services/   # External API integrations
│   │   ├── controllers/# Business logic orchestration
│   │   ├── types/      # TypeScript type definitions
│   │   └── utils/      # Pure utility functions
│   └── vite.config.ts
├── backend/            # Tauri Rust backend
│   ├── src/
│   │   ├── main.rs     # Entry point
│   │   ├── lib.rs      # Tauri commands
│   │   ├── automation.rs
│   │   ├── shortcuts.rs
│   │   └── window.rs
│   └── tauri.conf.json
├── auth-server/        # Standalone auth server
│   ├── src/
│   └── migrations/
├── specs/              # Feature specifications (SDD workflow)
└── docs/               # Documentation
```

## Development Workflow

### Running Locally

```bash
# Install dependencies
npm install

# Start development (with hot-reload)
npm run dev

# Build for production
npm run build
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Tauri dev mode with hot-reload |
| `npm run build` | Build production bundle |
| `npm run vite:dev` | Start frontend dev server only |
| `npm run vite:build` | Build frontend only |
| `npm run sync-version` | Sync version across package.json and tauri.conf.json |

## Code Conventions

### TypeScript/React

- **Strict mode enabled** - No `any` types except justified exceptions
- **Functional components** - No class components
- **Custom hooks** for reusable stateful logic
- **Services** for API calls, **Controllers** for business orchestration
- **Explicit return types** on all exported functions

```typescript
// Good: Explicit types, functional style
export function useAudioRecorder(): AudioRecorderHook {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  // ...
}

// Bad: Implicit any, no return type
export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  // ...
}
```

### Rust

- Follow Rust 2021 edition idioms
- Use `Result<T, E>` for fallible operations
- Validate Tauri command inputs before processing
- Prefer async/await for I/O operations

```rust
// Good: Result type, input validation
#[tauri::command]
async fn transcribe_audio(audio_data: Vec<u8>) -> Result<String, String> {
    if audio_data.is_empty() {
        return Err("Empty audio data".to_string());
    }
    // ...
}

// Bad: Panics on error
#[tauri::command]
fn transcribe_audio(audio_data: Vec<u8>) -> String {
    assert!(!audio_data.is_empty()); // Will panic!
    // ...
}
```

### Architecture Layers

Imports must flow downward only:

```
UI Components
     ↓
   Hooks
     ↓
 Services / Controllers
     ↓
   Backend (Tauri)
```

**Never** import UI components from services or controllers.

## Testing

### Test Structure

- **Unit tests** for business logic (services, controllers, hooks)
- **Integration tests** for user journeys (recording → transcription → paste)
- **Contract tests** for external APIs (Groq Whisper, LLM endpoints)

### Running Tests

```bash
# Frontend tests
cd frontend && npm test

# Rust tests
cd backend && cargo test
```

## Version Management

Version is maintained in `package.json` and synced to `tauri.conf.json`:

```bash
# After updating package.json version
npm run sync-version
```

## Performance Budgets

| Metric | Target |
|--------|--------|
| Cold start to ready | < 2 seconds |
| Hotkey to recording | < 100ms |
| Transcription display | < 3 seconds |
| Idle memory | < 50MB |
| Recording memory | < 150MB |
| Bundle size | < 25MB |

## Security Guidelines

- **API keys**: Use `@tauri-apps/plugin-store`, never localStorage
- **Audio buffers**: Clear after transcription completes
- **Clipboard**: Read only on user action, write only final output
- **LLM prompts**: Include injection-prevention instructions

## Git Workflow

1. Create feature branch from `main`
2. Make changes with small, testable commits
3. Write/update tests
4. Open PR with description of changes
5. Address review feedback
6. Merge after approval

### Commit Convention

```
type(scope): description

feat(frontend): add dark mode toggle
fix(backend): resolve clipboard race condition
docs(readme): update installation instructions
```

## Related Documentation

- [Architecture Overview](../architecture/overview.md)
- [Deployment Guide](./deployment.md)
- [Constitution](../../.specify/memory/constitution.md) - Project principles
