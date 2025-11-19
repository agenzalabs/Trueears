import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AudioVisualizer } from './AudioVisualizer';
import { GroqService } from '../services/groqService';
import { GeminiService } from '../services/geminiService';

// Declare electronAPI for TypeScript visibility
declare global {
  interface Window {
    electronAPI?: {
      onToggleRecording: (callback: () => void) => () => void;
      onOpenSettings: (callback: () => void) => () => void;
      setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => void;
      sendTranscription: (text: string) => void;
    };
  }
}

// Synthesize a pleasant "ding" sound using Web Audio API
const playSuccessSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // A clean sine wave at 880Hz (High A) creates a bell-like tone
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);

    // ADSR Envelope: Fast attack, slow exponential decay
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.02); // Attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0); // Decay

    oscillator.start();
    oscillator.stop(ctx.currentTime + 1.0);
  } catch (error) {
    // Ignore audio errors
  }
};

export const RecorderOverlay: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  // States: 
  // 'idle': Extension hidden or ready
  // 'setup': Asking for API Key
  // 'recording': Microphone active
  // 'processing': Sending file to Groq
  // 'success': Text pasted
  // 'error': Something went wrong
  // 'settings': Configuration menu
  const [status, setStatus] = useState<'idle' | 'setup' | 'recording' | 'processing' | 'success' | 'error' | 'settings'>('idle');
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  // Storage handling
  const [apiKeys, setApiKeys] = useState({ groq: '', gemini: '' });
  const [provider, setProvider] = useState<'groq' | 'gemini'>('groq');
  const [isKeyLoaded, setIsKeyLoaded] = useState(false);

  const [tempKeyInput, setTempKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isProcessingRef = useRef(false);

  // -- Effect: Manage Click-Through --
  useEffect(() => {
    if (window.electronAPI) {
      // By default, ignore mouse events (allow click-through)
      // forward: true allows us to still catch mouseenter/mouseleave
      window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
    }
  }, []);

  const handleMouseEnter = () => {
    // When mouse enters the interactive area, capture events
    window.electronAPI?.setIgnoreMouseEvents(false);
  };

  const handleMouseLeave = () => {
    // When mouse leaves, go back to click-through
    window.electronAPI?.setIgnoreMouseEvents(true, { forward: true });
  };

  // -- Load API Key (LocalStorage) --
  useEffect(() => {
    const loadKeys = () => {
      const groqKey = localStorage.getItem('GROQ_API_KEY') || '';
      const geminiKey = localStorage.getItem('GEMINI_API_KEY') || '';
      const savedProvider = localStorage.getItem('STT_PROVIDER') as 'groq' | 'gemini' | null;
      
      setApiKeys({ groq: groqKey, gemini: geminiKey });
      if (savedProvider) setProvider(savedProvider);
      
      setIsKeyLoaded(true);
    };
    loadKeys();
  }, []);

  // -- Action: Save API Key --
  const handleSaveKey = () => {
    const key = tempKeyInput.trim();
    if (!key) return;

    if (provider === 'groq' && !key.startsWith('gsk_')) {
      alert('Invalid Groq API Key. It usually starts with "gsk_"');
      return;
    }

    const newKeys = { ...apiKeys, [provider]: key };
    setApiKeys(newKeys);
    
    if (provider === 'groq') {
        localStorage.setItem('GROQ_API_KEY', key);
    } else {
        localStorage.setItem('GEMINI_API_KEY', key);
    }
    localStorage.setItem('STT_PROVIDER', provider);

    setStatus('idle');
    // Only auto-start if we were in setup mode (first run), not settings mode
    if (status === 'setup') {
      setTimeout(() => startRecording(key), 100);
    }
  };

  // -- Action: Toggle Settings --
  const toggleSettings = () => {
    if (status === 'settings') {
      setStatus('idle');
    } else {
      setTempKeyInput(apiKeys[provider]); // Pre-fill current key
      setShowKey(false); // Reset visibility
      setStatus('settings');
      setIsVisible(true);
    }
  };

  // -- Action: Start Recording --
  const startRecording = async (manualKey?: string) => {
    const effectiveKey = manualKey || apiKeys[provider];

    // If no API key, force setup mode
    if (!effectiveKey) {
      setStatus('setup');
      setIsVisible(true); // Ensure visible for setup
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(stream);
      setStatus('recording');
      setIsVisible(true); // Ensure visible when recording starts
      isProcessingRef.current = false;
      audioChunksRef.current = [];

      // Use MediaRecorder for standard webm capture
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start();
    } catch (err) {
      console.error("Microphone error:", err);
      setStatus('error');
      setTimeout(() => setIsVisible(false), 2000);
    }
  };

  // -- Action: Stop Recording & Transcribe --
  const stopRecording = useCallback(async () => {
    if (status !== 'recording') return;
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const recorder = mediaRecorderRef.current;
    const stream = mediaStream;

    // Create a promise that resolves when the recorder actually stops and flushing data
    const stopPromise = new Promise<Blob>((resolve) => {
      if (!recorder) {
        resolve(new Blob([]));
        return;
      }

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        resolve(audioBlob);
      };
      recorder.stop();
    });

    // Stop the visualizer/mic tracks immediately
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    setMediaStream(null); // Unmount visualizer immediately

    setStatus('processing'); // Transition to processing (will show pulsing dot)

    try {
      const audioBlob = await stopPromise;

      if (audioBlob.size === 0) {
        throw new Error("No audio captured");
      }

      // Send to selected provider
      let text = '';
      const currentKey = apiKeys[provider];

      if (provider === 'gemini') {
        text = await GeminiService.transcribe(audioBlob, currentKey);
      } else {
        text = await GroqService.transcribe(audioBlob, currentKey);
      }

      if (text) {
        // Send to Electron Main Process
        if (window.electronAPI) {
          window.electronAPI.sendTranscription(text);
        } else {
          console.warn("Electron API not available, cannot type text:", text);
          // Fallback for browser testing? Alert?
          // alert("Transcription: " + text);
        }

        playSuccessSound(); // Ring the bell!
        setStatus('success');
        setTimeout(() => {
          setIsVisible(false);
          setStatus('idle');
          isProcessingRef.current = false;
        }, 1500);
      } else {
        // Empty response
        setIsVisible(false);
        setStatus('idle');
        isProcessingRef.current = false;
      }
    } catch (error) {
      console.error("Transcription failed", error);
      // Show error details in alert for debugging
      alert(`Transcription Error: ${error instanceof Error ? error.message : String(error)}`);
      setStatus('error');
      setTimeout(() => {
        setIsVisible(false);
        setStatus('idle');
        isProcessingRef.current = false;
      }, 2000);
    }
  }, [status, mediaStream, apiKeys, provider]);

  const lastToggleTimeRef = useRef(0);

  // -- Trigger: Toggle Visibility --
  const handleToggle = useCallback(async () => {
    const now = Date.now();
    if (now - lastToggleTimeRef.current < 500) {
      return; // Ignore rapid toggles (debounce)
    }
    lastToggleTimeRef.current = now;

    if (!isKeyLoaded) return; // Wait for storage check

    if (status === 'recording') {
      stopRecording();
    } else if (status === 'setup' || status === 'settings') {
      // Close if toggled while in setup or settings
      setIsVisible(false);
      setStatus('idle');
    } else {
      // Start Recording
      startRecording();
    }
  }, [status, stopRecording, apiKeys, isKeyLoaded]);

  // -- Listeners: Electron IPC & Keyboard Shortcuts --
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // DISABLED: We're using global shortcut (Ctrl+Shift+K) instead
      // if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      //   e.preventDefault();
      //   handleToggle();
      // }
      if (e.key === 'Escape' && isVisible) {
        if (status === 'recording') stopRecording();
        else if (status === 'settings') {
            setStatus('idle');
        }
        else setIsVisible(false);
      }
      if ((status === 'setup' || status === 'settings') && e.key === 'Enter' && isVisible) {
        handleSaveKey();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Electron IPC Listener
    let removeIpcListener: (() => void) | undefined;
    let removeSettingsListener: (() => void) | undefined;
    if (window.electronAPI) {
      removeIpcListener = window.electronAPI.onToggleRecording(() => {
        handleToggle();
      });
      removeSettingsListener = window.electronAPI.onOpenSettings(() => {
        toggleSettings();
      });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (removeIpcListener) removeIpcListener();
      if (removeSettingsListener) removeSettingsListener();
    };
  }, [handleToggle, isVisible, stopRecording, status, tempKeyInput]);

  if (!isVisible) return null;

  return (
    <div className="fixed z-[9999] bottom-10 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center justify-end">
      {/* 
        Capsule Container
      */}
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`
          pointer-events-auto
          flex items-center justify-center
          bg-[#0a0a0a] 
          border border-white/10 
          shadow-[0_8px_32px_rgba(0,0,0,0.5)]
          backdrop-blur-xl
          rounded-full
          transition-all duration-300 cubic-bezier(0.2, 0.8, 0.2, 1)
          will-change-[width, height, transform]
          overflow-hidden
          ${status === 'setup' ? 'w-80 h-12 rounded-xl' : ''}
          ${status === 'settings' ? 'w-80 h-48 rounded-xl' : ''}
          ${status === 'recording' ? 'w-40 h-9' : ''}
          ${(status === 'idle' || status === 'processing' || status === 'success' || status === 'error') ? 'w-9 h-9' : ''}
        `}
      >
        <div className="relative w-full h-full flex items-center justify-center">

          {/* SETTINGS MODE */}
          {status === 'settings' && (
            <div className="flex flex-col w-full h-full p-4 gap-3 animate-fadeIn text-white">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Settings</span>
                <button onClick={() => setStatus('idle')} className="text-gray-500 hover:text-white">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Provider Selection */}
              <div className="flex gap-2 bg-white/5 p-1 rounded-lg">
                <button 
                  onClick={() => {
                    setProvider('groq');
                    setTempKeyInput(apiKeys.groq);
                  }}
                  className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${provider === 'groq' ? 'bg-white text-black font-bold' : 'text-gray-400 hover:text-white'}`}
                >
                  Groq
                </button>
                <button 
                  onClick={() => {
                    setProvider('gemini');
                    setTempKeyInput(apiKeys.gemini);
                  }}
                  className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${provider === 'gemini' ? 'bg-white text-black font-bold' : 'text-gray-400 hover:text-white'}`}
                >
                  Gemini
                </button>
              </div>

              {/* API Key Input */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-500 font-mono">API KEY</label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    placeholder={provider === 'groq' ? "gsk_..." : "Gemini API Key"}
                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 pr-8 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white/30 transition-colors font-mono"
                    value={tempKeyInput}
                    onChange={(e) => setTempKeyInput(e.target.value)}
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
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

              <button
                onClick={handleSaveKey}
                className="mt-auto w-full bg-white text-black text-xs font-bold py-1.5 rounded hover:bg-gray-200 transition-colors"
              >
                Save Changes
              </button>
            </div>
          )}

          {/* SETUP MODE: Input Field */}
          {status === 'setup' && (
            <div className="flex items-center w-full px-3 gap-2 animate-fadeIn">
              <input
                autoFocus
                type="password"
                placeholder={provider === 'groq' ? "Enter Groq API Key (gsk_...)" : "Enter Gemini API Key"}
                className="flex-1 bg-transparent border-none outline-none text-white text-xs placeholder-gray-500 font-mono"
                value={tempKeyInput}
                onChange={(e) => setTempKeyInput(e.target.value)}
              />
              <button
                onClick={handleSaveKey}
                className="text-[10px] bg-white text-black font-bold px-2 py-1 rounded hover:bg-gray-200 transition-colors"
              >
                SAVE
              </button>
            </div>
          )}

          {/* RECORDING MODE: Visualizer */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${status === 'recording' && mediaStream ? 'opacity-100 delay-100' : 'opacity-0 pointer-events-none'}`}
          >
            {/* Visualizer logic remains same */}
            {status === 'recording' && mediaStream && <AudioVisualizer stream={mediaStream} isRecording={true} />}
          </div>

          {/* STATUS ICONS */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${status !== 'recording' && status !== 'setup' && status !== 'settings' ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'}`}
          >
            {status === 'success' ? (
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : status === 'error' ? (
              <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              // Idle or Processing (Subtle pulse if processing)
              <div className="relative group flex items-center justify-center w-full h-full">
                <div className={`w-1.5 h-1.5 rounded-full ${status === 'processing' ? 'bg-white/60 animate-pulse' : 'bg-white/20'}`} />
                
                {/* Settings Trigger (Only visible on hover of the dot in idle) */}
                {status === 'idle' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleSettings(); }}
                    className="absolute -top-3 -right-3 p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-400 hover:text-white"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};