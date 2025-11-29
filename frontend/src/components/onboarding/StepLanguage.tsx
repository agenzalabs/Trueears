import React, { useState, useMemo } from 'react';
import 'flag-icons/css/flag-icons.min.css';
import { useSettings } from '../../hooks/useSettings';
import { WHISPER_LANGUAGES, getLanguageByCode } from '../../types/languages';

interface StepProps {
  onNext: () => void;
}

const LanguageVisual: React.FC = () => {
  const { language, autoDetectLanguage } = useSettings();
  const selectedLang = getLanguageByCode(language);

  return (
    <div className="w-80 bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
      <h3 className="text-sm font-bold text-white mb-4">Your selected language</h3>
      
      <div className="bg-[#111] rounded-xl p-4 min-h-20 flex items-center justify-center">
        {autoDetectLanguage ? (
          <div className="text-center">
            <div className="text-2xl mb-2">🌐</div>
            <span className="text-sm text-gray-400">Auto-detect</span>
          </div>
        ) : selectedLang ? (
          <div className="flex items-center gap-3 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded">
            <span className={`fi fi-${selectedLang.countryCode.toLowerCase()} text-xl`}></span>
            <span className="text-lg text-white font-medium">{selectedLang.name}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const StepLanguage: React.FC<StepProps> & { Visual: React.FC } = ({ onNext }) => {
  const { language, autoDetectLanguage, saveLanguage, saveAutoDetectLanguage } = useSettings();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSelected, setTempSelected] = useState<string>(language);
  const [tempAutoDetect, setTempAutoDetect] = useState(autoDetectLanguage);

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

  const handleOpenModal = () => {
    setTempSelected(language);
    setTempAutoDetect(autoDetectLanguage);
    setSearchQuery('');
    setIsModalOpen(true);
  };

  const handleSaveAndClose = () => {
    saveLanguage(tempSelected);
    saveAutoDetectLanguage(tempAutoDetect);
    setIsModalOpen(false);
  };

  const handleContinue = () => {
    onNext();
  };

  const selectedLang = getLanguageByCode(language);

  return (
    <div className="h-full flex flex-col">
      <div>
        <h1 className="font-['Syne'] font-extrabold text-4xl leading-[0.95] tracking-tight mb-4">
          Set your<br/>
          <span className="text-emerald-400">Language</span>
        </h1>
        <p className="text-gray-500 text-sm font-medium max-w-xs leading-relaxed">
          Scribe supports 100+ languages. Select your primary language or enable auto-detection.
        </p>

        <div className="mt-8">
          <button
            onClick={handleOpenModal}
            className="w-full py-3 rounded-xl font-['Syne'] font-bold text-xs uppercase tracking-wider bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
          >
            {autoDetectLanguage ? (
              <>🌐 Auto-detect</>
            ) : selectedLang ? (
              <><span className={`fi fi-${selectedLang.countryCode.toLowerCase()}`}></span> {selectedLang.name}</>
            ) : (
              <>Select Language</>
            )}
          </button>
        </div>
      </div>

      <div className="mt-auto pt-8">
        <button
          onClick={handleContinue}
          className="w-full py-4 rounded-xl font-['Syne'] font-bold text-xs uppercase tracking-wider bg-white text-black hover:bg-emerald-100 shadow-lg transition-all duration-300 cursor-pointer"
        >
          Continue
        </button>
      </div>

      {/* Language Selection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
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
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 rounded-xl text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAndClose}
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

StepLanguage.Visual = LanguageVisual;
