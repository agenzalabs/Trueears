import React, { useState } from 'react';

interface StepProps {
  onNext: () => void;
}

const PermissionsVisual: React.FC = () => {
  return (
    <div className="relative w-80">
      {/* Dialog */}
      <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6 shadow-2xl animate-[floatUp_0.6s_ease-out]">
        <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500" viewBox="0 0 24 24">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"></path>
            <path d="M19 10v2a7 7 0 01-14 0v-2"></path>
          </svg>
        </div>
        <h3 className="text-white font-bold text-sm mb-1">"Scribe" requests access</h3>
        <p className="text-gray-400 text-xs mb-6 leading-relaxed">Scribe needs microphone access to transcribe your speech to text.</p>
        
        <div className="flex justify-end gap-2">
          <div className="text-xs text-gray-500 font-bold py-1.5 px-2">Block</div>
          <div className="px-4 py-1.5 bg-white rounded text-black text-xs font-bold shadow-lg animate-pulse">Allow</div>
        </div>
      </div>

      {/* Cursor */}
      <div className="absolute -bottom-10 -right-10 w-8 h-8 text-white drop-shadow-md animate-[clickMotion_3s_infinite]">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 24h-6l-4-11.5 2.5-1.5 2.5 8h1l-2-13 2.5-1.5 2 12h1l1-11 2.5 1.5-1 9.5h1l3-9 2.5 1.5-4 14.5z"/>
        </svg>
      </div>
    </div>
  );
};

export const StepPermissions: React.FC<StepProps> & { Visual: React.FC } = ({ onNext }) => {
  const [granted, setGranted] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleGrant = () => {
    setVerifying(true);
    // Simulate system dialog delay
    setTimeout(() => {
      setVerifying(false);
      setGranted(true);
    }, 1500);
  };

  return (
    <div className="h-full flex flex-col">
      <div>
        <h1 className="font-['Syne'] font-extrabold text-4xl leading-[0.95] tracking-tight mb-4">
          System<br/>Access
        </h1>
        <p className="text-gray-500 text-sm font-medium max-w-xs leading-relaxed mb-8">
          Grant necessary permissions for audio capture and text injection.
        </p>

        <div className="space-y-4">
          {/* Verified Card */}
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
            <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-bold text-white">Typing Automation</span>              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono">ACTIVE</span>
            </div>
            <p className="text-[11px] text-gray-500">Native clipboard access verified.</p>
          </div>

          {/* Action Card */}
          <div className={`border rounded-xl p-4 transition-all duration-300 ${granted ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/5 border-white/10'}`}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-bold text-white">Microphone</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${granted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#222] text-gray-500'}`}>
                {granted ? 'GRANTED' : 'REQUIRED'}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mb-3">Required for local audio buffering.</p>
            
            {!granted && (
              <button 
                onClick={handleGrant}
                className="text-[11px] font-bold bg-white text-black px-3 py-1.5 rounded hover:bg-emerald-100 transition-colors"
              >
                {verifying ? 'Verifying...' : 'Grant Access'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-auto pt-8">
        <button
          onClick={onNext}
          disabled={!granted}
          className={`w-full py-4 rounded-xl font-['Syne'] font-bold text-xs uppercase tracking-wider transition-all duration-300
            ${granted
              ? 'bg-white text-black hover:bg-emerald-100 shadow-lg' 
              : 'bg-[#222] text-gray-600 cursor-not-allowed'
            }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

StepPermissions.Visual = PermissionsVisual;
