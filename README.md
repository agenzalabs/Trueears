# Trueears — Open-Source AI Voice Dictation for Windows & Linux

**Trueears is a free, open-source, context-aware voice dictation app** that turns speech into formatted text anywhere on your desktop. It uses Groq's Whisper models for fast, accurate speech-to-text and LLM-powered post-processing to format your words intelligently based on the app you're writing in — a local-first alternative to dictation tools like Dragon, Wispr Flow, and Otter.

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)
[![CI](https://github.com/agenzalabs/Trueears/actions/workflows/ci.yml/badge.svg)](https://github.com/agenzalabs/Trueears/actions/workflows/ci.yml)
[![Release](https://github.com/agenzalabs/Trueears/actions/workflows/release.yml/badge.svg)](https://github.com/agenzalabs/Trueears/actions/workflows/release.yml)
[![GitHub release](https://img.shields.io/github/v/release/agenzalabs/Trueears)](https://github.com/agenzalabs/Trueears/releases/latest)
[![Bundle Size](https://img.shields.io/badge/bundle-~15MB-green)](docs/guides/deployment.md)
[![Tauri](https://img.shields.io/badge/tauri-2.x-blue)](https://tauri.app)

> **[Website](https://www.trueearsai.com)** | **[Download](https://github.com/agenzalabs/Trueears/releases/latest)** | **[Contributing Guide](CONTRIBUTING.md)**

**Keywords:** voice dictation · speech-to-text · dictation app · voice typing · open-source Dragon alternative · AI transcription · Whisper · Windows dictation · context-aware speech recognition

## Why Trueears Matters

Most voice dictation and speech-to-text software is closed-source, cloud-heavy, or unaware of *where* you are writing. Trueears is an open, local-first dictation app built for developers and knowledge workers who need fast, accurate, context-aware voice typing across every desktop application.

Trueears detects the active application and applies profile-aware formatting directly in tools such as Cursor, VS Code, Slack, Outlook, Notion, and Discord. This improves accessibility, multilingual writing, and day-to-day productivity without locking you into a proprietary editor — making it a practical open-source alternative to Dragon NaturallySpeaking, Wispr Flow, Otter, and Windows Voice Typing.

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

git clone <repository-url>
cd Trueears
npm install
cp .env.example .env
npm run dev
```

Press `Ctrl+Shift+S` to configure your Groq API key, then `Ctrl+Shift+K` to start dictating.

Use the workspace root `.env` as the centralized config for frontend, backend, and payment-service.

[Full Getting Started Guide](docs/guides/getting-started.md)

## Trueears vs. Other Dictation Software

| | Trueears | Dragon | Wispr Flow | Windows Voice Typing |
|---|---|---|---|---|
| **Open source** | ✅ AGPL-3.0 | ❌ | ❌ | ❌ |
| **Free** | ✅ | ❌ | Freemium | ✅ |
| **Context-aware formatting** | ✅ Per-app profiles | ❌ | Partial | ❌ |
| **Local-first / privacy** | ✅ | ✅ | Cloud | Cloud |
| **Lightweight** | ✅ ~15MB | ❌ | — | Built-in |
| **Bring-your-own AI key** | ✅ Groq | ❌ | ❌ | ❌ |

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

**[Latest Release](https://github.com/agenzalabs/Trueears/releases/latest)**

Available for Windows and Linux. Check the [releases page](https://github.com/agenzalabs/Trueears/releases/latest) for platform-specific installers.

## Frequently Asked Questions

### What is Trueears?
Trueears is a free, open-source AI voice dictation app for Windows and Linux. It converts speech to text anywhere on your desktop and automatically formats the result based on the app you're writing in.

### Is Trueears a good open-source alternative to Dragon or Wispr Flow?
Yes. Trueears is a free, local-first dictation tool that offers context-aware, per-app formatting — features typically locked behind paid, closed-source products like Dragon NaturallySpeaking and Wispr Flow.

### How accurate is the speech-to-text?
Trueears uses Groq's Whisper models, which deliver fast and accurate transcription across many languages, including multilingual dictation.

### Is my voice data private?
Trueears is local-first and uses your own Groq API key. Audio is sent only to the speech-to-text provider you configure — there is no proprietary cloud account in between.

### What languages does Trueears support?
Trueears supports multilingual dictation and per-app language overrides (for example, Spanish in WhatsApp and English in VS Code).

### How do I start dictating?
Install Trueears, press `Ctrl+Shift+S` to add your Groq API key, then press `Ctrl+Shift+K` to dictate into any application.

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines and [Development Guide](docs/guides/development.md) for setup instructions.

## License

GNU AGPL v3.0 or later
