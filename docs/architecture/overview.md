# Scribe Architecture Overview

This document describes the high-level architecture of Scribe, a context-aware AI voice dictation application.

## System Architecture

```mermaid
graph TB
    subgraph Desktop["Tauri Desktop App"]
        UI[React Frontend]
        Tauri[Tauri Backend<br/>Rust]
    end

    subgraph External["External Services"]
        Groq[Groq API<br/>Whisper STT]
        LLM[Groq Chat API<br/>LLM Formatting]
    end

    subgraph Auth["Authentication"]
        AuthServer[Auth Server<br/>Axum/Rust]
        Google[Google OAuth]
        DB[(PostgreSQL<br/>Neon)]
    end

    UI <--> Tauri
    UI --> Groq
    UI --> LLM
    Tauri --> AuthServer
    AuthServer --> Google
    AuthServer --> DB
```

## Component Overview

### 1. Frontend (React + TypeScript)

The frontend handles the user interface and orchestrates the dictation workflow.

```mermaid
graph LR
    subgraph Components
        RO[RecorderOverlay]
        SW[SettingsWindow]
    end

    subgraph Hooks
        AR[useAudioRecorder]
        UD[useDictation]
        US[useSettings]
    end

    subgraph Services
        GS[groqService]
        GCS[groqChatService]
        APS[appProfileService]
    end

    subgraph Controllers
        DC[dictationController]
    end

    Components --> Hooks
    Hooks --> Services
    Hooks --> Controllers
    Controllers --> Services
```

**Key Responsibilities:**
- Audio recording via Web Audio API
- Speech-to-text transcription via Groq Whisper
- LLM post-processing for context-aware formatting
- Settings management and persistence
- UI rendering for overlay and settings windows

### 2. Backend (Tauri/Rust)

The Rust backend provides platform-native capabilities.

```mermaid
graph TB
    subgraph Tauri["Tauri Backend"]
        Main[main.rs<br/>Entry Point]
        Lib[lib.rs<br/>Commands]
        Auto[automation.rs<br/>Keyboard/Clipboard]
        Short[shortcuts.rs<br/>Global Hotkeys]
        Win[window.rs<br/>Window Detection]
        Apps[installed_apps.rs<br/>App Discovery]
        Auth[auth.rs<br/>Authentication]
    end

    Main --> Lib
    Lib --> Auto
    Lib --> Short
    Lib --> Win
    Lib --> Apps
    Lib --> Auth
```

**Key Responsibilities:**
- Global hotkey registration (`Ctrl+Shift+K`, `Ctrl+Shift+S`)
- Active window detection (Win32 APIs)
- Clipboard management (read/write)
- Keyboard simulation for auto-paste
- System tray integration

### 3. Auth Server (Axum/Rust)

Standalone authentication service for Google OAuth.

```mermaid
graph LR
    subgraph AuthServer["Auth Server"]
        Handlers[HTTP Handlers]
        Middleware[Auth Middleware]
        Models[User Models]
        JWT[JWT Utils]
    end

    subgraph Storage
        PG[(PostgreSQL)]
    end

    Handlers --> Middleware
    Handlers --> Models
    Handlers --> JWT
    Models --> PG
```

**Key Responsibilities:**
- Google OAuth code exchange
- JWT token generation and validation
- User profile management
- Session/refresh token storage

## Data Flow

### Recording & Transcription Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as React UI
    participant Tauri as Tauri Backend
    participant Groq as Groq Whisper
    participant LLM as Groq LLM

    User->>Tauri: Press Ctrl+Shift+K
    Tauri->>UI: Hotkey event
    UI->>UI: Start audio recording
    User->>User: Speak
    User->>Tauri: Release/Press hotkey
    Tauri->>UI: Stop recording
    UI->>Groq: Send audio blob
    Groq-->>UI: Transcription text
    UI->>Tauri: Get active window
    Tauri-->>UI: Window info (title, exe)
    UI->>UI: Match app profile
    UI->>LLM: Format with profile context
    LLM-->>UI: Formatted text
    UI->>Tauri: Paste to clipboard
    Tauri->>Tauri: Simulate Ctrl+V
    Tauri-->>User: Text pasted
```

### Select-to-Transform Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as React UI
    participant Tauri as Tauri Backend
    participant LLM as Groq LLM

    User->>User: Select text
    User->>Tauri: Press Ctrl+Shift+K
    Tauri->>UI: Hotkey event
    UI->>Tauri: Read clipboard
    Tauri-->>UI: Selected text
    UI->>UI: Start audio recording
    User->>User: Speak transformation
    User->>Tauri: Stop recording
    UI->>LLM: Transform text with instruction
    LLM-->>UI: Transformed text
    UI->>Tauri: Paste to clipboard
    Tauri->>Tauri: Simulate Ctrl+V
    Tauri-->>User: Transformed text replaced
```

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | React | 19.x |
| Language (Frontend) | TypeScript | 5.8+ |
| Styling | TailwindCSS | 4.x |
| Build Tool | Vite | 6.x |
| Desktop Framework | Tauri | 2.x |
| Backend Language | Rust | 1.70+ |
| Auth Server | Axum | 0.7.x |
| Database | PostgreSQL (Neon) | 14+ |
| STT | Groq Whisper | whisper-large-v3-turbo |
| LLM | Groq Chat | Configurable |

## Security Architecture

```mermaid
graph TB
    subgraph Secure["Secure Storage"]
        Store[Tauri Store Plugin]
        Keychain[OS Keychain]
    end

    subgraph Protected["Protected Data"]
        API[API Keys]
        Tokens[Auth Tokens]
    end

    subgraph Transient["Transient Data"]
        Audio[Audio Buffers]
        Clipboard[Clipboard Data]
    end

    API --> Store
    Tokens --> Keychain
    Audio --> |Cleared after use| Transient
    Clipboard --> |Minimal access| Transient
```

**Security Principles:**
- API keys stored in Tauri secure store, not localStorage
- Audio buffers cleared after transcription
- Clipboard access only when user initiates action
- JWT tokens in OS keychain
- LLM prompts include injection prevention

## Related Documentation

- [Auth System Architecture](./auth-system.md) - Detailed OAuth implementation
- [Development Guide](../guides/development.md) - Local setup and coding conventions
- [Deployment Guide](../guides/deployment.md) - Building for production
