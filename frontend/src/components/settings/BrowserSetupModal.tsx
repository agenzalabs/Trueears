import React, { useState } from 'react';
import { PopularApp, BrowserVariant } from '../../data/popularApps';

interface BrowserSetupModalProps {
  app: PopularApp;
  theme: 'light' | 'dark';
  onSave: (browserVariant: BrowserVariant) => void;
  onClose: () => void;
}

export const BrowserSetupModal: React.FC<BrowserSetupModalProps> = ({ app, theme, onSave, onClose }) => {
  const isDark = theme === 'dark';
  const [selectedBrowser, setSelectedBrowser] = useState<BrowserVariant | null>(null);

  const handleSave = () => {
    if (selectedBrowser) {
      onSave(selectedBrowser);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-2xl max-w-md w-full p-6 ${isDark ? 'bg-[#1a1a1a] border border-[#333]' : 'bg-white border border-gray-200'}`}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center bg-white/5 text-3xl">
            {app.iconFallback}
          </div>
          <div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              Setup {app.displayName}
            </h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {app.description}
            </p>
          </div>
        </div>

        {/* URL Hint */}
        {app.urlHint && (
          <div className={`mb-6 p-3 rounded-lg ${isDark ? 'bg-[#252525]' : 'bg-gray-50'}`}>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              This app runs in your browser at:
            </p>
            <p className={`text-sm font-mono mt-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {app.urlHint}
            </p>
          </div>
        )}

        {/* Browser Selection */}
        <div className="mb-6">
          <label className={`text-sm font-medium mb-3 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Which browser do you use?
          </label>
          <div className="space-y-2">
            {app.browserVariants?.map((variant) => (
              <button
                key={variant.browserId}
                onClick={() => setSelectedBrowser(variant)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  selectedBrowser?.browserId === variant.browserId
                    ? isDark
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-emerald-600 bg-emerald-50'
                    : isDark
                    ? 'border-[#333] bg-[#252525] hover:border-[#444]'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                    isDark ? 'bg-[#1a1a1a]' : 'bg-white'
                  }`}>
                    {getBrowserIcon(variant.browserId)}
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                      {variant.browserName}
                    </div>
                    <div className={`text-xs font-mono ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                      {variant.executable}
                    </div>
                  </div>
                  {selectedBrowser?.browserId === variant.browserId && (
                    <div className="text-emerald-500">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
              isDark
                ? 'bg-[#252525] text-gray-400 hover:bg-[#2a2a2a] border border-[#333]'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedBrowser}
            className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
              selectedBrowser
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : isDark
                ? 'bg-[#252525] text-gray-600 cursor-not-allowed'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Enable {app.displayName}
          </button>
        </div>
      </div>
    </div>
  );
};

function getBrowserIcon(browserId: string): string {
  const icons: Record<string, string> = {
    chrome: '🌐',
    edge: '🌊',
    firefox: '🦊',
    brave: '🦁',
    opera: '🎭',
  };
  return icons[browserId] || '🌐';
}

