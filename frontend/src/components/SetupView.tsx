import React, { useState } from 'react';

interface SetupViewProps {
  onSave: (key: string) => void;
  isDark?: boolean;
}

export const SetupView: React.FC<SetupViewProps> = ({ onSave, isDark = false }) => {
  const [keyInput, setKeyInput] = useState('');

  return (
    <div className="flex items-center w-full px-3 gap-2 animate-fadeIn">
      <input
        autoFocus
        type="password"
        placeholder="Enter Groq API Key (gsk_...)"
        className="flex-1 bg-transparent border-none outline-none text-xs font-mono"
        style={{ color: isDark ? '#ffffff' : '#1f2937' }}
        value={keyInput}
        onChange={(e) => setKeyInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSave(keyInput);
          }
        }}
      />
      <button
        onClick={() => onSave(keyInput)}
        className="text-[10px] font-bold px-2 py-1 rounded transition-colors"
        style={{ 
          backgroundColor: isDark ? '#ffffff' : '#ffffff', 
          color: '#000000',
        }}
      >
        SAVE
      </button>
    </div>
  );
};
