import React, { useState, useEffect } from 'react';
import { TranscriptionSettings } from './settings/TranscriptionSettings';
import { LLMSettings } from './settings/LLMSettings';
import { AppProfilesSettings } from './settings/AppProfilesSettings';
import { AppearanceSettings } from './settings/AppearanceSettings';
import { AboutSettings } from './settings/AboutSettings';
import { OnboardingWizard } from './onboarding/OnboardingWizard';
import { useSettings } from '../hooks/useSettings';
import { getCurrentWindow } from '@tauri-apps/api/window';

type SettingsTab = 'transcription' | 'llm' | 'profiles' | 'appearance' | 'about';

export const SettingsWindow: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('transcription');
  const settings = useSettings();
  const { onboardingComplete, isKeyLoaded } = settings;

  console.log('[SettingsWindow] Render state:', { onboardingComplete, isKeyLoaded });

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

  // Handle window visibility and theme
  useEffect(() => {
    console.log('[SettingsWindow] Component mounted, executing visibility logic');
    
    // Set background based on theme
    const bgColor = settings.theme === 'dark' ? '#0a0a0a' : '#ffffff';
    document.documentElement.style.background = bgColor;
    document.body.style.background = bgColor;
    document.getElementById('root')!.style.background = bgColor;

    const showWindow = () => {
        // Use double requestAnimationFrame to ensure the background is painted
        // before revealing the window. This prevents a flash.
        requestAnimationFrame(() => {
            requestAnimationFrame(async () => {
                try {
                    const window = getCurrentWindow();
                    console.log('[SettingsWindow] Revealing window after paint');
                    await window.show();
                    await window.setFocus();
                } catch (err) {
                    console.error('[SettingsWindow] Failed to show settings window:', err);
                }
            });
        });
    };
    showWindow();
  }, [settings.theme]);

  // Wait for settings to load
  if (!isKeyLoaded) {
    console.log('[SettingsWindow] Waiting for keys to load...');
    return <div className={`w-screen h-screen ${settings.theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-white'}`} />;
  }

  // Show Onboarding Wizard if not complete
  if (!onboardingComplete) {
    console.log('[SettingsWindow] Onboarding incomplete, showing wizard');
    return <OnboardingWizard />;
  }

  console.log('[SettingsWindow] Rendering main settings UI');
  const isDark = settings.theme === 'dark';
  
  return (
    <div className={`flex h-screen ${isDark ? 'bg-[#0a0a0a] text-gray-100' : 'bg-white text-gray-800'}`}>
      {/* Left Sidebar Navigation */}
      <div className={`w-64 border-r flex flex-col ${isDark ? 'border-[#333]' : 'border-gray-200'}`}>
        {/* Header */}
        <div className={`p-4 border-b ${isDark ? 'border-[#333]' : 'border-gray-200'}`}>
          <h1 className="text-lg font-bold">⚙️ Settings</h1>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Scribe Configuration</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          <button
            onClick={() => setActiveTab('transcription')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-3 cursor-pointer ${
              activeTab === 'transcription'
                ? isDark ? 'bg-[#252525] text-gray-100 font-medium' : 'bg-gray-100 text-gray-800 font-medium'
                : isDark ? 'text-gray-400 hover:bg-[#252525] hover:text-gray-100' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-800'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            Transcription
          </button>

          <button
            onClick={() => setActiveTab('llm')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-3 cursor-pointer ${
              activeTab === 'llm'
                ? isDark ? 'bg-[#252525] text-gray-100 font-medium' : 'bg-gray-100 text-gray-800 font-medium'
                : isDark ? 'text-gray-400 hover:bg-[#252525] hover:text-gray-100' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-800'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            LLM Post-Processing
          </button>

          <button
            onClick={() => setActiveTab('profiles')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-3 cursor-pointer ${
              activeTab === 'profiles'
                ? isDark ? 'bg-[#252525] text-gray-100 font-medium' : 'bg-gray-100 text-gray-800 font-medium'
                : isDark ? 'text-gray-400 hover:bg-[#252525] hover:text-gray-100' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-800'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            App Profiles
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-3 cursor-pointer ${
              activeTab === 'appearance'
                ? isDark ? 'bg-[#252525] text-gray-100 font-medium' : 'bg-gray-100 text-gray-800 font-medium'
                : isDark ? 'text-gray-400 hover:bg-[#252525] hover:text-gray-100' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-800'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            Appearance
          </button>

          <button
            onClick={() => setActiveTab('about')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-3 cursor-pointer ${
              activeTab === 'about'
                ? isDark ? 'bg-[#252525] text-gray-100 font-medium' : 'bg-gray-100 text-gray-800 font-medium'
                : isDark ? 'text-gray-400 hover:bg-[#252525] hover:text-gray-100' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-800'
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
        {activeTab === 'transcription' && (
          <TranscriptionSettings 
            apiKey={settings.apiKey}
            model={settings.model}
            saveKey={settings.saveApiKey}
            saveModel={settings.saveGroqModel}
            onboardingComplete={settings.onboardingComplete}
            markOnboardingComplete={settings.markOnboardingComplete}
            language={settings.language}
            autoDetectLanguage={settings.autoDetectLanguage}
            saveLanguage={settings.saveLanguage}
            saveAutoDetectLanguage={settings.saveAutoDetectLanguage}
            theme={settings.theme}
          />
        )}
        {activeTab === 'llm' && <LLMSettings {...settings} theme={settings.theme} />}
        {activeTab === 'profiles' && <AppProfilesSettings theme={settings.theme} />}
        {activeTab === 'appearance' && <AppearanceSettings theme={settings.theme} saveTheme={settings.saveTheme} />}
        {activeTab === 'about' && <AboutSettings theme={settings.theme} />}
      </div>
    </div>
  );
};
