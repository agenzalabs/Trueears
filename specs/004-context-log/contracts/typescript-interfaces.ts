# TypeScript Interfaces Contract: Context-Aware Log Mode

**Feature**: 004-context-log
**Date**: 2025-12-28

This document defines the TypeScript interfaces for the Log Mode feature.

---

## Core Types

### LogModeConfig

```typescript
/**
 * Root configuration for Log Mode feature.
 * Stored in Tauri Store under key: Trueears_LOG_MODE_CONFIG
 */
export interface LogModeConfig {
  /** Master toggle for Log Mode feature */
  enabled: boolean;

  /** List of voice triggers that activate Log Mode */
  triggerPhrases: TriggerPhrase[];

  /** App-to-file routing configuration */
  appMappings: AppLogMapping[];

  /** Schema version for future migrations */
  version?: number;
}
```

### TriggerPhrase

```typescript
/**
 * A voice phrase that activates Log Mode when detected
 * at the start of a transcription.
 */
export interface TriggerPhrase {
  /** Unique identifier (UUID v4) */
  id: string;

  /** The trigger phrase text (1-50 chars) */
  phrase: string;

  /** Whether this trigger is active */
  enabled: boolean;
}
```

### AppLogMapping

```typescript
/**
 * A mapping between an application and its designated log file.
 */
export interface AppLogMapping {
  /** Unique identifier (UUID v4) */
  id: string;

  /** App identifier for matching (e.g., "Code.exe", "chrome.exe") */
  appIdentifier: string;

  /** Human-readable app name (e.g., "VS Code", "Chrome") */
  appDisplayName: string;

  /** Absolute path to the log file */
  logFilePath: string;

  /** ISO 8601 datetime when this mapping was created */
  createdAt: string;
}
```

---

## Service Types

### TriggerDetectionResult

```typescript
/**
 * Result of attempting to detect a trigger phrase in transcription.
 */
export interface TriggerDetectionResult {
  /** Whether a trigger phrase was detected */
  detected: boolean;

  /** The matched trigger phrase (if detected) */
  trigger?: TriggerPhrase;

  /** The content after stripping the trigger phrase */
  content?: string;
}
```

### LogEntryResult

```typescript
/**
 * Result of attempting to save a log entry.
 */
export interface LogEntryResult {
  /** Whether the log entry was saved successfully */
  success: boolean;

  /** The file path where the entry was saved (if successful) */
  filePath?: string;

  /** Error message (if failed) */
  error?: string;

  /** Whether content was copied to clipboard as fallback */
  fallbackToClipboard?: boolean;
}
```

### PathValidation

```typescript
/**
 * Result of validating a log file path.
 */
export interface PathValidation {
  /** Whether the path is valid for use as a log destination */
  valid: boolean;

  /** Whether the file already exists */
  exists: boolean;

  /** Whether the parent directory exists */
  parentExists: boolean;

  /** Whether we have write permission */
  writable: boolean;

  /** Error message if invalid */
  errorMessage: string | null;
}
```

---

## UI Component Props

### LogModeSettingsProps

```typescript
export interface LogModeSettingsProps {
  /** Current theme for styling */
  theme: 'light' | 'dark';
}
```

### TriggerPhraseListProps

```typescript
export interface TriggerPhraseListProps {
  /** Current list of trigger phrases */
  phrases: TriggerPhrase[];

  /** Callback when a phrase is added */
  onAdd: (phrase: Omit<TriggerPhrase, 'id'>) => void;

  /** Callback when a phrase is updated */
  onUpdate: (id: string, updates: Partial<TriggerPhrase>) => void;

  /** Callback when a phrase is deleted */
  onDelete: (id: string) => void;

  /** Current theme for styling */
  theme: 'light' | 'dark';
}
```

### AppMappingListProps

```typescript
export interface AppMappingListProps {
  /** Current list of app mappings */
  mappings: AppLogMapping[];

  /** Callback when a mapping is added */
  onAdd: (mapping: Omit<AppLogMapping, 'id' | 'createdAt'>) => void;

  /** Callback when a mapping is updated */
  onUpdate: (id: string, updates: Partial<AppLogMapping>) => void;

  /** Callback when a mapping is deleted */
  onDelete: (id: string) => void;

  /** Current theme for styling */
  theme: 'light' | 'dark';
}
```

