import React from 'react';

export const AboutSettings: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto p-8">
      <h2 className="text-2xl font-bold mb-6">About Scribe</h2>
      
      <div className="space-y-6 text-gray-300">
        <div>
          <p className="text-sm text-gray-500 mb-1">Version</p>
          <p className="text-lg font-mono">0.0.0</p>
        </div>

        <div>
          <p className="text-sm">
            Minimalist AI-powered voice dictation with context-aware LLM formatting.
          </p>
        </div>

        <div className="pt-4 border-t border-white/10">
          <h3 className="font-medium mb-3 text-white">Keyboard Shortcuts</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span>Toggle recording</span>
              <kbd className="px-2 py-1 bg-white/10 rounded font-mono text-xs">Ctrl+Shift+K</kbd>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span>Toggle settings (open/close)</span>
              <kbd className="px-2 py-1 bg-white/10 rounded font-mono text-xs">Ctrl+Shift+L</kbd>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-white/10">
          <h3 className="font-medium mb-3 text-white">Features</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <span>Speech-to-text transcription using Groq's Whisper models</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <span>LLM post-processing for context-aware formatting</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <span>App-specific system prompts for tailored output</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <span>Global hotkeys for instant dictation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <span>Automatic clipboard-based pasting</span>
            </li>
          </ul>
        </div>

        <div className="pt-4 border-t border-white/10">
          <p className="text-xs text-gray-600">
            Built with Tauri, React, and Rust
          </p>
        </div>
      </div>
    </div>
  );
};
