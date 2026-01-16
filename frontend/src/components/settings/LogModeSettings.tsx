/**
 * LogModeSettings - Combined settings panel for Log Mode.
 *
 * Combines TriggerPhraseList and AppMappingList with master enable/disable toggle.
 *
 * @feature 004-context-log
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TriggerPhraseList } from './TriggerPhraseList';
import { AppMappingList } from './AppMappingList';
import { logModeService } from '../../services/logModeService';
import { LogModeConfig, TriggerPhrase, AppLogMapping } from '../../types/logMode';
import { tauriAPI } from '../../utils/tauriApi';

interface LogModeSettingsProps {
  isDark: boolean;
}

export const LogModeSettings: React.FC<LogModeSettingsProps> = ({ isDark }) => {
  const [config, setConfig] = useState<LogModeConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingDirectory, setIsEditingDirectory] = useState(false);
  const [directoryInput, setDirectoryInput] = useState('');
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [isValidatingDirectory, setIsValidatingDirectory] = useState(false);
  const directoryInputRef = useRef<HTMLInputElement>(null);

  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      setIsLoading(true);
      const loaded = await logModeService.getConfig();
      setConfig(loaded);
      setIsLoading(false);
    };
    loadConfig();

    // Subscribe to cross-window changes
    const unsubscribe = logModeService.onConfigChange(() => {
      loadConfig();
    });

    return () => unsubscribe();
  }, []);

  // Save config helper
  const saveConfig = useCallback(async (updates: Partial<LogModeConfig>) => {
    if (!config) return;
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    await logModeService.saveConfig(newConfig);
  }, [config]);

  // Master toggle
  const handleToggleEnabled = useCallback(async () => {
    if (!config) return;
    await saveConfig({ enabled: !config.enabled });
  }, [config, saveConfig]);

  // Trigger phrase handlers
  const handleAddPhrase = useCallback(async (phrase: string) => {
    if (!config) return;
    const newPhrase: TriggerPhrase = {
      id: crypto.randomUUID(),
      phrase,
      enabled: true,
    };
    await saveConfig({
      triggerPhrases: [...config.triggerPhrases, newPhrase],
    });
  }, [config, saveConfig]);

  const handleUpdatePhrase = useCallback(async (id: string, updates: Partial<TriggerPhrase>) => {
    if (!config) return;
    await saveConfig({
      triggerPhrases: config.triggerPhrases.map(p =>
        p.id === id ? { ...p, ...updates } : p
      ),
    });
  }, [config, saveConfig]);

  const handleDeletePhrase = useCallback(async (id: string) => {
    if (!config) return;
    await saveConfig({
      triggerPhrases: config.triggerPhrases.filter(p => p.id !== id),
    });
  }, [config, saveConfig]);

  // App mapping handlers
  const handleUpdateMapping = useCallback(async (id: string, updates: Partial<AppLogMapping>) => {
    if (!config) return;
    await saveConfig({
      appMappings: config.appMappings.map(m =>
        m.id === id ? { ...m, ...updates } : m
      ),
    });
  }, [config, saveConfig]);

  const handleDeleteMapping = useCallback(async (id: string) => {
    if (!config) return;
    await saveConfig({
      appMappings: config.appMappings.filter(m => m.id !== id),
    });
  }, [config, saveConfig]);

  // Default directory handlers
  const handleStartEditDirectory = useCallback(() => {
    if (!config) return;
    setDirectoryInput(config.defaultLogDirectory);
    setDirectoryError(null);
    setIsEditingDirectory(true);
    setTimeout(() => directoryInputRef.current?.focus(), 0);
  }, [config]);

  const handleCancelEditDirectory = useCallback(() => {
    setIsEditingDirectory(false);
    setDirectoryError(null);
  }, []);

  const handleSaveDirectory = useCallback(async () => {
    if (!config) return;
    const trimmedPath = directoryInput.trim();

    if (!trimmedPath) {
      setDirectoryError('Please enter a directory path');
      return;
    }

    setIsValidatingDirectory(true);
    setDirectoryError(null);

    try {
      // Validate the directory path
      const validation = await tauriAPI.validateLogPath(trimmedPath + '\\test.md');

      if (!validation.parentExists) {
        setDirectoryError('Directory does not exist');
        setIsValidatingDirectory(false);
        return;
      }

      if (!validation.writable) {
        setDirectoryError('Directory is not writable');
        setIsValidatingDirectory(false);
        return;
      }

      // Save the new default directory
      await saveConfig({ defaultLogDirectory: trimmedPath });
      setIsEditingDirectory(false);
    } catch (err) {
      setDirectoryError('Failed to validate directory');
    } finally {
      setIsValidatingDirectory(false);
    }
  }, [config, directoryInput, saveConfig]);

  const handleResetDirectory = useCallback(async () => {
    if (!config) return;
    try {
      const defaultDir = await tauriAPI.getDefaultLogDirectory();
      await saveConfig({ defaultLogDirectory: defaultDir });
    } catch (err) {
      console.error('[LogModeSettings] Failed to reset default directory:', err);
    }
  }, [config, saveConfig]);

  if (isLoading || !config) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className={`flex items-center justify-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Log Mode</h2>

      <div className="space-y-6">
        {/* Master Enable/Disable Toggle */}
        <div>
          <label className={`text-sm font-medium mb-3 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Enable Log Mode</label>
          <div className={`flex items-center justify-between p-4 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Use trigger phrases like "Log" or "Note to self" to save dictation directly to markdown files
            </p>
            <button
              onClick={handleToggleEnabled}
              className={`
                relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-4 cursor-pointer
                ${config.enabled
                  ? 'bg-emerald-500'
                  : isDark ? 'bg-gray-600' : 'bg-gray-300'
                }
              `}
            >
              <span
                className={`
                  absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow
                  transition-transform
                  ${config.enabled ? 'translate-x-5' : 'translate-x-0'}
                `}
              />
            </button>
          </div>
        </div>

        {/* Content - dimmed when disabled */}
        <div className={config.enabled ? '' : 'opacity-50 pointer-events-none'}>
          {/* Default Log Directory Section */}
          <div className="mb-8">
            <label className={`text-sm font-medium mb-3 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Default Log Directory</label>
            <div className={`p-4 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
              {isEditingDirectory ? (
                <div className="space-y-2">
                  <input
                    ref={directoryInputRef}
                    type="text"
                    value={directoryInput}
                    onChange={(e) => {
                      setDirectoryInput(e.target.value);
                      setDirectoryError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveDirectory();
                      if (e.key === 'Escape') handleCancelEditDirectory();
                    }}
                    placeholder="C:\Users\You\Documents\Scribe"
                    className={`
                      w-full px-3 py-2 text-sm rounded border
                      outline-none transition-colors
                      ${isDark
                        ? 'bg-gray-700 text-white placeholder-gray-400 border-gray-600 focus:border-emerald-500'
                        : 'bg-white text-gray-800 placeholder-gray-400 border-gray-300 focus:border-emerald-500'
                      }
                    `}
                    disabled={isValidatingDirectory}
                  />
                  {directoryError && (
                    <p className="text-xs text-rose-500">{directoryError}</p>
                  )}
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={handleCancelEditDirectory}
                      disabled={isValidatingDirectory}
                      className={`
                        px-3 py-1.5 text-xs font-medium rounded cursor-pointer transition-colors
                        ${isDark
                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                        }
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveDirectory}
                      disabled={isValidatingDirectory || !directoryInput.trim()}
                      className={`
                        px-3 py-1.5 text-xs font-medium rounded cursor-pointer transition-colors
                        bg-emerald-600 hover:bg-emerald-500 text-white
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      {isValidatingDirectory ? 'Validating...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-mono truncate ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                      {config.defaultLogDirectory || '(Not set)'}
                    </p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      New app log files will be created here
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={handleStartEditDirectory}
                      className={`
                        px-3 py-1.5 text-xs font-medium rounded cursor-pointer transition-colors
                        ${isDark
                          ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                        }
                      `}
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleResetDirectory}
                      className={`
                        px-3 py-1.5 text-xs font-medium rounded cursor-pointer transition-colors
                        ${isDark
                          ? 'text-gray-400 hover:text-gray-200'
                          : 'text-gray-500 hover:text-gray-700'
                        }
                      `}
                      title="Reset to default"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Trigger Phrases Section */}
          <div className="mb-8">
            <label className={`text-sm font-medium mb-3 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Trigger Phrases</label>
            <TriggerPhraseList
              phrases={config.triggerPhrases}
              onAdd={handleAddPhrase}
              onUpdate={handleUpdatePhrase}
              onDelete={handleDeletePhrase}
              isDark={isDark}
            />
          </div>

          {/* App Mappings Section */}
          <div>
            <label className={`text-sm font-medium mb-3 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>App Mappings</label>
            <AppMappingList
              mappings={config.appMappings}
              onUpdate={handleUpdateMapping}
              onDelete={handleDeleteMapping}
              isDark={isDark}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
