import React, { useState, useEffect } from 'react';
import { TranscriptionSettings } from './settings/TranscriptionSettings';
import { LLMSettings } from './settings/LLMSettings';
import { AppProfilesSettings } from './settings/AppProfilesSettings';
import { PreferencesSettings } from './settings/PreferencesSettings';
import { LogModeSettings } from './settings/LogModeSettings';
import { AboutSettings } from './settings/AboutSettings';
import { AccountSection } from './auth/AccountSection';
import { OnboardingWizard } from './onboarding/OnboardingWizard';
import { LegalPrivacySettings } from './settings/LegalPrivacySettings';
import { LicenseSettings } from './settings/LicenseSettings';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../hooks/useAuth';
import { getCurrentWindow } from '@tauri-apps/api/window';

type SettingsTab =
  | 'transcription'
  | 'llm'
  | 'profiles'
  | 'logmode'
  | 'preferences'
  | 'account'
  | 'license'
  | 'legal'
  | 'about';

export const SettingsWindow: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('transcription');
  const [micPermissionGranted, setMicPermissionGranted] = useState<boolean | null>(null);
  const settings = useSettings();
  const auth = useAuth(); // Lift auth state to SettingsWindow level
  const { onboardingComplete, isKeyLoaded, theme } = settings;

  console.log('[SettingsWindow] Render state:', { onboardingComplete, isKeyLoaded });

  // If the WebView permission state was reset (e.g., clearing EBWebView// Placeholder to ensure correct content, will run view_file first complete but mic permission is not.
  // Detect this and re-show onboarding so the user can grant mic access.
  useEffect(() => {
    let cancelled = false;

    const checkMicPermission = async () => {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) {
          setMicPermissionGranted(true);
          return;
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasLabel = devices.some(
          (d) => d.kind === 'audioinput' && (d.label || '').trim().length > 0
        );
        if (!cancelled) {
          setMicPermissionGranted(hasLabel);
        }
      } catch (err) {
        console.warn('[SettingsWindow] Failed to check mic permission:', err);
        if (!cancelled) {
          setMicPermissionGranted(true);
        }
      }
    };

    checkMicPermission();
    return () => {
      cancelled = true;
    };
  }, []);

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
  }, [theme]);

  // Wait for settings to load
  if (!isKeyLoaded) {
    console.log('[SettingsWindow] Waiting for keys to load...');
    return (
      <div className={`w-screen h-screen ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-white'}`} />
    );
  }

  if (micPermissionGranted === null) {
    return (
      <div
        className={`w-screen h-screen ${settings.theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-white'}`}
      />
    );
  }

  // Show Onboarding Wizard if not complete
  if (!onboardingComplete || micPermissionGranted === false) {
    console.log('[SettingsWindow] Onboarding/permissions incomplete, showing wizard', {
      onboardingComplete,
      micPermissionGranted,
    });
    const initialStep =
      onboardingComplete && micPermissionGranted === false ? 'permissions' : undefined;
    return <OnboardingWizard initialStep={initialStep} />;
  }

  console.log('[SettingsWindow] Rendering main settings UI');
  const isDark = settings.theme === 'dark';

  return (
    <div
      className={`flex h-screen ${isDark ? 'bg-[#0a0a0a] text-gray-100' : 'bg-white text-gray-800'}`}
    >
      {/* Left Sidebar Navigation */}
      <div
        className={`w-64 border-r flex flex-col ${isDark ? 'border-[#333]' : 'border-gray-200'}`}
      >
        {/* Header */}
        <div className={`p-4 border-b ${isDark ? 'border-[#333]' : 'border-gray-200'}`}>
          <h1 className="text-lg font-bold">⚙️ Settings</h1>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Trueears Configuration
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          <button
            onClick={() => setActiveTab('transcription')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-3 cursor-pointer ${
              activeTab === 'transcription'
                ? isDark
                  ? 'bg-[#252525] text-gray-100 font-medium'
                  : 'bg-gray-100 text-gray-800 font-medium'
                : isDark
                  ? 'text-gray-400 hover:bg-[#252525] hover:text-gray-100'
                  : 'text-gray-500 hover:bg-gray-200 hover:text-gray-800'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
            Transcription
          </button>

          <button
            onClick={() => setActiveTab('llm')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-3 cursor-pointer ${
              activeTab === 'llm'
                ? isDark
                  ? 'bg-[#252525] text-gray-100 font-medium'
                  : 'bg-gray-100 text-gray-800 font-medium'
                : isDark
                  ? 'text-gray-400 hover:bg-[#252525] hover:text-gray-100'
                  : 'text-gray-500 hover:bg-gray-200 hover:text-gray-800'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            LLM Post-Processing
          </button>

          <button
            onClick={() => setActiveTab('profiles')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-3 cursor-pointer ${
              activeTab === 'profiles'
                ? isDark
                  ? 'bg-[#252525] text-gray-100 font-medium'
                  : 'bg-gray-100 text-gray-800 font-medium'
                : isDark
                  ? 'text-gray-400 hover:bg-[#252525] hover:text-gray-100'
                  : 'text-gray-500 hover:bg-gray-200 hover:text-gray-800'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            App Profiles
          </button>

          <button
            onClick={() => setActiveTab('logmode')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-3 cursor-pointer ${
              activeTab === 'logmode'
                ? isDark
                  ? 'bg-[#252525] text-gray-100 font-medium'
                  : 'bg-gray-100 text-gray-800 font-medium'
                : isDark
                  ? 'text-gray-400 hover:bg-[#252525] hover:text-gray-100'
                  : 'text-gray-500 hover:bg-gray-200 hover:text-gray-800'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Log Mode
          </button>

          <button
            onClick={() => setActiveTab('preferences')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-3 cursor-pointer ${
              activeTab === 'preferences'
                ? isDark
                  ? 'bg-[#252525] text-gray-100 font-medium'
                  : 'bg-gray-100 text-gray-800 font-medium'
                : isDark
                  ? 'text-gray-400 hover:bg-[#252525] hover:text-gray-100'
                  : 'text-gray-500 hover:bg-gray-200 hover:text-gray-800'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
            Preferences
          </button>

          <button
            onClick={() => setActiveTab('account')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-3 cursor-pointer ${
              activeTab === 'account'
                ? isDark
                  ? 'bg-[#252525] text-gray-100 font-medium'
                  : 'bg-gray-100 text-gray-800 font-medium'
                : isDark
                  ? 'text-gray-400 hover:bg-[#252525] hover:text-gray-100'
                  : 'text-gray-500 hover:bg-gray-200 hover:text-gray-800'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            Account
          </button>

          <button
            onClick={() => setActiveTab('license')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-3 cursor-pointer ${
              activeTab === 'license'
                ? isDark
                  ? 'bg-[#252525] text-gray-100 font-medium'
                  : 'bg-gray-100 text-gray-800 font-medium'
                : isDark
                  ? 'text-gray-400 hover:bg-[#252525] hover:text-gray-100'
                  : 'text-gray-500 hover:bg-gray-200 hover:text-gray-800'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
            License
          </button>

          <button
            onClick={() => setActiveTab('legal')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-3 cursor-pointer ${
              activeTab === 'legal'
                ? isDark
                  ? 'bg-[#252525] text-gray-100 font-medium'
                  : 'bg-gray-100 text-gray-800 font-medium'
                : isDark
                  ? 'text-gray-400 hover:bg-[#252525] hover:text-gray-100'
                  : 'text-gray-500 hover:bg-gray-200 hover:text-gray-800'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            Legal & Privacy
          </button>

          <button
            onClick={() => setActiveTab('about')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-3 cursor-pointer ${
              activeTab === 'about'
                ? isDark
                  ? 'bg-[#252525] text-gray-100 font-medium'
                  : 'bg-gray-100 text-gray-800 font-medium'
                : isDark
                  ? 'text-gray-400 hover:bg-[#252525] hover:text-gray-100'
                  : 'text-gray-500 hover:bg-gray-200 hover:text-gray-800'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
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
            microphoneId={settings.microphoneId}
            saveMicrophoneId={settings.saveMicrophoneId}
          />
        )}
        {activeTab === 'llm' && <LLMSettings {...settings} theme={settings.theme} />}
        {activeTab === 'profiles' && <AppProfilesSettings theme={settings.theme} />}
        {activeTab === 'logmode' && <LogModeSettings isDark={isDark} />}
        {activeTab === 'preferences' && (
          <PreferencesSettings
            theme={settings.theme}
            saveTheme={settings.saveTheme}
            recordingMode={settings.recordingMode}
            saveRecordingMode={settings.saveRecordingMode}
          />
        )}
        {activeTab === 'account' && (
          <AccountSection
            theme={settings.theme}
            isAuthenticated={auth.isAuthenticated}
            isLoading={auth.isLoading}
            user={auth.user}
            login={auth.login}
            logout={auth.logout}
            refreshAuthState={auth.refreshAuthState}
          />
        )}
        {activeTab === 'license' && (
          <LicenseSettings
            theme={settings.theme}
            isAuthenticated={auth.isAuthenticated}
            login={auth.login}
          />
        )}
        {activeTab === 'legal' && <LegalPrivacySettings theme={settings.theme} />}
        {activeTab === 'about' && <AboutSettings theme={settings.theme} />}
      </div>
    </div>
  );
};
