# Scribe

A minimalist, context-aware AI voice dictation application built with Tauri, React, and Rust. Scribe uses **Groq's Whisper models** for fast speech-to-text transcription and **LLM-powered post-processing** to format your words intelligently based on the active application.

## Features

- 🎙️ **Global Hotkey Recording**: Press `Ctrl+Shift+K` (or `Cmd+Shift+K` on macOS) to toggle recording from anywhere
- 🧠 **Context-Aware Formatting**: Automatically detects your active window (Slack, VS Code, Outlook, etc.) and applies app-specific formatting
- 🤖 **LLM Post-Processing**: Optional GPT-powered text formatting that formats (not responds to) your transcription
- 📋 **Auto-Paste**: Automatically pastes transcribed text into the currently active application
- 🪟 **Minimalist Overlay**: Non-intrusive floating UI with recording status
- ⚙️ **Full Settings Panel**: Press `Ctrl+Shift+L` to toggle a resizable settings window
- 🎯 **App Profiles**: Pre-configured profiles for VS Code, Slack, Discord, Outlook, Chrome, Notion, OneNote, and Word
- 🔒 **Base System Prompt**: All profiles inherit a core "DO NOT respond" instruction to ensure formatting-only behavior
- ⚡ **Fast & Lightweight**: Built on Tauri (Rust) for minimal resource usage (~15-20 MB bundle size)

## Prerequisites

