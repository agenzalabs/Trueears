import React, { useState, useEffect } from 'react';
import { CustomSelect } from '../CustomSelect';
import { GROQ_MODELS } from '../../hooks/useSettings';

interface TranscriptionSettingsProps {
  apiKeys: Record<string, string>;
  models: Record<string, string>;
  saveKey: (key: string, provider: 'groq' | 'gemini') => void;
  saveModel: (model: string, provider: 'groq' | 'gemini') => void;
  onboardingComplete: boolean;
  markOnboardingComplete: () => void;
}

export const TranscriptionSettings: React.FC<TranscriptionSettingsProps> = ({
  apiKeys,
  models,
  saveKey,
  saveModel,
  onboardingComplete,
  markOnboardingComplete,
}) => {
  const [apiKey, setApiKey] = useState(apiKeys.groq || '');
  const [model, setModel] = useState(models.groq || GROQ_MODELS[0]);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showBanner, setShowBanner] = useState(!onboardingComplete);

  // Sync banner visibility when onboardingComplete prop changes (after async load)
  useEffect(() => {
    if (onboardingComplete) {
      setShowBanner(false);
    }
  }, [onboardingComplete]);

  const handleSave = () => {
    saveKey(apiKey, 'groq');
    saveModel(model, 'groq');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // Mark onboarding complete when user saves a valid key
    if (apiKey.trim()) {
      markOnboardingComplete();
      setShowBanner(false);
    }
  };

  const handleDismissBanner = () => {
    markOnboardingComplete();
    setShowBanner(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      {/* Get Started Banner - shown on first run */}
      {showBanner && (
        <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <p className="text-sm text-gray-300">
              Add your API key and save. Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs font-mono">Ctrl+Shift+K</kbd> to dictate.
            </p>
          </div>
          <button
            onClick={handleDismissBanner}
            className="text-gray-500 hover:text-white transition-colors p-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Transcription Settings</h2>
        <p className="text-gray-400 text-sm">
          Configure your Groq API key and select the Whisper model for speech-to-text transcription.
        </p>
      </div>

      <div className="space-y-6">
        {/* API Key */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-300">Groq API Key</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 pr-12 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/30 transition-colors font-mono"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="gsk_..."
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
            >
              {showKey ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-600">
            Get your API key from{' '}
            <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              console.groq.com/keys
            </a>
          </p>
        </div>

        {/* Whisper Model */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-300">Whisper Model</label>
          <CustomSelect value={model} options={GROQ_MODELS} onChange={setModel} />
          <p className="text-xs text-gray-600">
            Recommended: <span className="font-mono">whisper-large-v3-turbo</span> for best speed/accuracy balance
          </p>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className={`w-full py-3 rounded-lg font-medium transition-colors ${
            saved
              ? 'bg-emerald-500 text-white'
              : 'bg-white text-black hover:bg-gray-200'
          }`}
        >
          {saved ? '✓ Saved!' : 'Save Transcription Settings'}
        </button>
      </div>
    </div>
  );
};
