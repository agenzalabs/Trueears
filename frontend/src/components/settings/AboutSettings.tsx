import React from 'react';
import { useAppUpdate } from '../../hooks/useAppUpdate';

// Declare the global version injected by Vite
declare const __APP_VERSION__: string;

interface AboutSettingsProps {
  theme: 'light' | 'dark';
}

export const AboutSettings: React.FC<AboutSettingsProps> = ({ theme }) => {
  const isDark = theme === 'dark';
  const { status, isChecking, isDownloading, isReady, installError, check, installAndRestart } = useAppUpdate();

  const buttonClass = `px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
    isDark
      ? 'bg-[#1a1a1a] border-[#333] text-gray-200 hover:bg-[#252525]'
      : 'bg-white border-gray-300 text-gray-800 hover:bg-gray-50'
  }`;

  const updateStatusLine = () => {
    if (isDownloading) {
      const percent = status.progress ?? 0;
      return `Downloading ${status.version ?? ''} — ${percent}%`;
    }
    if (isReady) return `Version ${status.version} is ready to install`;
    if (isChecking) return 'Checking for updates…';
    if (status.state === 'error') return status.error || 'Update check failed';
    return 'Up to date';
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>About Trueears</h2>

      <div className={`space-y-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        <div>
          <p className={`text-sm mb-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Version</p>
          <p className={`text-lg font-mono ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{__APP_VERSION__}</p>

          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={check}
              disabled={isChecking || isDownloading}
              className={buttonClass}
            >
              {isChecking ? 'Checking…' : 'Check for updates'}
            </button>

            {isReady && (
              <button
                type="button"
                onClick={installAndRestart}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                Restart &amp; install
              </button>
            )}

            <span
              role="status"
              aria-live="polite"
              className={`text-xs ${status.state === 'error' ? 'text-rose-500' : isDark ? 'text-gray-500' : 'text-gray-500'}`}
            >
              {updateStatusLine()}
            </span>
          </div>

          {isDownloading && (
            <div
              role="progressbar"
              aria-label="Update download progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={status.progress ?? 0}
              className={`mt-2 h-1 w-full max-w-xs rounded-full overflow-hidden ${isDark ? 'bg-[#252525]' : 'bg-gray-200'}`}
            >
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${status.progress ?? 0}%` }}
              />
            </div>
          )}

          {isReady && status.notes && (
            <p className={`mt-2 text-xs whitespace-pre-line ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {status.notes}
            </p>
          )}

          {installError && (
            <p className="mt-2 text-xs text-rose-500">{installError}</p>
          )}
        </div>

        <div>
          <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Minimalist AI-powered voice dictation with context-aware LLM formatting.
          </p>
        </div>

        <div className={`pt-4 border-t ${isDark ? 'border-[#333]' : 'border-gray-300'}`}>
          <h3 className={`font-medium mb-3 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Keyboard Shortcuts</h3>
          <div className="space-y-2 text-sm">
            <div className={`flex items-center justify-between p-3 rounded-lg border ${isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
              <span className={isDark ? 'text-gray-200' : 'text-gray-800'}>Toggle recording</span>
              <kbd className={`px-2 py-1 rounded font-mono text-xs border ${isDark ? 'bg-[#252525] text-gray-200 border-[#444]' : 'bg-gray-200 text-gray-800 border-gray-300'}`}>Ctrl+Shift+K</kbd>
            </div>
            <div className={`flex items-center justify-between p-3 rounded-lg border ${isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
              <span className={isDark ? 'text-gray-200' : 'text-gray-800'}>Toggle settings (open/close)</span>
              <kbd className={`px-2 py-1 rounded font-mono text-xs border ${isDark ? 'bg-[#252525] text-gray-200 border-[#444]' : 'bg-gray-200 text-gray-800 border-gray-300'}`}>Ctrl+Shift+L</kbd>
            </div>
          </div>
        </div>

        <div className={`pt-4 border-t ${isDark ? 'border-[#333]' : 'border-gray-300'}`}>
          <h3 className={`font-medium mb-3 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Features</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">✓</span>
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Speech-to-text transcription using Groq's Whisper models</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">✓</span>
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>LLM post-processing for context-aware formatting</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">✓</span>
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>App-specific system prompts for tailored output</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">✓</span>
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Global hotkeys for instant dictation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">✓</span>
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Automatic clipboard-based pasting</span>
            </li>
          </ul>
        </div>

        <div className={`pt-4 border-t ${isDark ? 'border-[#333]' : 'border-gray-300'}`}>
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            Built with Tauri, React, and Rust
          </p>
        </div>
      </div>
    </div>
  );
};
