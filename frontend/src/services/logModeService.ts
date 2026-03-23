/**
 * LogModeService - Core service for Context-Aware Log Mode feature.
 *
 * Handles:
 * - Configuration management (get/save)
 * - Trigger phrase detection
 * - App-to-file mapping lookup
 * - Log entry saving with clipboard fallback
 *
 * @feature 004-context-log
 */

import {
  LogModeConfig,
  TriggerPhrase,
  AppLogMapping,
  TriggerDetectionResult,
  LogEntryResult,
  PathValidation,
  ILogModeService,
  LOG_MODE_CONFIG_KEY,
  DEFAULT_LOG_MODE_CONFIG,
  isLogModeConfig,
} from '../types/logMode';
import { tauriAPI } from '../utils/tauriApi';

type ConfigListener = (config: LogModeConfig) => void;

// In-memory cache for fast sync reads
let cachedConfig: LogModeConfig | null = null;
let cacheInitialized = false;
let loadPromise: Promise<void> | null = null;
let storeListenerRegistered = false;
const listeners = new Set<ConfigListener>();

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Generate a UUID v4
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Format a timestamp in the format [YYYY-MM-DD HH:mm]
 */
function formatTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `[${year}-${month}-${day} ${hours}:${minutes}]`;
}

function notifyListeners(): void {
  if (!cachedConfig) return;
  for (const cb of listeners) {
    try {
      cb(cachedConfig);
    } catch (e) {
      console.warn('[LogModeService] listener error', e);
    }
  }
}

/**
 * Parse config from raw JSON string
 */
