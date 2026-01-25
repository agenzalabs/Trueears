# Changelog

All notable changes to Trueears will be documented in this file.

## [0.2.0] - 2024-12-04

### ✨ New Features
- **Light/Dark Theme Support** - App now adapts to your system theme preference
- **Multi-Language Transcription** - Added support for transcribing in multiple languages
- **Comprehensive Onboarding Wizard** - New first-run experience to help you get started
- **Shell Integration** - Enhanced integration with system shell

### 🐛 Bug Fixes
- Fixed recorder overlay window visibility and UI positioning
- Fixed mic stream leaks when switching audio devices
- Cleared clipboard after paste to prevent data leaks
- Prevented shortcut interference during onboarding trigger step
- Improved settings window startup and visibility

### 🔧 Improvements
- Main window now spans across all monitors for better multi-monitor support
- Simplified to Groq-only transcription provider for better reliability
- Added pointer cursors to onboarding buttons for better UX
- Enhanced UI components throughout the app

---

## [0.1.0] - Initial Release

### Features
- AI-powered dictation with Groq transcription
- Context-aware LLM-powered formatting
- App profile support with window title matching
- Global keyboard shortcuts
- Settings persistence using Tauri Store
- Cursor editor file mentions support
- Cross-window settings sync

