import React, { useState, useEffect } from 'react';
import { tauriAPI } from '../../utils/tauriApi';

interface StepProps {
  onNext: () => void;
}

// Shared state for visualization communication (simple solution for same-tree components)
const TRIGGER_EVENT = 'scribe-trigger-test';

const TriggerVisual: React.FC = () => {
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setActiveKeys(prev => {
        const newKeys = new Set(prev);
        if (e.key === 'Control') newKeys.add('Control');
        if (e.key === 'Shift') newKeys.add('Shift');
        if (e.key.toLowerCase() === 'k') newKeys.add('k');
        return newKeys;
      });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setActiveKeys(prev => {
        const newKeys = new Set(prev);
        if (e.key === 'Control') newKeys.delete('Control');
        if (e.key === 'Shift') newKeys.delete('Shift');
        if (e.key.toLowerCase() === 'k') newKeys.delete('k');
        return newKeys;
      });
    };

    // Listen for custom event from StepTrigger when global shortcut fires
    const handleShortcutTriggered = () => {
      setActiveKeys(new Set(['Control', 'Shift', 'k']));
      setTimeout(() => setActiveKeys(new Set()), 500);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener(TRIGGER_EVENT, handleShortcutTriggered);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener(TRIGGER_EVENT, handleShortcutTriggered);
    };
  }, []);

  return (
    <div className="w-96 bg-white rounded-2xl p-10 text-black shadow-2xl text-center">
      <h3 className="text-lg font-bold mb-8">Test Shortcut</h3>
      
      <div className="flex justify-center gap-3 mb-8">
        {['Ctrl', 'Shift', 'K'].map(key => {
          const isActive = 
            (key === 'Ctrl' && activeKeys.has('Control')) ||
            (key === 'Shift' && activeKeys.has('Shift')) ||
            (key === 'K' && activeKeys.has('k'));
            
          return (
            <div 
              key={key}
              className={`w-16 h-16 border rounded-xl flex items-center justify-center font-bold transition-all duration-150
                ${isActive 
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-none translate-y-1' 
                  : 'bg-gray-100 border-gray-200 text-gray-800 shadow-[0_6px_0_#e4e4e7]'
                }`}
            >
              {key}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-500 font-medium">Do the buttons turn green?</p>
    </div>
  );
};

export const StepTrigger: React.FC<StepProps> & { Visual: React.FC } = ({ onNext }) => {
  const [success, setSuccess] = useState(false);
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());

  // Disable recorder while on this step - tell backend to skip shortcut
  useEffect(() => {
    tauriAPI.setOnboardingTriggerActive(true);
    return () => {
      tauriAPI.setOnboardingTriggerActive(false);
    };
  }, []);

  useEffect(() => {
    console.log('[StepTrigger] Setting up listeners...');

    const handleKeyDown = (e: KeyboardEvent) => {
      setActiveKeys(prev => {
        const newKeys = new Set(prev);
        if (e.key === 'Control') newKeys.add('Control');
        if (e.key === 'Shift') newKeys.add('Shift');
        if (e.key.toLowerCase() === 'k') newKeys.add('k');

        // Check for combination based on tracked keys
        if (newKeys.has('Control') && newKeys.has('Shift') && newKeys.has('k')) {
          console.log('[StepTrigger] Combo Detected via Key Tracking!');
          setSuccess(true);
          window.dispatchEvent(new CustomEvent(TRIGGER_EVENT));
        }

        return newKeys;
      });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setActiveKeys(prev => {
        const newKeys = new Set(prev);
        if (e.key === 'Control') newKeys.delete('Control');
        if (e.key === 'Shift') newKeys.delete('Shift');
        if (e.key.toLowerCase() === 'k') newKeys.delete('k');
        return newKeys;
      });
    };

    // Strategy 2: Listen for Tauri Global Shortcut
    let unlistenTauri: (() => void) | undefined;
    const setupTauriListener = async () => {
      try {
        unlistenTauri = await tauriAPI.onToggleRecording(() => {
          console.log('[StepTrigger] Tauri Global Shortcut Detected!');
          setSuccess(true);
          // Dispatch custom event for TriggerVisual to highlight all keys
          window.dispatchEvent(new CustomEvent(TRIGGER_EVENT));
        });
      } catch (err) {
        console.error('[StepTrigger] Failed to setup Tauri listener:', err);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    setupTauriListener();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (unlistenTauri) unlistenTauri();
    };
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div>
        <h1 className="font-['Syne'] font-extrabold text-4xl leading-[0.95] tracking-tight mb-4">
          Global<br/>Trigger
        </h1>
        <p className="text-gray-500 text-sm font-medium max-w-xs leading-relaxed mb-8">
          Press the keyboard shortcut <kbd className="bg-[#222] border border-[#333] px-1.5 py-0.5 rounded text-xs text-white">Ctrl</kbd>+<kbd className="bg-[#222] border border-[#333] px-1.5 py-0.5 rounded text-xs text-white">Shift</kbd>+<kbd className="bg-[#222] border border-[#333] px-1.5 py-0.5 rounded text-xs text-white">K</kbd> to test the activation sequence.
        </p>
      </div>

      <div className="mt-auto pt-8">
        <button
          onClick={onNext}
          disabled={!success}
          className={`w-full py-4 rounded-xl font-['Syne'] font-bold text-xs uppercase tracking-wider transition-all duration-300
            ${success 
              ? 'bg-white text-black hover:bg-emerald-100 shadow-lg cursor-pointer' 
              : 'bg-[#222] text-gray-600 cursor-not-allowed'
            }`}
        >
          {success ? 'Continue' : 'Press Shortcut...'}
        </button>
      </div>
    </div>
  );
};

StepTrigger.Visual = TriggerVisual;