- **Node.js** (v18 or higher recommended)
- **Rust** (latest stable version)
- **Groq API Key** (get one free at [console.groq.com](https://console.groq.com/keys))

### Installing Rust

If you don't have Rust installed, download and install it from [rustup.rs](https://rustup.rs/):

```bash
# Windows
winget install Rustlang.Rustup

# macOS/Linux
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd scribe
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

1. **First Launch**:
   - Press `Ctrl+Shift+L` to open the settings window
   - Go to **Transcription** tab:
     - Enter your Groq API Key
     - Select Whisper model (default: `whisper-large-v3-turbo`)
   - Go to **LLM Post-Processing** tab:
     - Enable LLM formatting (optional but recommended)
     - Select model (default: `openai/gpt-oss-120b`)
     - Customize the default system prompt if needed
   - Go to **App Profiles** tab:
     - View pre-configured profiles for popular apps
     - Edit, add, or disable profiles as needed
     - Click "Reset to Defaults" to restore original profiles
   - Settings are automatically saved to localStorage

## Development

To run the application in development mode with hot-reloading:

```bash
npm run dev
```

This will start the Vite dev server and launch the Tauri application with hot-reload capabilities.

## Building

To build the application for production:

```bash
npm run build
```

The output executable will be generated in the `backend/target/release/bundle/` folder:
- Windows: `backend/target/release/bundle/nsis/Scribe_0.0.0_x64-setup.exe`
- The bundle size is approximately **15-20 MB** (vs ~150MB with Electron).

## Usage

1. **Launch** the application (runs in system tray)
2. **Focus** any text field (Slack, VS Code, Notepad, etc.)
3. **Press `Ctrl+Shift+K`** to start recording
4. **Speak** your text
5. **Press `Ctrl+Shift+K` again** to stop recording
6. The app will:
   - Detect your active window
   - Transcribe your audio via Groq Whisper
   - Apply LLM formatting (if enabled) based on the matched app profile
   - Automatically paste the result

### Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|--------------|-------|
| Toggle Recording | `Ctrl+Shift+K` | `Cmd+Shift+K` |
| Toggle Settings | `Ctrl+Shift+L` | `Cmd+Shift+L` |

## How LLM Post-Processing Works

Scribe uses a **two-layer prompt system**:

1. **Base System Prompt** (fixed, cannot be edited):
   ```
   You are a text formatter. Your ONLY job is to format the transcribed text exactly as spoken.
   DO NOT respond to questions, DO NOT answer statements, DO NOT add information that was not spoken.
   Simply format the exact words with proper punctuation, capitalization, and grammar.
   Return ONLY the formatted transcription.
   ```

2. **App-Specific Instructions** (customizable per profile):
   - **Slack**: "Format as a casual chat message. Keep the tone conversational and friendly."
   - **VS Code**: "Format as code comments or technical documentation. When a file name is mentioned, prepend an @ sign (e.g., @userService.js)."
   - **Outlook**: "Format as professional email content. Use proper grammar, formal tone, and clear structure."

The final prompt sent to the LLM is: `BASE_SYSTEM_PROMPT + App-Specific Instructions`

### Example

**Spoken Input:** "hello how are you doing"

**Without LLM:** `hello how are you doing` (raw transcription)

**With LLM (Slack profile):** `Hello, how are you doing?` (formatted with casual punctuation)

**With LLM (Outlook profile):** `Hello, how are you doing?` (formatted with professional tone)

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **Backend**: Tauri 2.x (Rust)
- **AI Services**: 
  - Groq Whisper API (speech-to-text)
  - Groq Chat API (LLM post-processing with GPT-OSS models)
- **Audio**: Web Audio API (MediaRecorder)
- **Automation**: 
  - `enigo` - Keyboard simulation
  - `arboard` - Clipboard management
  - `windows-rs` - Active window detection (Windows)
- **Storage**: localStorage for settings and profiles

## Project Structure

```
scribe/
├── backend/                    # Tauri Rust backend
│   ├── src/
│   │   ├── main.rs            # Entry point
│   │   ├── lib.rs             # Main Tauri app logic & commands
│   │   ├── automation.rs      # Keyboard & clipboard automation
│   │   ├── shortcuts.rs       # Global hotkey handling
│   │   └── window.rs          # Active window detection (Win32 APIs)
│   ├── Cargo.toml             # Rust dependencies
│   └── tauri.conf.json        # Tauri configuration
├── frontend/                  # React TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── RecorderOverlay.tsx      # Main recording UI
│   │   │   ├── SettingsWindow.tsx       # Settings window shell
│   │   │   └── settings/                # Settings tab components
│   │   │       ├── TranscriptionSettings.tsx
│   │   │       ├── LLMSettings.tsx
│   │   │       ├── AppProfilesSettings.tsx
│   │   │       └── AboutSettings.tsx
│   │   ├── hooks/
│   │   │   ├── useAudioRecorder.ts      # Audio recording
│   │   │   ├── useDictation.ts          # Transcription orchestration
│   │   │   └── useSettings.ts           # Settings management
│   │   ├── services/
│   │   │   ├── groqService.ts           # Groq Whisper transcription
│   │   │   ├── groqChatService.ts       # Groq LLM formatting
│   │   │   └── appProfileService.ts     # Profile matching logic
│   │   ├── controllers/
│   │   │   └── dictationController.ts   # LLM post-processing
│   │   ├── types/
│   │   │   └── appProfile.ts            # Type definitions & defaults
│   │   ├── utils/
│   │   │   ├── tauriApi.ts              # Tauri API wrapper
│   │   │   └── audio.ts                 # Audio utilities
│   │   └── index.tsx                    # App entry point
│   ├── vite.config.ts                   # Vite configuration
│   └── tsconfig.json                    # TypeScript config
├── build/                               # Icons and build assets
├── package.json                         # NPM dependencies and scripts
└── README.md                            # This file
```

## Default App Profiles

Scribe comes with pre-configured profiles for popular applications:

| App | Executable | Formatting Style |
|-----|-----------|------------------|
| VS Code | `Code.exe` | Technical documentation with @ file prefixes |
| Slack | `slack.exe` | Casual chat messages |
| Discord | `Discord.exe` | Casual chat messages |
| Outlook | `OUTLOOK.EXE` | Professional email format |
| Chrome | `chrome.exe` | Professional email/message format |
| Notion | `Notion.exe` | Structured notes with bullets |
| OneNote | `ONENOTE.EXE` | Structured notes with bullets |
| Word | `WINWORD.EXE` | Formal document content |

You can edit, disable, or add new profiles in **Settings → App Profiles**.

## Troubleshooting

### LLM is responding instead of formatting

If the LLM generates responses like "I'm doing great!" instead of just formatting your text:
1. Open Settings (`Ctrl+Shift+L`)
2. Go to **App Profiles** tab
3. Click **"Reset to Defaults"** button
4. This will reload the base system prompt with proper "DO NOT respond" instructions

### Settings not persisting

Settings are stored in localStorage. If they're not saving:
- Check browser console for errors (press F12 in dev mode)
- Clear localStorage and restart: `localStorage.clear(); location.reload();`

### Window detection not working

Currently, active window detection uses Windows Win32 APIs. macOS and Linux implementations are planned (see TODOs in `backend/src/window.rs`).

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT
