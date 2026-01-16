# Getting Started with Scribe

Get Scribe running in under 5 minutes.

## Prerequisites

| Requirement | Version | Installation |
|-------------|---------|--------------|
| Node.js | v18+ | [nodejs.org](https://nodejs.org/) |
| Rust | Latest stable | [rustup.rs](https://rustup.rs/) |
| Groq API Key | - | [console.groq.com](https://console.groq.com/keys) (free) |

### Installing Rust

```bash
# Windows
winget install Rustlang.Rustup

# macOS/Linux
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd scribe
npm install
```

### 2. Run Development Mode

```bash
npm run dev
```

This starts the Vite dev server and launches Scribe with hot-reload.

### 3. Configure API Keys

1. Press `Ctrl+Shift+S` to open Settings
2. Go to **Transcription** tab:
   - Enter your Groq API Key
   - Select Whisper model (default: `whisper-large-v3-turbo`)
3. Go to **LLM Post-Processing** tab (optional):
   - Enable LLM formatting
   - Select model (default: `openai/gpt-oss-120b`)

Settings are saved automatically.

### 4. Start Dictating

1. Focus any text field (Slack, VS Code, Notepad, etc.)
2. Press `Ctrl+Shift+K` to start recording
3. Speak your text
4. Press `Ctrl+Shift+K` again to stop
5. Text is automatically transcribed and pasted

## Recording Modes

Configure in **Settings > Preferences**:

| Mode | Behavior | Best For |
|------|----------|----------|
| **Auto** (default) | Quick tap = Toggle, Hold = Push-to-Talk | Flexibility |
| **Toggle** | Press to start, press to stop | Long dictation |
| **Push-to-Talk** | Hold to record, release to stop | Quick commands |

## Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|--------------|-------|
| Record | `Ctrl+Shift+K` | `Cmd+Shift+K` |
| Settings | `Ctrl+Shift+S` | `Cmd+Shift+S` |

## Select-to-Transform

Transform any selected text:

1. Select text in any application
2. Press `Ctrl+Shift+K`
3. Speak transformation instruction:
   - "Make it professional"
   - "Translate to Spanish"
   - "Convert to bullet points"
4. Press `Ctrl+Shift+K` again
5. Selected text is replaced with transformed version

## App Profiles

Scribe auto-detects your active application and applies context-specific formatting:

| App | Formatting Style |
|-----|-----------------|
| VS Code/Cursor | Technical docs, @file mentions |
| Slack/Discord | Casual chat messages |
| Outlook | Professional email format |
| Notion/OneNote | Structured notes with bullets |
| Word | Formal document content |

Customize profiles in **Settings > App Profiles**.

## Log Mode

Quickly save voice notes to markdown files based on your active application:

### How It Works

1. **Say a trigger phrase** followed by your note:
   - "Log I need to fix the authentication bug"
   - "Remember to call John tomorrow"
   - "Note to self review the PR before merging"

2. **Scribe automatically**:
   - Detects the trigger phrase
   - Saves to an app-specific log file (e.g., `chrome-log.md`)
   - Adds timestamp: `- [2025-12-29 16:30] your note here`

3. **First-time setup per app**:
   - On first use in a new app, you'll be prompted to set a log file path
   - Default path: `Documents/Scribe/<app-name>-log.md`
   - Click **Save** to confirm or **Skip** to copy to clipboard instead

### Default Trigger Phrases

| Phrase | Example |
|--------|---------|
| Log | "Log fix the login button" |
| Remember | "Remember to update the docs" |
| Note to self | "Note to self check the API limits" |

### Configuration

Configure Log Mode in **Settings > Log Mode**:

- **Enable/Disable**: Master toggle for the feature
- **Default Log Directory**: Base folder for new log files (default: `Documents/Scribe`)
- **Trigger Phrases**: Add, edit, or disable trigger phrases
- **App Mappings**: View and edit app-to-file mappings

### Log File Format

Entries are appended as markdown list items with timestamps:

```markdown
- [2025-12-29 14:30] Fix the authentication bug
- [2025-12-29 15:45] Review PR #42 before merging
- [2025-12-29 16:00] Call John about the project timeline
```

## Next Steps

- [Development Guide](./development.md) - Set up for contributing
- [Deployment Guide](./deployment.md) - Build for production
- [Architecture Overview](../architecture/overview.md) - Understand the system design
- [Troubleshooting](../troubleshooting.md) - Common issues and solutions
