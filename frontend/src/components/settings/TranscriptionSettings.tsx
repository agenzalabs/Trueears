import React, { useState, useEffect, useMemo } from 'react';
import 'flag-icons/css/flag-icons.min.css';
import { CustomSelect } from '../CustomSelect';
import { GROQ_MODELS } from '../../hooks/useSettings';
import { open } from '@tauri-apps/plugin-shell';
import { WHISPER_LANGUAGES, getLanguageByCode } from '../../types/languages';

interface TranscriptionSettingsProps {
  apiKey: string;
  model: string;
  saveKey: (key: string) => void;
  saveModel: (model: string) => void;
  onboardingComplete: boolean;
  markOnboardingComplete: () => void;
  language: string;
  autoDetectLanguage: boolean;
  saveLanguage: (lang: string) => void;
  saveAutoDetectLanguage: (enabled: boolean) => void;
}

export const TranscriptionSettings: React.FC<TranscriptionSettingsProps> = ({
  apiKey: initialApiKey,
  model: initialModel,
  saveKey,
  saveModel,
  onboardingComplete,
  markOnboardingComplete,
  language: initialLanguage,
  autoDetectLanguage: initialAutoDetect,
  saveLanguage,
  saveAutoDetectLanguage,
}) => {
  const [apiKey, setApiKey] = useState(initialApiKey || '');
  const [model, setModel] = useState(initialModel || GROQ_MODELS[0]);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showBanner, setShowBanner] = useState(!onboardingComplete);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSelected, setTempSelected] = useState<string>(initialLanguage || 'en');
  const [tempAutoDetect, setTempAutoDetect] = useState(initialAutoDetect || false);

  const selectedLang = getLanguageByCode(initialLanguage || 'en');
  
  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) return WHISPER_LANGUAGES;
    const query = searchQuery.toLowerCase();
    return WHISPER_LANGUAGES.filter(lang => 
      lang.name.toLowerCase().includes(query) || 
      lang.code.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleSelectLanguage = (code: string) => {
    setTempSelected(code);
  };

  const handleOpenLanguageModal = () => {
    setTempSelected(initialLanguage || 'en');
    setTempAutoDetect(initialAutoDetect || false);
    setSearchQuery('');
    setIsLanguageModalOpen(true);
  };

  const handleSaveLanguages = () => {
    saveLanguage(tempSelected);
    saveAutoDetectLanguage(tempAutoDetect);
    setIsLanguageModalOpen(false);
  };

  useEffect(() => {
    if (onboardingComplete) {
      setShowBanner(false);
    }
  }, [onboardingComplete]);

  const handleSave = () => {
    saveKey(apiKey);
    saveModel(model);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors cursor-pointer"
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
            <button onClick={() => open('https://console.groq.com/keys')} className="text-blue-400 hover:underline cursor-pointer">
              console.groq.com/keys
            </button>
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

        {/* Language Selection */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-300">Transcription Language</label>
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-3 min-h-12">
              {initialAutoDetect ? (
                <span className="text-sm text-gray-400 italic flex items-center gap-2">🌐 Auto-detect enabled</span>
              ) : selectedLang ? (
                <span className="flex items-center gap-2 px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-sm text-white">
                  <span className={`fi fi-${selectedLang.countryCode.toLowerCase()}`}></span> {selectedLang.name}
                </span>
              ) : null}
            </div>
            <button
              onClick={handleOpenLanguageModal}
              className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              Change
            </button>
          </div>
          <p className="text-xs text-gray-600">
            Select your language or enable auto-detection
          </p>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className={`w-full py-3 rounded-lg font-medium transition-colors cursor-pointer ${
            saved
              ? 'bg-emerald-500 text-white'
              : 'bg-white text-black hover:bg-gray-200'
          }`}
        >
          {saved ? '✓ Saved!' : 'Save Transcription Settings'}
        </button>
      </div>

      {/* Language Selection Modal */}
      {isLanguageModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-[600px] max-h-[500px] bg-[#111] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h2 className="text-xl font-bold text-white">Select Language</h2>
                <p className="text-sm text-gray-500 mt-1">Choose your transcription language</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">Auto-detect</span>
                <button
                  onClick={() => setTempAutoDetect(!tempAutoDetect)}
                  className={`w-12 h-6 rounded-full transition-colors duration-200 cursor-pointer ${
                    tempAutoDetect ? 'bg-emerald-500' : 'bg-white/10'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                    tempAutoDetect ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
              {/* Search */}
              <div className="relative mb-4">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search languages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="grid grid-cols-3 gap-2">
                  {filteredLanguages.map(lang => {
                    const isSelected = tempSelected === lang.code && !tempAutoDetect;
                    return (
                      <button
                        key={lang.code}
                        onClick={() => handleSelectLanguage(lang.code)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-all duration-200 cursor-pointer ${
                          isSelected 
                            ? 'bg-emerald-500/20 border border-emerald-500/50 text-white' 
                            : 'bg-white/5 border border-transparent hover:bg-white/10 text-gray-300'
                        }`}
                      >
                        <span className={`fi fi-${lang.countryCode.toLowerCase()}`}></span>
                        <span className="text-sm truncate">{lang.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 flex gap-3">
              <button
                onClick={() => setIsLanguageModalOpen(false)}
                className="flex-1 py-3 rounded-xl text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLanguages}
                className="flex-1 py-3 rounded-xl font-bold text-sm bg-emerald-500 text-white hover:bg-emerald-400 transition-colors cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
