import React, { useState, useEffect } from 'react';
import { TranscriptionSettings } from './settings/TranscriptionSettings';
import { LLMSettings } from './settings/LLMSettings';
import { AppProfilesSettings } from './settings/AppProfilesSettings';
import { AboutSettings } from './settings/AboutSettings';
import { useSettings } from '../hooks/useSettings';
import { getCurrentWindow } from '@tauri-apps/api/window';

type SettingsTab = 'transcription' | 'llm' | 'profiles' | 'about';

export const SettingsWindow: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('transcription');
  const settings = useSettings();

  const handleClose = async () => {
    try {
      const window = getCurrentWindow();
      console.log('[SettingsWindow] Closing window');
      await window.close();
    } catch (error) {
      console.error('[SettingsWindow] Failed to close window:', error);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+L to close (toggle behavior)
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white">
      {/* Left Sidebar Navigation */}
      <div className="w-64 border-r border-white/10 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <h1 className="text-lg font-bold">⚙️ Settings</h1>
          <p className="text-xs text-gray-500 mt-1">Scribe Configuration</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          <button
            onClick={() => setActiveTab('transcription')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-3 ${
              activeTab === 'transcription'
                ? 'bg-white/10 text-white font-medium'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            Transcription
          </button>

          <button
            onClick={() => setActiveTab('llm')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-3 ${
              activeTab === 'llm'
                ? 'bg-white/10 text-white font-medium'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            LLM Post-Processing
          </button>

          <button
            onClick={() => setActiveTab('profiles')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-3 ${
              activeTab === 'profiles'
                ? 'bg-white/10 text-white font-medium'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            App Profiles
          </button>

          <button
            onClick={() => setActiveTab('about')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-3 ${
              activeTab === 'about'
                ? 'bg-white/10 text-white font-medium'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            About
          </button>
        </nav>

      </div>

      {/* Right Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'transcription' && <TranscriptionSettings {...settings} />}
        {activeTab === 'llm' && <LLMSettings {...settings} />}
        {activeTab === 'profiles' && <AppProfilesSettings />}
        {activeTab === 'about' && <AboutSettings />}
      </div>
    </div>
  );
};
