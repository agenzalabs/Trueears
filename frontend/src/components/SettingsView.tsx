import React, { useState, useEffect } from 'react';
import { CustomSelect } from './CustomSelect';
import { GROQ_MODELS } from '../hooks/useSettings';
import { open } from '@tauri-apps/plugin-shell';

interface SettingsViewProps {
  apiKey: string;
  model: string;
  onSave: (key: string, model: string) => void;
  onClose: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  apiKey,
  model,
  onSave,
  onClose
}) => {
  const [keyInput, setKeyInput] = useState(apiKey || '');
  const [modelInput, setModelInput] = useState(model || GROQ_MODELS[0]);
  const [showKey, setShowKey] = useState(false);

  // Initialize inputs when props change
  useEffect(() => {
    setKeyInput(apiKey || '');
    setModelInput(model || GROQ_MODELS[0]);
  }, [apiKey, model]);

  const handleSave = () => {
    onSave(keyInput, modelInput);
  };

  // Handle Enter key to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyInput, modelInput, onSave]);

  return (
    <div className="flex flex-col w-full h-full p-4 gap-3 animate-fadeIn text-gray-800">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Settings</span>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 cursor-pointer">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* API Key Input */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <label className="text-[10px] text-gray-500 font-mono">API KEY</label>
          <button 
            onClick={() => open('https://console.groq.com/keys')}
            className="text-[9px] text-gray-500 hover:text-gray-800 underline decoration-gray-600 hover:decoration-gray-400 transition-colors cursor-pointer"
          >
            Get Key ↗
          </button>
        </div>
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            placeholder="gsk_..."
            className="w-full bg-white/5 border border-gray-300 rounded px-2 py-1.5 pr-8 text-xs text-gray-800 placeholder-gray-600 focus:outline-none focus:border-gray-400 transition-colors font-mono"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
          />
          <button
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
          >
            {showKey ? (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Model Input */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-gray-500 font-mono">MODEL</label>
        <CustomSelect
          value={modelInput}
          options={GROQ_MODELS}
          onChange={setModelInput}
        />
      </div>

      <button
        onClick={handleSave}
        className="mt-auto w-full bg-white text-black text-xs font-bold py-1.5 rounded hover:bg-gray-200 transition-colors cursor-pointer"
      >
        Save Changes
      </button>
    </div>
  );
};
