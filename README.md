# Trueears

A minimalist, context-aware AI voice dictation application built with Tauri, React, and Rust. Uses Groq's Whisper models for fast speech-to-text and LLM-powered post-processing to format your words intelligently based on the active application.

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)
[![CI](https://github.com/agenzalabs/Trueears/actions/workflows/ci.yml/badge.svg)](https://github.com/agenzalabs/Trueears/actions/workflows/ci.yml)
[![Release](https://github.com/agenzalabs/Trueears/actions/workflows/release.yml/badge.svg)](https://github.com/agenzalabs/Trueears/actions/workflows/release.yml)
[![GitHub release](https://img.shields.io/github/v/release/devv-shayan/Trueears)](https://github.com/agenzalabs/Trueears/releases/latest)
[![Bundle Size](https://img.shields.io/badge/bundle-~15MB-green)](docs/guides/deployment.md)
[![Tauri](https://img.shields.io/badge/tauri-2.x-blue)](https://tauri.app)

> **[Contributing Guide](https://github.com/agenzalabs/Trueears/blob/main/CONTRIBUTING.md)** | **[Downloads](https://github.com/agenzalabs/Trueears/releases/)**


## Why Trueears Matters

Most voice dictation software is closed-source, cloud-heavy, or unaware of where users are writing. Trueears is an open, local-first alternative designed for developers and knowledge workers who need fast, context-aware speech-to-text across desktop apps.

Trueears detects the active application and applies profile-aware formatting directly in tools such as Cursor, Slack, Outlook, Notion, and Discord. This improves accessibility, multilingual writing, and day-to-day productivity without locking users into a proprietary editor.

## Features

- **Global Hotkey Recording** - `Ctrl+Shift+K` with Auto, Toggle, or Push-to-Talk modes
- **Context-Aware Formatting** - Detects active window and applies app-specific formatting
- **Select-to-Transform** - Select text, speak a transformation ("make it professional"), auto-replace
- **LLM Post-Processing** - Optional GPT-powered formatting (not responding, just formatting)
- **Auto-Paste** - Transcribed text automatically pastes into active application
- **Minimalist Overlay** - Non-intrusive floating UI with recording status

## Quick Start

```bash
# Prerequisites: Node.js 20.19+ (or 22.12+), Rust, Groq API Key

git clone https://github.com/agenzalabs/Trueears.git
cd Trueears
npm install
cp .env.example .env
npm run dev
```

Press `Ctrl+Shift+S` to configure your Groq API key, then `Ctrl+Shift+K` to start dictating.

Use the workspace root `.env` as the centralized config for frontend, backend, and payment-service.

[Full Getting Started Guide](docs/guides/getting-started.md)

## Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Record | `Ctrl+Shift+K` | `Cmd+Shift+K` |
| Settings | `Ctrl+Shift+S` | `Cmd+Shift+S` |

## App Profiles

Pre-configured formatting and language settings for popular applications:

| App | Formatting |
|-----|------------|
| VS Code / Cursor | Technical docs, @file mentions |
| Slack / Discord | Casual chat messages |
| Outlook | Professional email format |
| Notion / OneNote | Structured notes |

Each profile supports:
- **Custom System Prompts** - App-specific formatting instructions
- **Language Override** - Automatic language switching per app (e.g., Spanish for WhatsApp, English for VS Code)

Customize in Settings > App Profiles.

## Documentation

| Guide | Description |
|-------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | High-level architecture overview |
| [Development](docs/DEVELOPMENT.md) | Development setup and workflow |
| [Getting Started](docs/guides/getting-started.md) | Install, configure, and start dictating |
| [Development (detailed)](docs/guides/development.md) | Local setup, code conventions, testing |
| [Deployment](docs/guides/deployment.md) | Build for production distribution |
| [Architecture (detailed)](docs/architecture/overview.md) | System design with Mermaid diagrams |
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
Trueears/
├── frontend/       # React UI
├── backend/        # Tauri Rust backend
├── auth-server/    # OAuth authentication server
├── docs/           # Documentation
└── specs/          # Feature specifications
```

See [Architecture Overview](docs/architecture/overview.md) for detailed component breakdown.

## Downloads

Download the latest release for your platform:

**[Latest Release](https://github.com/devv-shayan/Trueears/releases/latest)**

Available for Windows and Linux. Check the [releases page](https://github.com/devv-shayan/Trueears/releases/latest) for platform-specific installers.

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines and [Development Guide](docs/guides/development.md) for setup instructions.

## License

GNU AGPL v3.0 or later
