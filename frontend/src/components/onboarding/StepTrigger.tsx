import React, { useEffect, useRef } from 'react';
import { tauriAPI } from '../../utils/tauriApi';

interface StepProps {
  onNext: () => void;
  onPrev?: () => void;
  setActiveKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  success: boolean;
  setSuccess: React.Dispatch<React.SetStateAction<boolean>>;
}

interface TriggerVisualProps {
  activeKeys: Set<string>;
}

const TRIGGER_KEYS = ['Control', 'Shift', 'k'] as const;

const TriggerVisual: React.FC<TriggerVisualProps> = ({ activeKeys }) => {
  return (
    <div className="w-96 bg-white rounded-2xl p-10 text-black shadow-2xl text-center">
      <h3 className="text-lg font-bold mb-8">Test Shortcut</h3>

      <div className="flex justify-center gap-3 mb-8">
        {['Ctrl', 'Shift', 'K'].map((key) => {
          const isActive =
            (key === 'Ctrl' && activeKeys.has('Control')) ||
            (key === 'Shift' && activeKeys.has('Shift')) ||
            (key === 'K' && activeKeys.has('k'));

          return (
            <div
              key={key}
              className={`w-16 h-16 border rounded-xl flex items-center justify-center font-bold transition-all duration-150 ${
                isActive
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

export const StepTrigger: React.FC<StepProps> & { Visual: React.FC<TriggerVisualProps> } = ({
  onNext,
  onPrev,
  setActiveKeys,
  success,
  setSuccess,
}) => {
  useEffect(() => {
    setActiveKeys(new Set());
    setSuccess(false);
  }, [setActiveKeys, setSuccess]);

  // Keep a live ref to onNext so the auto-advance effect can depend only on `success`
  // (avoids re-running/cancelling the timer when the parent re-renders onNext).
  const onNextRef = useRef(onNext);
  useEffect(() => {
    onNextRef.current = onNext;
  });

  // Auto-advance to the next step once the shortcut has been detected, so the user
  // doesn't have to also click Continue. The short delay lets the green key animation play.
  useEffect(() => {
    if (!success) return;
    const timeout = setTimeout(() => onNextRef.current(), 700);
    return () => clearTimeout(timeout);
  }, [success]);

  useEffect(() => {
    tauriAPI.setOnboardingTriggerActive(true);
    return () => {
      tauriAPI.setOnboardingTriggerActive(false);
    };
  }, []);

  useEffect(() => {
    console.log('[StepTrigger] Setting up listeners...');

    // Stays true until this effect is cleaned up. Guards the async listener setup so
    // a listener that finishes registering *after* unmount is torn down immediately
    // instead of leaking (and double-firing on the next mount).
    let isActive = true;
    let shortcutAnimationTimeout: ReturnType<typeof setTimeout> | null = null;
    let unlistenTauri: (() => void) | undefined;
    let unlistenOnboarding: (() => void) | undefined;

    const clearShortcutAnimationTimeout = () => {
      if (shortcutAnimationTimeout) {
        clearTimeout(shortcutAnimationTimeout);
        shortcutAnimationTimeout = null;
      }
    };

    // Authoritative success signal: the real global Ctrl+Shift+K hotkey (emitted by
    // the backend as `onboarding-trigger`). When the user presses the combo in the
    // natural order (modifiers first, then K) the OS claims the hotkey and swallows
    // the "k" keydown, so the page-level key tracking below never sees it. This event
    // is the only reliable confirmation of a natural-order press, so it both flips
    // success and flashes all three keys green.
    const activateShortcut = () => {
      clearShortcutAnimationTimeout();
      setSuccess(true);
      setActiveKeys(new Set(TRIGGER_KEYS));
      shortcutAnimationTimeout = setTimeout(() => {
        setActiveKeys(new Set());
        shortcutAnimationTimeout = null;
      }, 500);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      setActiveKeys((prev) => {
        const next = new Set(prev);
        if (e.key === 'Control') next.add('Control');
        if (e.key === 'Shift') next.add('Shift');
        if (e.key.toLowerCase() === 'k') next.add('k');

        // Fallback path: only reachable when K is NOT swallowed by the OS hotkey
        // (e.g. the user pressed K before the modifiers). The natural order is
        // handled by activateShortcut via the global event above.
        if (TRIGGER_KEYS.every((key) => next.has(key))) {
          console.log('[StepTrigger] Combo detected via key tracking');
          setSuccess(true);
        }

        return next;
      });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setActiveKeys((prev) => {
        const next = new Set(prev);
        if (e.key === 'Control') next.delete('Control');
        if (e.key === 'Shift') next.delete('Shift');
        if (e.key.toLowerCase() === 'k') next.delete('k');
        return next;
      });
    };

    // Losing window focus can swallow the matching keyup (focus may jump to the
    // overlay, or the OS consumes it as part of the hotkey), leaving modifier keys
    // stuck "on" in the visual. Reset on blur so the keys don't linger green.
    const handleBlur = () => setActiveKeys(new Set());

    const setupTauriListener = async () => {
      try {
        const offToggle = await tauriAPI.onToggleRecording(activateShortcut);
        const offOnboarding = await tauriAPI.onOnboardingTrigger(activateShortcut);
        // If the component unmounted while we were awaiting registration, tear the
        // listeners down now instead of leaking them past this effect's lifetime.
        if (!isActive) {
          offToggle();
          offOnboarding();
          return;
        }
        unlistenTauri = offToggle;
        unlistenOnboarding = offOnboarding;
      } catch (err) {
        console.error('[StepTrigger] Failed to setup Tauri listener:', err);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    void setupTauriListener();

    return () => {
      isActive = false;
      clearShortcutAnimationTimeout();
      setActiveKeys(new Set());
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      if (unlistenTauri) unlistenTauri();
      if (unlistenOnboarding) unlistenOnboarding();
    };
  }, [setActiveKeys, setSuccess]);

  return (
    <div className="h-full flex flex-col">
      <div>
        <h1 className="font-['Syne'] font-extrabold text-4xl leading-[0.95] tracking-tight mb-4 text-gray-900">
          Try the<br />Shortcut
        </h1>
        <p className="text-gray-500 text-sm font-medium max-w-xs leading-relaxed mb-8">
          This is how you'll start dictating. Press{' '}
          <kbd className="bg-white border border-gray-200 px-1.5 py-0.5 rounded text-xs text-gray-800 shadow-sm">
            Ctrl
          </kbd>
          +
          <kbd className="bg-white border border-gray-200 px-1.5 py-0.5 rounded text-xs text-gray-800 shadow-sm">
            Shift
          </kbd>
          +
          <kbd className="bg-white border border-gray-200 px-1.5 py-0.5 rounded text-xs text-gray-800 shadow-sm">
            K
          </kbd>{' '}
          now!
        </p>
      </div>

      <div className="mt-auto pt-8 flex gap-3">
        {onPrev ? (
          <button
            onClick={onPrev}
            className="px-6 py-4 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 hover:text-emerald-600 hover:border-emerald-500 transition-all cursor-pointer"
          >
            Back
          </button>
        ) : null}
        <button
          onClick={onNext}
          disabled={!success}
          className={`flex-1 py-4 rounded-xl font-['Syne'] font-bold text-xs uppercase tracking-wider transition-all duration-300 ${
            success
              ? 'bg-white text-gray-900 border border-gray-200 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 shadow-sm hover:shadow-lg cursor-pointer'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {success ? 'Continue' : 'Press Shortcut...'}
        </button>
      </div>
    </div>
  );
};

StepTrigger.Visual = TriggerVisual;
