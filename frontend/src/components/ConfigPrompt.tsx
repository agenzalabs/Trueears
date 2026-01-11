/**
 * ConfigPrompt - First-time app configuration prompt for Log Mode.
 *
 * Shown when Log Mode is triggered in an unmapped app.
 * User can enter a file path to save logs for this app.
 *
 * @feature 004-context-log
 */

import React, { useState, useRef, useEffect } from 'react';
import { logModeService } from '../services/logModeService';
import { hasAllowedExtension, ALLOWED_LOG_EXTENSIONS } from '../types/logMode';

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
  isDark: boolean;
}

export const ConfigPrompt: React.FC<ConfigPromptProps> = ({
  appIdentifier: _appIdentifier,
  appDisplayName,
  pendingContent,
  onConfirm,
  onCancel,
  isDark,
}) => {
  const [filePath, setFilePath] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isLoadingDefault, setIsLoadingDefault] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load default path on mount
  useEffect(() => {
    const loadDefaultPath = async () => {
      try {
        const defaultPath = await logModeService.getDefaultLogPath(appDisplayName);
        setFilePath(defaultPath);
      } catch (e) {
        console.warn('[ConfigPrompt] Failed to load default path:', e);
      } finally {
        setIsLoadingDefault(false);
      }
    };
    loadDefaultPath();
  }, [appDisplayName]);

  // Focus input after default path is loaded
  useEffect(() => {
    if (!isLoadingDefault) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isLoadingDefault]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedPath = filePath.trim();

    if (!trimmedPath) {
      setError('Please enter a file path');
      return;
    }

    // Check extension
    if (!hasAllowedExtension(trimmedPath)) {
      setError(`File must end with ${ALLOWED_LOG_EXTENSIONS.join(', ')}`);
      return;
    }

    // Validate path
    setIsValidating(true);
    try {
      const validation = await logModeService.validatePath(trimmedPath);

      if (!validation.valid) {
        setError(validation.errorMessage || 'Invalid path');
        setIsValidating(false);
        return;
      }

      // Path is valid - confirm
      onConfirm(trimmedPath);
    } catch (_err) {
      setError('Failed to validate path');
      setIsValidating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  // Truncate content preview
  const contentPreview = pendingContent.length > 50
    ? pendingContent.substring(0, 50) + '...'
    : pendingContent;

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center px-4 py-2"
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1 w-full">
        <svg
          className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <span className={`text-xs font-medium ${isDark ? 'text-white/90' : 'text-gray-800'}`}>
          Set up Log Mode for {appDisplayName}
        </span>
      </div>

      {/* Context explanation */}
      <div className={`text-xs mb-2 w-full ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
        Choose where to save voice notes from this app:
      </div>

      {/* Content Preview */}
      <div
        className={`text-xs mb-2 w-full truncate ${isDark ? 'text-white/50' : 'text-gray-500'}`}
        title={pendingContent}
      >
        "{contentPreview}"
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2">
        {/* File Path Input */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={filePath}
            onChange={(e) => {
              setFilePath(e.target.value);
              setError(null);
            }}
            placeholder="C:\Notes\dev-log.md"
            className={`
              flex-1 px-2 py-1 text-xs rounded
              outline-none transition-colors
              ${isDark
                ? 'bg-white/10 text-white placeholder-white/30 border border-white/20 focus:border-white/40'
                : 'bg-gray-100 text-gray-800 placeholder-gray-400 border border-gray-300 focus:border-gray-500'
              }
            `}
            disabled={isValidating}
          />
          <button
            type="submit"
            disabled={isValidating || isLoadingDefault || !filePath.trim()}
            className={`
              px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer
              ${isDark
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white disabled:bg-white/10 disabled:text-white/30 disabled:cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed'
              }
            `}
          >
            {isValidating ? '...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            }}
            disabled={isValidating}
            className={`
              px-2 py-1 text-xs font-medium rounded transition-colors cursor-pointer
              ${isDark
                ? 'bg-white/10 hover:bg-white/20 text-white/70 disabled:cursor-not-allowed'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-600 disabled:cursor-not-allowed'
              }
            `}
          >
            Skip
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-xs text-rose-500">
            {error}
          </div>
        )}

        {/* Help Text */}
        <div className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
          <strong>Save</strong> to remember this path. <strong>Skip</strong> copies to clipboard instead.
        </div>
      </form>
    </div>
  );
};
