import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AudioVisualizer } from './AudioVisualizer';
import { useSettings } from '../hooks/useSettings';
import { useDictation } from '../hooks/useDictation';
import { Toast } from './Toast';
import { useToast } from '../hooks/useToast';
import { SettingsView } from './SettingsView';
import { SetupView } from './SetupView';
import { StatusIndicator } from './StatusIndicator';
import { WarningView } from './WarningView';
import { tauriAPI } from '../utils/tauriApi';

export const RecorderOverlay: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [uiMode, setUiMode] = useState<'none' | 'setup' | 'settings' | 'warning'>('none');
  const [warningMessage, setWarningMessage] = useState('');
  
  const { apiKeys, models, provider, setProvider, isKeyLoaded, saveKey, saveModel } = useSettings();
  const { status: recordingStatus, mediaStream, startDictation, stopDictation } = useDictation();
  const { isVisible: isToastVisible, message: toastMessage, type: toastType, showToast, hideToast } = useToast();

  // Derived status for rendering
  const status = uiMode !== 'none' ? uiMode : recordingStatus;

  // -- Effect: Manage Click-Through and Debug Tauri --
  useEffect(() => {
    console.log('[RecorderOverlay] Checking Tauri availability...');
    console.log('[RecorderOverlay] window.__TAURI__ exists:', !!(window as any).__TAURI__);
    console.log('[RecorderOverlay] window.__TAURI_INTERNALS__ exists:', !!(window as any).__TAURI_INTERNALS__);
    console.log('[RecorderOverlay] window keys:', Object.keys(window).filter(k => k.includes('TAURI')));
    
    // Don't ignore mouse events by default - let UI state determine it
    // tauriAPI.setIgnoreMouseEvents(true);
  }, []);

  const handleMouseEnter = () => {
    // Only manage mouse events when in non-interactive mode
    if (uiMode === 'none') {
      tauriAPI.setIgnoreMouseEvents(false);
    }
  };

  const handleMouseLeave = () => {
    // Only manage mouse events when in non-interactive mode
    if (uiMode === 'none') {
      tauriAPI.setIgnoreMouseEvents(true);
    }
  };

  // -- Effect: Auto-hide after success/error --
  const prevRecordingStatus = useRef(recordingStatus);
  useEffect(() => {
      if ((prevRecordingStatus.current === 'success' || prevRecordingStatus.current === 'error') && recordingStatus === 'idle') {
          setIsVisible(false);
      }
      prevRecordingStatus.current = recordingStatus;
  }, [recordingStatus]);

  // -- Effect: Manage mouse events based on UI mode and visibility --
  useEffect(() => {
    if (!isVisible) {
      // When completely hidden, ignore mouse events
      tauriAPI.setIgnoreMouseEvents(true);
    } else if (uiMode === 'settings' || uiMode === 'setup' || uiMode === 'warning') {
      // When showing interactive UI, enable mouse events
      tauriAPI.setIgnoreMouseEvents(false);
    } else if (uiMode === 'none') {
      // In normal mode, ignore events unless hovering
      tauriAPI.setIgnoreMouseEvents(true);
    }
  }, [isVisible, uiMode]);

  // -- Effect: Auto-hide idle state after 5 seconds --
  useEffect(() => {
    // Only auto-hide if we're visible, in idle state, and uiMode is 'none'
    if (isVisible && recordingStatus === 'idle' && uiMode === 'none') {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000); // 5 seconds

      return () => clearTimeout(timer);
    }
  }, [isVisible, recordingStatus, uiMode]);

  // -- Action: Save API Key --
  const handleSaveSettings = (newProvider: 'groq' | 'gemini', key: string, model: string) => {
    const trimmedKey = key.trim();
    const trimmedModel = model.trim();
    
    if (!trimmedKey) return;

    if (newProvider === 'groq' && !trimmedKey.startsWith('gsk_')) {
      showToast('Invalid Groq API Key. It usually starts with "gsk_"', 'error');
      return;
    }

    // Update provider if changed
    if (newProvider !== provider) {
        setProvider(newProvider);
    }

    saveKey(trimmedKey, newProvider);
    if (trimmedModel) {
        saveModel(trimmedModel, newProvider);
    }
    
    setUiMode('none');
    // Re-enable mouse event ignoring after saving settings
    tauriAPI.setIgnoreMouseEvents(true);
  };

  const handleSaveSetup = (key: string) => {
      const trimmedKey = key.trim();
      if (!trimmedKey) return;

      if (provider === 'groq' && !trimmedKey.startsWith('gsk_')) {
        showToast('Invalid Groq API Key. It usually starts with "gsk_"', 'error');
        return;
      }

      saveKey(trimmedKey, provider);
      
      // If we were in setup mode, try to start recording
      setUiMode('none');
      // Re-enable mouse event ignoring after saving setup
      tauriAPI.setIgnoreMouseEvents(true);
      setTimeout(() => handleStartRecording(trimmedKey), 100);
  };

  // -- Action: Toggle Settings --
  const toggleSettings = () => {
    if (uiMode === 'settings') {
      setUiMode('none');
      // Re-enable mouse event ignoring when closing settings
      tauriAPI.setIgnoreMouseEvents(true);
    } else {
      setUiMode('settings');
      setIsVisible(true);
      // Enable mouse events when opening settings
      tauriAPI.setIgnoreMouseEvents(false);
    }
  };

  // -- Action: Start Recording --
  const handleStartRecording = async (manualKey?: string) => {
    console.log('[RecorderOverlay] handleStartRecording called');
    const effectiveKey = manualKey || apiKeys[provider];
    console.log('[RecorderOverlay] Effective key exists:', !!effectiveKey);

    // If no API key, force setup mode
    if (!effectiveKey) {
      console.log('[RecorderOverlay] No API key - showing setup');
      setUiMode('setup');
      setIsVisible(true); // Ensure visible for setup
      // Enable mouse events for setup screen
      tauriAPI.setIgnoreMouseEvents(false);
      return;
    }

    console.log('[RecorderOverlay] Starting dictation...');
    await startDictation();
    setIsVisible(true);
    console.log('[RecorderOverlay] Dictation started, window visible');
  };

  // -- Action: Stop Recording --
  const handleStopRecording = useCallback(async () => {
    await stopDictation(provider, apiKeys[provider], models[provider], (msg) => showToast(msg, 'error'));
  }, [stopDictation, provider, apiKeys, models, showToast]);

  const lastToggleTimeRef = useRef(0);

  // -- Trigger: Toggle Visibility --
  const handleToggle = useCallback(async () => {
    console.log('[RecorderOverlay] handleToggle called');
    console.log('[RecorderOverlay] State:', { recordingStatus, uiMode, isKeyLoaded, isVisible });
    
    const now = Date.now();
    if (now - lastToggleTimeRef.current < 500) {
      console.log('[RecorderOverlay] Debounced - ignoring rapid toggle');
      return; // Ignore rapid toggles (debounce)
    }
    lastToggleTimeRef.current = now;

    if (!isKeyLoaded) {
      console.log('[RecorderOverlay] Keys not loaded yet - waiting');
      return; // Wait for storage check
    }

    // Prevent starting a new recording while processing or showing success/error
    if (recordingStatus === 'processing' || recordingStatus === 'success' || recordingStatus === 'error') {
      console.log('[RecorderOverlay] Still processing previous recording - ignoring toggle');
      showToast('Please wait for the current transcription to complete', 'error');
      return;
    }

    if (recordingStatus === 'recording') {
      console.log('[RecorderOverlay] Stopping recording');
      handleStopRecording();
    } else if (uiMode === 'setup' || uiMode === 'settings') {
      console.log('[RecorderOverlay] Closing setup/settings');
      // Close if toggled while in setup or settings
      setIsVisible(false);
      setUiMode('none');
      // Re-enable mouse event ignoring when closing
      tauriAPI.setIgnoreMouseEvents(true);
    } else {
      console.log('[RecorderOverlay] Starting recording');
      // Start Recording
      handleStartRecording();
    }
  }, [recordingStatus, uiMode, handleStopRecording, apiKeys, isKeyLoaded, provider, showToast]); // Added dependencies

  // Refs to hold latest callbacks for Tauri event listeners
  const handleToggleRef = useRef(handleToggle);
  const toggleSettingsRef = useRef(toggleSettings);
  
  // Keep refs up to date
  useEffect(() => {
    handleToggleRef.current = handleToggle;
    toggleSettingsRef.current = toggleSettings;
  });

  // -- Keyboard Shortcuts (Escape key) --
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        if (recordingStatus === 'recording') handleStopRecording();
        else if (uiMode === 'settings') {
            setUiMode('none');
            // Re-enable mouse event ignoring when closing settings with Escape
            tauriAPI.setIgnoreMouseEvents(true);
        }
        else setIsVisible(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, handleStopRecording, recordingStatus, uiMode]);

  // -- Tauri Event Listeners (setup ONCE) --
  useEffect(() => {
    console.log('[RecorderOverlay] Setting up Tauri event listeners...');
    
    const setupListeners = async () => {
      console.log('[RecorderOverlay] Starting listener setup...');
      
      // Wait a bit for Tauri context to be available after HMR
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const unlistenToggle = await tauriAPI.onToggleRecording(() => {
        console.log('[RecorderOverlay] Toggle recording callback fired!');
        // Use the ref to get latest version of callback
        handleToggleRef.current();
      });
      
      const unlistenSettings = await tauriAPI.onOpenSettings(() => {
        console.log('[RecorderOverlay] Open settings callback fired!');
        toggleSettingsRef.current();
      });
      
      const unlistenWarning = await tauriAPI.onShowWarning((msg) => {
        console.log('[RecorderOverlay] Warning callback fired:', msg);
        setWarningMessage(msg);
        setUiMode('warning');
        setIsVisible(true);
        setTimeout(() => {
            setIsVisible(false);
            setUiMode('none');
        }, 3000);
      });

      console.log('[RecorderOverlay] All listeners set up successfully!');
      return { unlistenToggle, unlistenSettings, unlistenWarning };
    };

    let unlisteners: Awaited<ReturnType<typeof setupListeners>> | null = null;
    
    setupListeners().then((result) => {
      unlisteners = result;
      console.log('[RecorderOverlay] Listeners ready!');
    }).catch(error => {
      console.error('[RecorderOverlay] Failed to setup listeners:', error);
    });

    return () => {
      console.log('[RecorderOverlay] Cleaning up Tauri listeners...');
      if (unlisteners) {
        unlisteners.unlistenToggle();
        unlisteners.unlistenSettings();
        unlisteners.unlistenWarning();
      }
    };
  }, []); // Empty deps - setup ONCE on mount

  if (!isVisible) return null;

  return (
    <>
      <Toast 
        message={toastMessage} 
        type={toastType} 
        isVisible={isToastVisible} 
        onClose={hideToast} 
      />
      <div className="fixed z-[9999] bottom-32 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center justify-end">
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
          ${status === 'settings' ? 'overflow-visible' : 'overflow-hidden'}
          ${status === 'setup' ? 'w-80 h-12 rounded-xl' : ''}
          ${status === 'settings' ? 'w-80 h-64 rounded-xl' : ''}
          ${status === 'warning' ? 'w-64 h-10 rounded-xl' : ''}
          ${status === 'recording' ? 'w-40 h-9' : ''}
          ${(status === 'idle' || status === 'processing' || status === 'success' || status === 'error') ? 'w-9 h-9' : ''}
        `}
      >
        <div className="relative w-full h-full flex items-center justify-center">

          {/* WARNING MODE */}
          {status === 'warning' && <WarningView message={warningMessage} />}

          {/* SETTINGS MODE */}
          {status === 'settings' && (
            <SettingsView 
                currentProvider={provider}
                apiKeys={apiKeys}
                models={models}
                onSave={handleSaveSettings}
                onClose={() => {
                  setUiMode('none');
                  // Re-enable mouse event ignoring when closing settings
                  tauriAPI.setIgnoreMouseEvents(true);
                }}
            />
          )}

          {/* SETUP MODE: Input Field */}
          {status === 'setup' && (
            <SetupView 
                provider={provider}
                onSave={handleSaveSetup}
            />
          )}

          {/* RECORDING MODE: Visualizer */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${status === 'recording' && mediaStream ? 'opacity-100 delay-100' : 'opacity-0 pointer-events-none'}`}
          >
            {/* Visualizer logic remains same */}
            {status === 'recording' && mediaStream && <AudioVisualizer stream={mediaStream} isRecording={true} />}
          </div>

          {/* STATUS ICONS */}
          <StatusIndicator status={status} onSettingsClick={toggleSettings} />
        </div>
      </div>
      </div>
    </>
  );
};