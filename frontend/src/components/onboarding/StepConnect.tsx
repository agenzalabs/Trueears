import React, { useState, useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings';

interface StepProps {
  onNext: () => void;
}

const ConnectVisual: React.FC = () => {
  return (
    <div className="w-80 bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl transform rotate-y-[-5deg] rotate-x-[5deg] transition-transform duration-500 hover:rotate-0 hover:scale-105">
      {/* Header */}
      <div className="flex gap-2 mb-6 border-b border-white/5 pb-4">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#333]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#333]" />
        <div className="ml-auto text-[10px] font-mono text-gray-600">BASH</div>
      </div>
      {/* Body */}
      <div className="font-mono text-[11px] leading-relaxed text-gray-400 space-y-1">
        <div className="flex gap-2">
          <span className="text-gray-600">$</span>
          <span className="text-gray-300">scribe init --provider=groq</span>
        </div>
        <div className="flex gap-2">
          <span className="text-gray-600">{'>'}</span>
          <span className="text-gray-500">establishing secure handshake...</span>
        </div>
        <div className="flex gap-2 mt-2">
          <span className="text-gray-600">{'>'}</span>
          <span className="text-emerald-400">waiting for token</span>
          <span className="w-1.5 h-3.5 bg-emerald-500 animate-pulse inline-block align-middle" />
        </div>
      </div>
    </div>
  );
};

export const StepConnect: React.FC<StepProps> & { Visual: React.FC } = ({ onNext }) => {
  const [inputKey, setInputKey] = useState('');
  const { saveKey, saveLlmEnabled, saveLlmApiKey } = useSettings();
  
  const isValid = inputKey.trim().startsWith('gsk_') && inputKey.length > 10;

  const handleSave = () => {
    if (isValid) {
      const key = inputKey.trim();
      saveKey(key, 'groq');
      
      // Also enable LLM by default for context awareness features
      saveLlmEnabled(true);
      saveLlmApiKey(key);
      
      onNext();
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div>
        <h1 className="font-['Syne'] font-extrabold text-4xl leading-[0.95] tracking-tight mb-4">
          Scribe<br/>
          <span className="text-emerald-400">Terminal</span>
        </h1>
        <p className="text-gray-500 text-sm font-medium max-w-xs leading-relaxed">
          Initialize the protocol. Connect your Groq API key to enable LPU™ acceleration.
        </p>

        <div className="mt-8 space-y-2">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-600">
            <span>Access Token</span>
            <span className="text-[#333]">Required</span>
          </div>
          <input
            autoFocus
            type="password"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder="gsk_..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 font-mono text-sm text-white placeholder-gray-700 focus:outline-none focus:border-emerald-500 focus:bg-emerald-500/5 transition-all duration-300"
          />
        </div>
      </div>

      <div className="mt-auto pt-8">
        <button
          onClick={handleSave}
          disabled={!isValid}
          className={`w-full py-4 rounded-xl font-['Syne'] font-bold text-xs uppercase tracking-wider transition-all duration-300
            ${isValid 
              ? 'bg-white text-black hover:bg-emerald-100 hover:-translate-y-0.5 shadow-lg' 
              : 'bg-[#222] text-gray-600 cursor-not-allowed'
            }`}
        >
          Authenticate System
        </button>
        
        <div className="text-center mt-4">
          <a 
            href="https://console.groq.com/keys" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[10px] text-gray-600 hover:text-white transition-colors border-b border-transparent hover:border-gray-500"
          >
            Generate key via Console ↗
          </a>
        </div>
      </div>
    </div>
  );
};

StepConnect.Visual = ConnectVisual;