### ConfigPromptProps

```typescript
/**
 * Props for the first-time configuration prompt modal.
 * Shown when Log Mode is triggered in an unmapped app.
 */
export interface ConfigPromptProps {
  /** The app that needs configuration */
  appIdentifier: string;

  /** Human-readable app name */
  appDisplayName: string;

  /** The content waiting to be logged */
  pendingContent: string;

  /** Callback when user confirms with a file path */
  onConfirm: (filePath: string) => void;

  /** Callback when user cancels (triggers clipboard fallback) */
  onCancel: () => void;

  /** Current theme for styling */
  theme: 'light' | 'dark';
}
```

---

## Service Interface

### LogModeService

```typescript
/**
 * Service interface for Log Mode operations.
 */
export interface ILogModeService {
  /**
   * Get the current Log Mode configuration.
   */
  getConfig(): Promise<LogModeConfig>;

  /**
   * Save the Log Mode configuration.
   */
  saveConfig(config: LogModeConfig): Promise<void>;

  /**
   * Check if Log Mode is enabled.
   */
  isEnabled(): Promise<boolean>;

  /**
   * Detect if text starts with a trigger phrase.
   */
  detectTrigger(text: string): Promise<TriggerDetectionResult>;

  /**
   * Find the mapping for the current app.
   */
  findMappingForApp(appIdentifier: string): Promise<AppLogMapping | null>;

  /**
   * Save a log entry to the appropriate file.
   */
  saveLogEntry(content: string, appIdentifier: string): Promise<LogEntryResult>;

  /**
   * Validate a file path for use as a log destination.
   */
  validatePath(path: string): Promise<PathValidation>;

  /**
   * Add a new trigger phrase.
   */
  addTriggerPhrase(phrase: string): Promise<TriggerPhrase>;

  /**
   * Add a new app mapping.
   */
  addAppMapping(appIdentifier: string, appDisplayName: string, filePath: string): Promise<AppLogMapping>;

  /**
   * SubTrueears to configuration changes.
   */
  onConfigChange(callback: (config: LogModeConfig) => void): () => void;
}
```

---

## Constants

```typescript
/** Storage key for Log Mode configuration */
export const LOG_MODE_CONFIG_KEY = 'Trueears_LOG_MODE_CONFIG';

/** Allowed file extensions for log files */
export const ALLOWED_LOG_EXTENSIONS = ['.md', '.txt', '.log'];

/** Default trigger phrases shipped with the app */
export const DEFAULT_TRIGGER_PHRASES: TriggerPhrase[] = [
  { id: 'default-log', phrase: 'Log', enabled: true },
  { id: 'default-note', phrase: 'Note to self', enabled: true },
  { id: 'default-remember', phrase: 'Remember', enabled: true },
];

/** Default configuration for new installations */
export const DEFAULT_LOG_MODE_CONFIG: LogModeConfig = {
  enabled: true,
  triggerPhrases: DEFAULT_TRIGGER_PHRASES,
  appMappings: [],
  version: 1,
};

/** Maximum length for trigger phrases */
export const MAX_TRIGGER_PHRASE_LENGTH = 50;

/** Retry delay for file write failures (ms) */
export const FILE_WRITE_RETRY_DELAY = 500;
```

---

## Type Guards

```typescript
/**
 * Check if a value is a valid LogModeConfig.
 */
export function isLogModeConfig(value: unknown): value is LogModeConfig {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.enabled === 'boolean' &&
    Array.isArray(obj.triggerPhrases) &&
    Array.isArray(obj.appMappings)
  );
}

/**
 * Check if a path has an allowed extension.
 */
export function hasAllowedExtension(path: string): boolean {
  const lowerPath = path.toLowerCase();
  return ALLOWED_LOG_EXTENSIONS.some(ext => lowerPath.endsWith(ext));
}
```
