# Frequently Asked Questions

Quick answers to common questions about Trueears.

---

## General

### What is Trueears?

Trueears is a minimalist, context-aware AI voice dictation application. It transforms speech into intelligently formatted text based on the active application (VS Code, Slack, Outlook, etc.).

### How much does it cost?

Trueears itself is free and open source. You only pay for API usage:
- **Groq API**: Free tier available with generous limits
- **LLM Post-Processing**: Uses Groq's free chat models

### Which platforms are supported?

- **Windows**: Fully supported (Windows 10/11)
- **macOS**: Coming soon
- **Linux**: Coming soon

---

## Privacy & Security

### Does Trueears store my audio?

No. Audio is:
1. Recorded locally in memory
2. Sent to Groq for transcription
3. Immediately discarded after transcription

Nothing is persisted to disk or any server you don't control.

### Where are my API keys stored?

API keys are stored in Tauri's secure store plugin, which uses the operating system's secure credential storage (Windows Credential Manager, macOS Keychain, etc.). They are never stored in plain text or localStorage.

### Is my voice data sent anywhere besides Groq?

No. Voice data is only sent to Groq's Whisper API for transcription. If you enable LLM post-processing, the tranTrueearsd *text* (not audio) is sent to Groq's chat API for formatting.

### Can I use Trueears offline?

Transcription requires internet access (Groq API). Local/offline model support is planned for future versions.

---

## Features

### What's the difference between recording modes?

| Mode | Behavior | Best For |
|------|----------|----------|
| **Auto** | Quick tap = Toggle, Hold = Push-to-Talk | Flexibility |
| **Toggle** | Press to start, press to stop | Long dictation |
| **Push-to-Talk** | Hold to record, release to stop | Quick commands |

### What is Select-to-Transform?

Select-to-Transform lets you transform existing text with voice:
1. Select text in any application
2. Press `Ctrl+Shift+K`
3. Speak a transformation (e.g., "make it professional")
4. Selected text is replaced with the transformed version

### What is Log Mode?

Log Mode lets you quickly save voice notes to markdown files:
1. Say "Log" followed by your note (e.g., "Log fix the login button")
2. Trueears saves it to an app-specific log file with a timestamp

### Can I customize app profiles?

Yes. Go to Settings > App Profiles to:
- Add profiles for new applications
- Modify formatting instructions
- Set context-specific system prompts
- **Override transcription language per app** (e.g., Spanish for WhatsApp, English for VS Code)

### Can I use different languages for different apps?

Yes! Each App Profile supports a Language Override feature:
1. Go to **Settings > App Profiles**
2. Create or edit a profile
3. Under **Language Override**, select your preferred language
4. The language you select will be used automatically when recording in that app

This is perfect for multilingual workflows where you switch between languages throughout the day.

---

## Technical

### Why Tauri instead of Electron?

| Tauri | Electron |
|-------|----------|
| ~15MB bundle | ~150MB bundle |
| Lower memory usage | Higher memory usage |
| Native Rust backend | Node.js backend |
| System WebView | Bundled Chromium |

Tauri provides a 10x smaller bundle with better performance.

### What LLM models can I use?

Currently supports OpenRouter-hosted models:
- `openai/gpt-oss-120b` (recommended)
- `openai/gpt-oss-20b`

Custom endpoint support is planned.

### What Whisper model is used?

Default: `whisper-large-v3-turbo` (via Groq)

This provides the best balance of speed and accuracy.

### How do global hotkeys work?

Trueears registers system-wide hotkeys using Tauri's global-shortcut plugin:
- `Ctrl+Shift+K`: Start/stop recording
- `Ctrl+Shift+S`: Open settings

These work even when Trueears isn't focused.

---

## Troubleshooting Quick Reference

| Problem | Quick Solution |
|---------|----------------|
| LLM responds instead of formats | Settings > App Profiles > Reset to Defaults |
| Hotkey doesn't work | Check for conflicts with other apps |
| No transcription | Verify Groq API key is valid |
| High memory usage | Restart app, check for 150MB limit |

For detailed solutions, see [Troubleshooting](./README.md).

---

## Contributing

### How can I contribute?

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for:
- Development setup
- Code conventions
- PR process
- Issue reporting

### Where do I report bugs?

Open an issue on GitHub with:
- Trueears version
- Operating system
- Steps to reproduce
- Console errors (F12)
