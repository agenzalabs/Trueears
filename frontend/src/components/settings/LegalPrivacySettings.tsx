import React, { useState } from 'react';

interface LegalPrivacySettingsProps {
  theme: 'light' | 'dark';
}

type ExpandedSection = 'terms' | 'privacy' | 'data' | null;

export const LegalPrivacySettings: React.FC<LegalPrivacySettingsProps> = ({ theme }) => {
  const isDark = theme === 'dark';
  const [expandedSection, setExpandedSection] = useState<ExpandedSection>(null);

  const legalDocsLastUpdated = 'January 16, 2026';
  const dataControlsLastUpdated = 'January 16, 2026';

  const toggleSection = (section: ExpandedSection) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
        Legal & Privacy
      </h2>
      <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        Review our terms, privacy policy, and understand how your data is used.
      </p>

      <div className="space-y-4">
        {/* Terms of Service */}
        <div className={`rounded-lg border ${isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
          <button
            onClick={() => toggleSection('terms')}
            className={`w-full flex items-center justify-between p-4 text-left cursor-pointer ${isDark ? 'hover:bg-[#252525]' : 'hover:bg-gray-100'} rounded-lg transition-colors`}
          >
            <div className="flex items-center gap-3">
              <svg className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div>
                <h3 className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Terms of Service</h3>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  Last updated - {legalDocsLastUpdated}
                </p>
              </div>
            </div>
            <svg
              className={`w-5 h-5 transition-transform ${expandedSection === 'terms' ? 'rotate-180' : ''} ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedSection === 'terms' && (
            <div className={`px-4 pb-4 pt-0 border-t ${isDark ? 'border-[#333]' : 'border-gray-200'}`}>
              <div className={`mt-4 text-sm space-y-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <p>By downloading, installing, or using Trueears, you agree to be bound by these Terms of Service.</p>

                <h4 className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>User Responsibilities</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Use the App only for lawful purposes</li>
                  <li>Not use the App to tranTrueears content that violates others' rights</li>
                  <li>Provide your own API keys for speech-to-text services</li>
                  <li>Keep your API keys secure and confidential</li>
                </ul>

                <h4 className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Disclaimer of Warranties</h4>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  The App is provided "AS IS" without warranties of any kind. We do not warrant that the App will be error-free or that transcription results will be accurate.
                </p>

                <h4 className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Limitation of Liability</h4>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  In no event shall the developers be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the App.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Privacy Policy */}
        <div className={`rounded-lg border ${isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
          <button
            onClick={() => toggleSection('privacy')}
            className={`w-full flex items-center justify-between p-4 text-left cursor-pointer ${isDark ? 'hover:bg-[#252525]' : 'hover:bg-gray-100'} rounded-lg transition-colors`}
          >
            <div className="flex items-center gap-3">
              <svg className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <div>
                <h3 className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Privacy Policy</h3>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  Last updated - {legalDocsLastUpdated}
                </p>
              </div>
            </div>
            <svg
              className={`w-5 h-5 transition-transform ${expandedSection === 'privacy' ? 'rotate-180' : ''} ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedSection === 'privacy' && (
            <div className={`px-4 pb-4 pt-0 border-t ${isDark ? 'border-[#333]' : 'border-gray-200'}`}>
              <div className={`mt-4 text-sm space-y-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <p>Trueears is committed to protecting your privacy. This policy explains what information we collect and how we use it.</p>

                <h4 className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Third-Party Services</h4>
                <p>Your audio is sent to third-party services (like Groq) for transcription. Please review their privacy policies.</p>

                <h4 className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>What We Do NOT Collect</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>We do NOT collect personal identification information</li>
                  <li>We do NOT collect usage analytics or telemetry</li>
                  <li>We do NOT store your audio recordings</li>
                  <li>We do NOT have access to your API keys</li>
                </ul>

                <h4 className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Data Security</h4>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  API keys are stored using secure storage. No data is transmitted to our servers. All processing happens locally or through encrypted connections.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Data Controls */}
        <div className={`rounded-lg border ${isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
          <button
            onClick={() => toggleSection('data')}
            className={`w-full flex items-center justify-between p-4 text-left cursor-pointer ${isDark ? 'hover:bg-[#252525]' : 'hover:bg-gray-100'} rounded-lg transition-colors`}
          >
            <div className="flex items-center gap-3">
              <svg className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
              <div>
                <h3 className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Data Controls</h3>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  Last updated - {dataControlsLastUpdated}
                </p>
              </div>
            </div>
            <svg
              className={`w-5 h-5 transition-transform ${expandedSection === 'data' ? 'rotate-180' : ''} ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedSection === 'data' && (
            <div className={`px-4 pb-4 pt-0 border-t ${isDark ? 'border-[#333]' : 'border-gray-200'}`}>
              <div className="mt-4 space-y-3">
                <DataItem
                  isDark={isDark}
                  icon="mic"
                  title="Microphone Audio"
                  description="Captured during dictation, sent to Groq for transcription"
                  storage="Not stored - processed in real-time and discarded"
                />
                <DataItem
                  isDark={isDark}
                  icon="clipboard"
                  title="Clipboard Content"
                  description="Read when using select-to-transform features"
                  storage="Not stored - read only when initiated, then discarded"
                />
                <DataItem
                  isDark={isDark}
                  icon="window"
                  title="Active Window Info"
                  description="Detected to provide context-aware pasting"
                  storage="Session only - not persisted to disk"
                />
                <DataItem
                  isDark={isDark}
                  icon="apps"
                  title="Installed Applications"
                  description="Scanned for app-specific profiles"
                  storage="Cached locally on your device only"
                />
                <DataItem
                  isDark={isDark}
                  icon="key"
                  title="API Keys"
                  description="Your keys for Groq and other services"
                  storage="Stored securely on your device, never transmitted to us"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface DataItemProps {
  isDark: boolean;
  icon: 'mic' | 'clipboard' | 'window' | 'apps' | 'key';
  title: string;
  description: string;
  storage: string;
}

const DataItem: React.FC<DataItemProps> = ({ isDark, icon, title, description, storage }) => {
  const iconPaths: Record<string, string> = {
    mic: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z',
    clipboard: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    window: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    apps: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
    key: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
  };

  return (
    <div className={`p-3 rounded-lg ${isDark ? 'bg-[#252525]' : 'bg-white'} border ${isDark ? 'border-[#333]' : 'border-gray-200'}`}>
      <div className="flex items-start gap-3">
        <svg className={`w-4 h-4 mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPaths[icon]} />
        </svg>
        <div className="flex-1">
          <h4 className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{title}</h4>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{description}</p>
          <p className={`text-xs mt-1 ${isDark ? 'text-emerald-400/80' : 'text-emerald-600'}`}>{storage}</p>
        </div>
      </div>
    </div>
  );
};
