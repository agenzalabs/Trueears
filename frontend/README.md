# Frontend

React TypeScript frontend for Scribe dictation application.

## Tech Stack

- React 19
- TypeScript 5.8+ (strict mode)
- TailwindCSS 4
- Vite 6

## Structure

```
src/
├── components/         # React UI components
│   ├── RecorderOverlay.tsx     # Main recording UI overlay
│   ├── SettingsWindow.tsx      # Settings window shell
│   └── settings/               # Settings tab components
├── hooks/              # Custom React hooks
│   ├── useAudioRecorder.ts     # Audio recording with Web Audio API
│   ├── useDictation.ts         # Transcription orchestration
│   └── useSettings.ts          # Settings management
├── services/           # External API integrations
│   ├── groqService.ts          # Groq Whisper transcription
│   ├── groqChatService.ts      # Groq LLM formatting
│   └── appProfileService.ts    # Profile matching logic
├── controllers/        # Business logic orchestration
│   └── dictationController.ts  # LLM post-processing
├── types/              # TypeScript type definitions
│   └── appProfile.ts           # Profile types & defaults
├── utils/              # Pure utility functions
│   ├── tauriApi.ts             # Tauri API wrapper
│   └── audio.ts                # Audio utilities
├── lib/                # Third-party integrations
├── data/               # Static data
├── App.tsx             # Root component
├── index.tsx           # Entry point
└── index.css           # Global styles
```

## Key Components

### RecorderOverlay

Main UI overlay that appears during recording. Non-intrusive floating window showing:
- Recording status indicator
- Current transcription preview
- Active app profile match

### SettingsWindow

Multi-tab settings interface:
- **Transcription**: Groq API key, Whisper model selection
- **LLM Post-Processing**: Enable/disable, model selection, system prompt
- **App Profiles**: Configure per-application formatting rules
- **Preferences**: Recording mode, hotkey settings
- **About**: Version info

## Key Hooks

### useAudioRecorder

Handles audio capture using Web Audio API:
- MediaRecorder management
- Audio blob collection
- Device selection

### useDictation

Orchestrates the dictation workflow:
- Recording start/stop
- Transcription via Groq
- Profile matching
- LLM formatting

### useSettings

Settings state management:
- Load/save to Tauri Store
- Cross-window synchronization
- Default value handling

## Development

```bash
# Start frontend dev server (standalone)
npm run vite:dev

# Build frontend only
npm run vite:build
```

## Code Conventions

- Functional components only (no class components)
- Custom hooks for reusable stateful logic
- Explicit return types on all exports
- No `any` types (strict mode)
- Services for API calls, controllers for orchestration
- Imports flow downward only (components → hooks → services)

## Testing

```bash
# Run tests
npm test

# Coverage
npm run test:coverage
```

## Related Documentation

- [Development Guide](../docs/guides/development.md)
- [Architecture Overview](../docs/architecture/overview.md)
- [Tauri Commands Reference](../docs/reference/tauri-commands.md)
