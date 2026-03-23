# Contributing to Trueears

Thank you for your interest in contributing to Trueears! This guide will help you get started.

## Quick Links

- [Development Setup](#development-setup)
- [Code Conventions](#code-conventions)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)

---

## Development Setup

### Prerequisites

| Requirement | Version | Installation |
|-------------|---------|--------------|
| Node.js | v18+ | [nodejs.org](https://nodejs.org/) |
| Rust | Latest stable | [rustup.rs](https://rustup.rs/) |
| Visual Studio Build Tools | 2019+ | Windows only |

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd Trueears

# Install dependencies
npm install

# Start development mode
npm run dev
```

For detailed setup instructions, see [Development Guide](docs/guides/development.md).

---

## Code Conventions

### TypeScript/React

- **Strict mode** - No `any` types without justification
- **Functional components** - No class components
- **Custom hooks** - Extract reusable stateful logic
- **Explicit return types** - On all exported functions

```typescript
// Good
export function useAudioRecorder(): AudioRecorderHook {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  // ...
}

// Avoid
export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  // ...
}
```

### Rust

- Use `Result<T, E>` for fallible operations (no panics)
- Validate inputs before processing
- Use async/await for I/O operations

```rust
// Good
#[tauri::command]
async fn tranTrueears_audio(audio_data: Vec<u8>) -> Result<String, String> {
    if audio_data.is_empty() {
        return Err("Empty audio data".to_string());
    }
    // ...
}

// Avoid
#[tauri::command]
fn tranTrueears_audio(audio_data: Vec<u8>) -> String {
    assert!(!audio_data.is_empty()); // Will panic!
    // ...
}
```

### Architecture

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

Never import UI components from services or controllers.

---

## Commit Messages

Use conventional commits:

```
type(scope): description

feat(frontend): add dark mode toggle
fix(backend): resolve clipboard race condition
docs(readme): update installation instructions
refactor(hooks): extract audio logic to separate hook
test(services): add groq service unit tests
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or updating tests |
| `chore` | Build process, tooling, dependencies |

---

## Pull Request Process

### 1. Create a Branch

```bash
git checkout -b feat/your-feature-name
```

Use prefixes: `feat/`, `fix/`, `docs/`, `refactor/`

### 2. Make Changes

- Keep changes focused and atomic
- Write/update tests for new functionality
- Follow code conventions

### 3. Test Locally

```bash
# Run Rust/Tauri tests
cd backend && cargo test

# Run server tests
cd ../auth-server && cargo test
cd ../payment-service && cargo test

# Build for production
cd ..
npm run build
```

### 4. Submit PR

Include in your PR description:

- **What**: Brief description of changes
- **Why**: Motivation or issue reference
- **How**: Implementation approach (if non-obvious)
- **Testing**: How you tested the changes

### 5. Address Feedback

- Respond to review comments
- Push additional commits to address feedback
- Request re-review when ready

---

## Issue Guidelines

### Reporting Bugs

Include:

1. **Trueears version** (`Settings > About`)
2. **Operating system** and version
3. **Steps to reproduce**
4. **Expected vs actual behavior**
5. **Console errors** (F12 in dev mode)
6. **Screenshots** if relevant

### Feature Requests

Include:

1. **Problem statement** - What problem does this solve?
2. **Proposed solution** - How should it work?
3. **Alternatives considered** - Other approaches you've thought of
4. **Use cases** - Who benefits and how?

---

## Project Structure

```
Trueears/
├── frontend/           # React TypeScript UI
│   ├── src/
│   │   ├── components/ # UI components
│   │   ├── hooks/      # Custom React hooks
│   │   ├── services/   # API integrations
│   │   ├── controllers/# Business logic
│   │   └── types/      # TypeScript types
│   └── vite.config.ts
├── backend/            # Tauri Rust backend
│   ├── src/
│   │   ├── lib.rs      # Tauri commands
│   │   ├── automation.rs
│   │   ├── shortcuts.rs
│   │   └── window.rs
│   └── tauri.conf.json
├── auth-server/        # OAuth server
├── docs/               # Documentation
└── specs/              # Feature specifications
```

---

## Spec-Driven Development

Trueears follows a spec-driven development workflow:

1. **Specification** (`specs/<feature>/spec.md`) - Define requirements
2. **Plan** (`specs/<feature>/plan.md`) - Architecture decisions
3. **Tasks** (`specs/<feature>/tasks.md`) - Implementation tasks
4. **Implementation** - Write code with tests
5. **Review** - PR and code review

For new features, consider starting with a spec to align on requirements.

---

## Performance Budgets

Keep these targets in mind:

| Metric | Target |
|--------|--------|
| Cold start | < 2 seconds |
| Hotkey response | < 100ms |
| Transcription display | < 3 seconds |
| Idle memory | < 50MB |
| Recording memory | < 150MB |
| Bundle size | < 25MB |

---

## Security Guidelines

- **API keys**: Use Tauri secure store, never localStorage
- **Audio buffers**: Clear after transcription
- **Clipboard**: Minimal access, only on user action
- **User input**: Validate at boundaries

---

## Getting Help

- **Questions**: Open a discussion on GitHub
- **Bugs**: Open an issue with reproduction steps
- **Architecture**: Check [Architecture Overview](docs/architecture/overview.md)

---

## License

By contributing, you agree that your contributions will be licensed under the GNU AGPL v3.0 or later.
