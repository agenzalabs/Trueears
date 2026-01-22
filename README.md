# Scribe

A minimalist, context-aware AI voice dictation application built with Tauri, React, and Rust. Uses Groq's Whisper models for fast speech-to-text and LLM-powered post-processing to format your words intelligently based on the active application.

[![Bundle Size](https://img.shields.io/badge/bundle-~15MB-green)](docs/guides/deployment.md)
[![Tauri](https://img.shields.io/badge/tauri-2.x-blue)](https://tauri.app)
[![License](https://img.shields.io/badge/license-MIT-lightgrey)](LICENSE)

## Features

- **Global Hotkey Recording** - `Ctrl+Shift+K` with Auto, Toggle, or Push-to-Talk modes
- **Context-Aware Formatting** - Detects active window and applies app-specific formatting
- **Select-to-Transform** - Select text, speak a transformation ("make it professional"), auto-replace
- **LLM Post-Processing** - Optional GPT-powered formatting (not responding, just formatting)
- **Auto-Paste** - Transcribed text automatically pastes into active application
- **Minimalist Overlay** - Non-intrusive floating UI with recording status

## Quick Start

```bash
# Prerequisites: Node.js v18+, Rust, Groq API Key

git clone <repository-url>
cd scribe
npm install
npm run dev
```

Press `Ctrl+Shift+S` to configure your Groq API key, then `Ctrl+Shift+K` to start dictating.

[Full Getting Started Guide](docs/guides/getting-started.md)

## Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Record | `Ctrl+Shift+K` | `Cmd+Shift+K` |
| Settings | `Ctrl+Shift+S` | `Cmd+Shift+S` |

## App Profiles

Pre-configured formatting for popular applications:

| App | Formatting |
|-----|------------|
| VS Code / Cursor | Technical docs, @file mentions |
| Slack / Discord | Casual chat messages |
| Outlook | Professional email format |
| Notion / OneNote | Structured notes |

Customize in Settings > App Profiles.

## Documentation

| Guide | Description |
|-------|-------------|
| [Getting Started](docs/guides/getting-started.md) | Install, configure, and start dictating |
| [Development](docs/guides/development.md) | Local setup, code conventions, testing |
| [Deployment](docs/guides/deployment.md) | Build for production distribution |
| [Architecture](docs/architecture/overview.md) | System design with Mermaid diagrams |
| [API Reference](docs/reference/tauri-commands.md) | Tauri backend command documentation |
| [Troubleshooting](docs/troubleshooting/README.md) | Common issues and solutions |
| [FAQ](docs/troubleshooting/faq.md) | Frequently asked questions |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript 5.8, TailwindCSS 4 |
| Backend | Tauri 2.x (Rust) |
| AI | Groq Whisper (STT), Groq Chat (LLM) |

## Project Structure

```
scribe/
├── frontend/       # React UI
├── backend/        # Tauri Rust backend
├── auth-server/    # OAuth authentication server
├── docs/           # Documentation
└── specs/          # Feature specifications
```

See [Architecture Overview](docs/architecture/overview.md) for detailed component breakdown.

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines and [Development Guide](docs/guides/development.md) for setup instructions.

## License

MIT
