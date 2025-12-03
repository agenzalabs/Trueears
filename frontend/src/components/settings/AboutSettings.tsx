import React from 'react';

interface AboutSettingsProps {
  theme: 'light' | 'dark';
}

export const AboutSettings: React.FC<AboutSettingsProps> = ({ theme }) => {
  const isDark = theme === 'dark';
  
  return (
    <div className="max-w-2xl mx-auto p-8">
      <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>About Scribe</h2>
      
      <div className={`space-y-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        <div>
          <p className={`text-sm mb-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Version</p>
          <p className={`text-lg font-mono ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>0.1.0</p>
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
