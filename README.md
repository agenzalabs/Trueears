# Voice Dictation

A minimalist, AI-powered voice dictation application built with Tauri, React, and Vite. This tool allows you to record your voice using a global hotkey and automatically pastes the transcribed text into your active application using **Groq's Whisper models** or **Google's Gemini models**.

## Features

- 🎙️ **Global Hotkey**: Press `Ctrl+Shift+K` (or `Cmd+Shift+K` on macOS) to toggle recording from anywhere.
- ⚙️ **Quick Settings**: Press `Ctrl+Shift+L` (or `Cmd+Shift+L` on macOS) to open the settings panel.
- 🤖 **Multi-Provider Support**: Choose between Groq (Whisper Large V3 Turbo) for speed or Google Gemini (Flash 1.5/2.0) for advanced reasoning and transcription.
- 📋 **Auto-Paste**: Automatically types the transcribed text into the currently active text field.
- 🪟 **Minimalist Overlay**: A non-intrusive floating overlay shows recording status and audio visualization.
- ⚡ **Fast & Lightweight**: Built on Vite and Tauri for performance.

## Prerequisites

- Node.js (v18 or higher recommended)
- Rust (latest stable version)
- A **Groq API Key** or a **Google Gemini API Key**

### Installing Rust

If you don't have Rust installed, download and install it from [rustup.rs](https://rustup.rs/):

```bash
# Windows (PowerShell)
winget install Rustlang.Rustup

# Or use the installer from rustup.rs
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
   - When you first launch the application, you can open settings with `Ctrl+Shift+L` or by clicking the settings icon.
   - Select your preferred provider (**Groq** or **Gemini**).
   - Enter your API Key for the selected provider.
   - Choose your desired model.
   - The settings are saved locally for future use.

## Development

To run the application in development mode with hot-reloading:

```bash
npm run tauri:dev
```

This will start the Vite dev server and launch the Tauri application with hot-reload capabilities.

## Building

To build the application for production:

```bash
npm run tauri:build
```

The output executable will be generated in the `src-tauri/target/release/bundle/` folder:
- Windows: `src-tauri/target/release/bundle/nsis/Scribe_0.0.0_x64-setup.exe`
- The bundle size is approximately **15-20 MB** (vs ~150MB with Electron).

## Usage

1. Launch the application. It will start in the background.
2. Place your cursor in any text field (e.g., Notepad, Browser, IDE).
3. Press **`Ctrl+Shift+K`** (Windows/Linux) or **`Cmd+Shift+K`** (macOS) to start recording.
4. Speak your text.
5. Press the hotkey again to stop recording.
6. The text will be transcribed and automatically pasted into your active window.

## Tech Stack

- **Frontend**: React, Vite, TailwindCSS
- **Backend**: Tauri (Rust)
- **AI Services**: 
  - Groq API (REST)
  - Google Gemini SDK (`@google/genai`)
- **Audio**: Native Web Audio API
- **Automation**: Rust (`enigo` for keyboard, `arboard` for clipboard)

## Project Structure

```
scribe/
├── src-tauri/          # Tauri Rust backend
│   ├── src/
│   │   ├── main.rs     # Entry point (unused with lib.rs)
│   │   ├── lib.rs      # Main Tauri application logic
│   │   ├── automation.rs   # Keyboard & clipboard automation
│   │   ├── shortcuts.rs    # Global hotkey handling
│   │   └── window.rs       # Active window detection
│   ├── Cargo.toml      # Rust dependencies
│   └── tauri.conf.json # Tauri configuration
├── src/                # React frontend
│   ├── components/     # UI Components (Overlay, Settings, etc.)
│   ├── hooks/          # Custom hooks (useAudioRecorder, useDictation)
│   ├── services/       # AI Service integrations (Groq, Gemini)
│   ├── utils/          # Audio processing, helpers, and Tauri API wrapper
│   └── App.tsx         # Main application component
├── dist/               # Built frontend assets (generated)
├── index.html          # Entry HTML file
├── package.json        # Project dependencies and scripts
└── vite.config.ts      # Vite configuration
```

## License

MIT
