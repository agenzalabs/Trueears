# Troubleshooting

Common issues and solutions for Scribe.

## LLM Issues

### LLM is responding instead of formatting

If the LLM generates responses like "I'm doing great!" instead of formatting:

1. Open Settings (`Ctrl+Shift+S`)
2. Go to **App Profiles** tab
3. Click **"Reset to Defaults"** button
4. This reloads the base system prompt with "DO NOT respond" instructions

### Formatting is inconsistent

- Check that LLM Post-Processing is enabled in Settings
- Verify the app profile matches your active application
- Custom profiles may need adjustment to the system prompt

## Settings Issues

### Settings not persisting

Settings are stored via Tauri's Store plugin. If not saving:

1. Check console for errors (F12 in dev mode)
2. Clear store and restart:
   ```javascript
   // In browser console
   localStorage.clear();
   location.reload();
   ```
3. Ensure `@tauri-apps/plugin-store` is properly configured

### API key not working

1. Verify key at [console.groq.com](https://console.groq.com/keys)
2. Check for trailing spaces when pasting
3. Ensure key has required permissions

## Recording Issues

### Microphone not detected

1. Check Windows/macOS microphone permissions for Scribe
2. Verify microphone works in other applications
3. Try selecting a different input device in Settings

### Recording starts but no transcription

1. Check Groq API key is valid
2. Verify network connectivity
3. Check console for API errors

### Hotkey not responding

1. Ensure no other application is using `Ctrl+Shift+K`
2. Check if Scribe is running (system tray icon)
3. Restart Scribe
4. Some applications (games, elevated apps) may block global hotkeys

## Window Detection Issues

### "Default" profile always used

Active window detection uses Windows Win32 APIs. Common causes:

1. Application not in profile list
2. Executable name mismatch (check in Settings → App Profiles)
3. Running as administrator may affect detection

**Adding custom profile:**
1. Settings → App Profiles
2. Click "Add Profile"
3. Enter executable name (e.g., `notepad.exe`)
4. Configure formatting instructions

### macOS/Linux not detecting windows

Window detection is currently Windows-only. macOS and Linux implementations are planned.

## Build Issues

### "WebView2 not found" on Windows

The installer should handle this automatically. Manual fix:

1. Download WebView2 from [Microsoft](https://developer.microsoft.com/microsoft-edge/webview2/)
2. Install and restart

### Build fails with Rust errors

```bash
# Update Rust toolchain
rustup update stable

# Clean and rebuild
cd backend
cargo clean
cd ..
npm run build
```

### Missing Visual Studio Build Tools

Install from [Visual Studio Downloads](https://visualstudio.microsoft.com/downloads/):
- Select "Desktop development with C++"
- Include Windows SDK

## Performance Issues

### High memory usage

- Expected: < 50MB idle, < 150MB during recording
- If higher:
  1. Check for memory leaks in dev console
  2. Restart application
  3. Ensure audio buffers are being released

### Slow transcription

1. Network latency to Groq API
2. Large audio files (try shorter recordings)
3. Check Groq API status

### Overlay flickering

- May occur with certain display scaling settings
- Try 100% display scaling
- Update graphics drivers

## Getting Help

### Debug Information

When reporting issues, include:

1. Scribe version (`Settings → About`)
2. Operating system and version
3. Steps to reproduce
4. Console errors (F12 in dev mode)

### Reporting Issues

- GitHub Issues: [Report a bug](https://github.com/<repo>/issues)
- Include debug information above
- Attach screenshots if relevant

## FAQ

### Can Scribe work offline?

Transcription requires internet (Groq API). Future versions may support local models.

### Does Scribe store my audio?

No. Audio is sent to Groq for transcription and immediately discarded. Nothing is persisted.

### Can I use my own LLM?

Currently supports Groq-hosted models. Custom endpoint support is planned.

### Why Tauri instead of Electron?

- 10x smaller bundle size (15MB vs 150MB)
- Lower memory usage
- Native performance
- Rust backend for security-critical operations
