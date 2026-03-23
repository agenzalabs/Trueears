import React, { useState, useEffect } from 'react';

interface StepProps {
  onNext: () => void;
  onPrev?: () => void;
}

const PermissionsVisual: React.FC = () => {
  return (
    <div className="relative w-80">
      {/* Dialog */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-2xl animate-[floatUp_0.6s_ease-out]">
        <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500" viewBox="0 0 24 24">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"></path>
            <path d="M19 10v2a7 7 0 01-14 0v-2"></path>
          </svg>
        </div>
        <h3 className="text-gray-800 font-bold text-sm mb-1">"Trueears" wants to use your microphone</h3>
        <p className="text-gray-400 text-xs mb-6 leading-relaxed">Click "Allow" when your browser asks.</p>

        <div className="flex justify-end gap-2">
          <div className="text-xs text-gray-400 font-medium py-2 px-3">Block</div>
          <div className="px-5 py-2 bg-emerald-500 rounded-lg text-white text-xs font-bold shadow-lg shadow-emerald-500/30 animate-[pulse_1.5s_ease-in-out_infinite] ring-2 ring-emerald-400 ring-offset-2">Allow</div>
        </div>
      </div>

    </div>
  );
};

export const StepPermissions: React.FC<StepProps> & { Visual: React.FC } = ({ onNext, onPrev }) => {
  const [granted, setGranted] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const checkPermissionState = async () => {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) {
          if (!cancelled) {
            setErrorMessage('Microphone API is unavailable in this WebView build.');
          }
          return;
        }

        // Prefer explicit permissions state when available.
        if ((navigator as Navigator & { permissions?: Permissions }).permissions?.query) {
          try {
            const result = await navigator.permissions.query({
              name: 'microphone' as PermissionName,
            });
            if (!cancelled && result.state === 'granted') {
              setGranted(true);
              setErrorMessage(null);
              return;
            }
          } catch {
            // Ignore and continue with enumerate fallback.
          }
        }

        // Fallback signal: labeled audioinput devices usually indicate granted access.
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasLabel = devices.some(
          (d) => d.kind === 'audioinput' && (d.label || '').trim().length > 0
        );
        if (!cancelled && hasLabel) {
          setGranted(true);
          setErrorMessage(null);
        }
      } catch (err) {
        console.error('Failed to check microphone state:', err);
      }
    };

    checkPermissionState();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleGrant = async () => {
    setVerifying(true);
    setErrorMessage(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone API not available in this environment');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop tracks immediately - we just needed the permission
      stream.getTracks().forEach(track => track.stop());
      setGranted(true);
      setErrorMessage(null);
    } catch (err) {
      // User denied or error occurred - stay on this step
      console.error('Microphone permission denied:', err);
      let message = 'Could not access microphone. Please allow access and try again.';
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          message =
            'Microphone access was blocked. Click Allow in the permission prompt, then try again.';
        } else if (err.name === 'NotFoundError') {
          message = 'No microphone device found. Connect a mic and retry.';
        } else if (err.name === 'NotReadableError') {
          message = 'Microphone is busy or unavailable. Close other apps using it and retry.';
        } else if (err.name === 'SecurityError') {
          message = 'Security policy blocked microphone access in this WebView session.';
        }
      } else if (err instanceof Error && err.message) {
        message = err.message;
      }

      if (navigator.userAgent.toLowerCase().includes('linux')) {
        message += ' On Linux, also verify PipeWire and xdg-desktop-portal are running.';
      }

      setErrorMessage(message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div>
        <h1 className="font-['Syne'] font-extrabold text-4xl leading-[0.95] tracking-tight mb-4 text-gray-900">
          Allow<br/>Microphone
        </h1>
        <p className="text-gray-500 text-sm font-medium max-w-xs leading-relaxed mb-8">
          Trueears listens only when you hold the shortcut. Audio stays on your device.
        </p>

        <div className="space-y-4">
          {/* Microphone Card */}
          <div className={`border rounded-xl p-4 transition-all duration-300 ${granted ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white border-gray-200'}`}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-bold text-gray-800">Microphone Access</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${granted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-100 text-gray-500'}`}>
                {granted ? 'ALLOWED' : 'NEEDED'}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mb-3">Hear your voice when you dictate.</p>

            {!granted && (
              <button
                onClick={handleGrant}
                disabled={verifying}
                className="text-[11px] font-bold bg-white text-gray-900 border border-gray-200 px-3 py-1.5 rounded hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {verifying ? 'Requesting...' : 'Allow Microphone'}
              </button>
            )}
            {!granted && errorMessage && (
              <p className="mt-2 text-[11px] text-rose-600 leading-relaxed">{errorMessage}</p>
            )}
          </div>

          {/* Paste Results Card */}
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-bold text-gray-800">Paste Results</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono">READY</span>
            </div>
            <p className="text-[11px] text-gray-500">Text appears where your cursor is.</p>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-8 flex gap-3">
        {onPrev && (
          <button
            onClick={onPrev}
            className="px-6 py-4 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 hover:text-emerald-600 hover:border-emerald-500 transition-all cursor-pointer"
          >
            Back
          </button>
        )}
        <button
          onClick={onNext}
          disabled={!granted}
          className={`flex-1 py-4 rounded-xl font-['Syne'] font-bold text-xs uppercase tracking-wider transition-all duration-300
            ${granted
              ? 'bg-white text-gray-900 border border-gray-200 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 shadow-sm hover:shadow-lg cursor-pointer' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

StepPermissions.Visual = PermissionsVisual;