function parseConfig(raw: string | null): LogModeConfig | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (isLogModeConfig(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * LogModeService - Singleton service for Log Mode operations
 */
export class LogModeService implements ILogModeService {
  private static instance: LogModeService | null = null;

  static getInstance(): LogModeService {
    if (!LogModeService.instance) {
      LogModeService.instance = new LogModeService();
    }
    return LogModeService.instance;
  }

  private constructor() {
    // Bootstrap on instantiation
    void this.ensureLoaded();
  }

  /**
   * SubTrueears to configuration changes.
   */
  onConfigChange(callback: ConfigListener): () => void {
    listeners.add(callback);
    // Immediately call with current config if available
    if (cachedConfig) {
      try {
        callback(cachedConfig);
      } catch (e) {
        console.warn('[LogModeService] listener error', e);
      }
    }
    return () => listeners.delete(callback);
  }

  /**
   * Ensure configuration is loaded from store.
   */
  async ensureLoaded(): Promise<void> {
    if (!isTauriRuntime()) {
      // Non-Tauri: use defaults
      if (!cacheInitialized) {
        cachedConfig = { ...DEFAULT_LOG_MODE_CONFIG };
        cacheInitialized = true;
        notifyListeners();
      }
      return;
    }

    if (!loadPromise) {
      loadPromise = this.bootstrapStoreSync();
    }
    await loadPromise;
  }

  /**
   * Get the current Log Mode configuration.
   */
  async getConfig(): Promise<LogModeConfig> {
    await this.ensureLoaded();
    return cachedConfig || { ...DEFAULT_LOG_MODE_CONFIG };
  }

  /**
   * Save the Log Mode configuration.
   */
  async saveConfig(config: LogModeConfig): Promise<void> {
    cachedConfig = config;
    cacheInitialized = true;
    notifyListeners();

    if (isTauriRuntime()) {
      await tauriAPI.setStoreValue(LOG_MODE_CONFIG_KEY, JSON.stringify(config));
    }
  }

  /**
   * Check if Log Mode is enabled.
   */
  async isEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config.enabled;
  }

  /**
   * Detect if text starts with a trigger phrase.
   * Uses longest-match-first strategy.
   */
  async detectTrigger(text: string): Promise<TriggerDetectionResult> {
    const config = await this.getConfig();

    if (!config.enabled) {
      return { detected: false };
    }

    const enabledTriggers = config.triggerPhrases.filter(t => t.enabled);
    if (enabledTriggers.length === 0) {
      return { detected: false };
    }

    // Sort by phrase length (longest first) for longest-match-first strategy
    const sortedTriggers = [...enabledTriggers].sort(
      (a, b) => b.phrase.length - a.phrase.length
    );

    const trimmedText = text.trim();
    const lowerText = trimmedText.toLowerCase();

    for (const trigger of sortedTriggers) {
      const lowerPhrase = trigger.phrase.toLowerCase();

      if (lowerText.startsWith(lowerPhrase)) {
        // Found a match - extract content after trigger phrase
        // Use trimmedText (not original) to ensure correct slicing
        let afterTrigger = trimmedText.slice(trigger.phrase.length);

        // Strip leading punctuation, whitespace, and non-letter characters
        afterTrigger = afterTrigger.replace(/^[^a-zA-Z0-9]+/, '');

        return {
          detected: true,
          trigger,
          content: afterTrigger,
        };
      }
    }

    return { detected: false };
  }

  /**
   * Find the mapping for a given app identifier.
   * Uses case-insensitive matching.
   */
  async findMappingForApp(appIdentifier: string): Promise<AppLogMapping | null> {
    const config = await this.getConfig();

    const lowerAppId = appIdentifier.toLowerCase();

    // Find matching mapping (case-insensitive)
    const mapping = config.appMappings.find(
      m => m.appIdentifier.toLowerCase() === lowerAppId
    );

    return mapping || null;
  }

  /**
   * Format a log entry with timestamp.
   * Format: "- [YYYY-MM-DD HH:mm] content"
   */
  formatLogEntry(content: string): string {
    const timestamp = formatTimestamp();
    return `- ${timestamp} ${content}`;
  }

  /**
   * Save a log entry to the appropriate file.
   * Falls back to clipboard if file write fails.
   * Includes retry logic for locked files.
   */
  async saveLogEntry(content: string, appIdentifier: string): Promise<LogEntryResult> {
    // Validate content is not empty (FR-013)
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      console.warn('[LogModeService] Attempted to save empty log entry');
      return {
        success: false,
        error: 'EMPTY_CONTENT: Cannot save empty log entry',
      };
    }

    // Find mapping for the app
    const mapping = await this.findMappingForApp(appIdentifier);

    if (!mapping) {
      return {
        success: false,
        error: 'NO_MAPPING: No file mapping configured for this app',
      };
    }

    // Format the log entry
    const formattedEntry = this.formatLogEntry(trimmedContent);

    // Retry logic for locked files (T051)
    const maxRetries = 2;
    const retryDelay = 500;
    let lastError: string = '';

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Attempt to append to file
        await tauriAPI.appendToFile(mapping.logFilePath, formattedEntry);

        return {
          success: true,
          filePath: mapping.logFilePath,
        };
      } catch (error) {
        lastError = String(error);
        console.error(`[LogModeService] Failed to save log entry (attempt ${attempt + 1}/${maxRetries + 1}):`, lastError);

        // If not the last attempt, wait before retrying
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    // All retries failed - fallback to clipboard
    console.error('[LogModeService] All retries failed, falling back to clipboard');
    try {
      await navigator.clipboard.writeText(formattedEntry);
      return {
        success: false,
        error: lastError,
        fallbackToClipboard: true,
      };
    } catch (clipboardError) {
      console.error('[LogModeService] Clipboard fallback also failed:', clipboardError);
      return {
        success: false,
        error: lastError,
        fallbackToClipboard: false,
      };
    }
  }

  /**
   * Validate a file path for use as a log destination.
   */
  async validatePath(path: string): Promise<PathValidation> {
    return tauriAPI.validateLogPath(path);
  }

  /**
   * Add a new trigger phrase.
   */
  async addTriggerPhrase(phrase: string): Promise<TriggerPhrase> {
    const config = await this.getConfig();

    const newTrigger: TriggerPhrase = {
      id: generateId(),
      phrase: phrase.trim(),
      enabled: true,
    };

    config.triggerPhrases.push(newTrigger);
    await this.saveConfig(config);

    return newTrigger;
  }

  /**
   * Update an existing trigger phrase.
   */
  async updateTriggerPhrase(id: string, updates: Partial<TriggerPhrase>): Promise<void> {
    const config = await this.getConfig();

    const index = config.triggerPhrases.findIndex(t => t.id === id);
    if (index !== -1) {
      config.triggerPhrases[index] = {
        ...config.triggerPhrases[index],
        ...updates,
      };
      await this.saveConfig(config);
    }
  }

  /**
   * Delete a trigger phrase.
   */
  async deleteTriggerPhrase(id: string): Promise<void> {
    const config = await this.getConfig();
    config.triggerPhrases = config.triggerPhrases.filter(t => t.id !== id);
    await this.saveConfig(config);
  }

  /**
   * Add a new app mapping.
   */
  async addAppMapping(
    appIdentifier: string,
    appDisplayName: string,
    filePath: string
  ): Promise<AppLogMapping> {
    const config = await this.getConfig();

    const newMapping: AppLogMapping = {
      id: generateId(),
      appIdentifier: appIdentifier.trim(),
      appDisplayName: appDisplayName.trim(),
      logFilePath: filePath.trim(),
      createdAt: new Date().toISOString(),
    };

    // Remove any existing mapping for this app
    config.appMappings = config.appMappings.filter(
      m => m.appIdentifier.toLowerCase() !== appIdentifier.toLowerCase()
    );

    config.appMappings.push(newMapping);
    await this.saveConfig(config);

    return newMapping;
  }

  /**
   * Update an existing app mapping.
   */
  async updateAppMapping(id: string, updates: Partial<AppLogMapping>): Promise<void> {
    const config = await this.getConfig();

    const index = config.appMappings.findIndex(m => m.id === id);
    if (index !== -1) {
      config.appMappings[index] = {
        ...config.appMappings[index],
        ...updates,
      };
      await this.saveConfig(config);
    }
  }

  /**
   * Delete an app mapping.
   */
  async deleteAppMapping(id: string): Promise<void> {
    const config = await this.getConfig();
    config.appMappings = config.appMappings.filter(m => m.id !== id);
    await this.saveConfig(config);
  }

  /**
   * Bootstrap store sync and listen for cross-window changes.
   */
  private async bootstrapStoreSync(): Promise<void> {
    if (!isTauriRuntime()) {
      cachedConfig = { ...DEFAULT_LOG_MODE_CONFIG };
      cacheInitialized = true;
      notifyListeners();
      return;
    }

    // Register settings change listener for cross-window sync
    if (!storeListenerRegistered) {
      storeListenerRegistered = true;
      try {
        await tauriAPI.onSettingsChanged(() => {
          void this.refreshFromStore();
        });
      } catch (e) {
        console.warn('[LogModeService] Failed to register settings-changed listener:', e);
      }
    }

    // Initial load
    await this.refreshFromStore();
  }

  /**
   * Refresh config from store.
   */
  private async refreshFromStore(): Promise<void> {
    try {
      const storeRaw = await tauriAPI.getStoreValue(LOG_MODE_CONFIG_KEY);
      const parsed = parseConfig(storeRaw);

      if (parsed) {
        // Migrate: ensure defaultLogDirectory exists
        if (!parsed.defaultLogDirectory) {
          parsed.defaultLogDirectory = await this.fetchDefaultLogDirectory();
          await tauriAPI.setStoreValue(LOG_MODE_CONFIG_KEY, JSON.stringify(parsed));
        }
        cachedConfig = parsed;
        cacheInitialized = true;
        notifyListeners();
      } else if (!cacheInitialized) {
        // Initialize with defaults if store is empty
        const defaultDir = await this.fetchDefaultLogDirectory();
        cachedConfig = { ...DEFAULT_LOG_MODE_CONFIG, defaultLogDirectory: defaultDir };
        cacheInitialized = true;
        await tauriAPI.setStoreValue(LOG_MODE_CONFIG_KEY, JSON.stringify(cachedConfig));
        notifyListeners();
      }
    } catch (e) {
      console.warn('[LogModeService] Failed to refresh from store:', e);
      if (!cacheInitialized) {
        cachedConfig = { ...DEFAULT_LOG_MODE_CONFIG };
        cacheInitialized = true;
        notifyListeners();
      }
    }
  }

  /**
   * Fetch the default log directory from the backend.
   */
  private async fetchDefaultLogDirectory(): Promise<string> {
    try {
      return await tauriAPI.getDefaultLogDirectory();
    } catch (e) {
      console.warn('[LogModeService] Failed to get default log directory:', e);
      return '';
    }
  }

  /**
   * Generate the default log file path for an app.
   * Uses the configured defaultLogDirectory.
   * @param appDisplayName Human-readable app name (e.g., "Chrome", "VS Code")
   * @returns Full path like "C:\Users\John\Documents\Trueears\chrome-log.md"
   */
  async getDefaultLogPath(appDisplayName: string): Promise<string> {
    const config = await this.getConfig();
    const baseDir = config.defaultLogDirectory || await this.fetchDefaultLogDirectory();

    // Sanitize app name for filename
    const sanitized = appDisplayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const filename = `${sanitized}-log.md`;

    // Use backslash for Windows paths, forward slash for others
    const separator = baseDir.includes('\\') ? '\\' : '/';
    return `${baseDir}${separator}${filename}`;
  }

  /**
   * Open the log file for a specific app mapping.
   */
  async openLogFile(filePath: string): Promise<void> {
    await tauriAPI.openLogFile(filePath);
  }
}

// Export singleton instance
export const logModeService = LogModeService.getInstance();
