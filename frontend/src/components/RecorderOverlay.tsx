import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AudioVisualizer } from './AudioVisualizer';
import { useSettings } from '../hooks/useSettings';
import { useDictation } from '../hooks/useDictation';
import { Toast } from './Toast';
import { useToast } from '../hooks/useToast';
import { SetupView } from './SetupView';
import { StatusIndicator } from './StatusIndicator';
import { WarningView } from './WarningView';
import { tauriAPI } from '../utils/tauriApi';
import { ActiveWindowInfo } from '../types/appProfile';

// Module-level flag to prevent duplicate listeners (survives React Strict Mode)
let listenersInitialized = false;

export const RecorderOverlay: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [uiMode, setUiMode] = useState<'none' | 'setup' | 'warning'>('none');
  const [warningMessage, setWarningMessage] = useState('');
  const [windowPadding, setWindowPadding] = useState(250); // Default padding, will be calculated
  
  const { 
    apiKey, 
    model, 
    isKeyLoaded, 
    saveApiKey, 
    llmEnabled,
    llmApiKey,
    llmModel,
    defaultSystemPrompt,
    language,
    autoDetectLanguage,
    theme,
  } = useSettings();
  
  const isDark = theme === 'dark';
  const { status: recordingStatus, mediaStream, startDictation, stopDictation, activeWindowInfo } = useDictation();
  const { isVisible: isToastVisible, message: toastMessage, type: toastType, showToast, hideToast } = useToast();

  // Derived status for rendering
  const status = uiMode !== 'none' ? uiMode : recordingStatus;

  // -- Effect: Calculate window padding from window position --
  useEffect(() => {
    const calculatePadding = async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const window = getCurrentWindow();
        const position = await window.outerPosition();
        // Padding is the absolute value of the negative position
        const padding = Math.abs(Math.min(position.x, position.y));
        console.log('[RecorderOverlay] Window position:', position, 'Calculated padding:', padding);
        if (padding > 0) {
          setWindowPadding(padding);
        }
      } catch (e) {
        console.error('[RecorderOverlay] Failed to get window position:', e);
      }
    };
    calculatePadding();
  }, []);

  // -- Effect: Debug Tauri availability --
  useEffect(() => {
    console.log('[RecorderOverlay] Checking Tauri availability...');
    console.log('[RecorderOverlay] window.__TAURI__ exists:', !!(window as any).__TAURI__);
    console.log('[RecorderOverlay] window.__TAURI_INTERNALS__ exists:', !!(window as any).__TAURI_INTERNALS__);
    console.log('[RecorderOverlay] window keys:', Object.keys(window).filter(k => k.includes('TAURI')));
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
    } else if (uiMode === 'setup' || uiMode === 'warning') {
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

  // Removed handleSaveSettings - settings now in separate window

  const handleSaveSetup = (key: string) => {
      const trimmedKey = key.trim();
      if (!trimmedKey) return;

      if (!trimmedKey.startsWith('gsk_')) {
        showToast('Invalid Groq API Key. It usually starts with "gsk_"', 'error');
        return;
      }

      saveApiKey(trimmedKey);
      
      // If we were in setup mode, try to start recording
      setUiMode('none');
      // Re-enable mouse event ignoring after saving setup
      tauriAPI.setIgnoreMouseEvents(true);
      setTimeout(() => handleStartRecording(trimmedKey), 100);
  };

  // -- Action: Open Settings Window --
  const openSettings = async () => {
    console.log('[RecorderOverlay] Opening settings window');
    await tauriAPI.openSettingsWindow();
  };

  // -- Action: Start Recording --
  const handleStartRecording = async (manualKey?: string, windowInfo?: ActiveWindowInfo | null) => {
    console.log('[RecorderOverlay] handleStartRecording called with window info:', windowInfo);
    const effectiveKey = manualKey || apiKey;
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
    await startDictation(windowInfo);
    setIsVisible(true);
    console.log('[RecorderOverlay] Dictation started, window visible');
  };

  // -- Action: Stop Recording --
  const handleStopRecording = useCallback(async () => {
    // Use selected language, or undefined if auto-detect is enabled
    const transcriptionLanguage = autoDetectLanguage ? undefined : (language || 'en');
    await stopDictation(
      apiKey, 
      model, 
      (msg) => showToast(msg, 'error'),
      llmEnabled,
      llmApiKey || apiKey,
      llmModel,
      defaultSystemPrompt,
      transcriptionLanguage
    );
  }, [stopDictation, apiKey, model, showToast, llmEnabled, llmApiKey, llmModel, defaultSystemPrompt, language, autoDetectLanguage]);

  const lastToggleTimeRef = useRef(0);
  const pendingWindowInfoRef = useRef<ActiveWindowInfo | null>(null);

  // -- Trigger: Toggle Visibility --
  const handleToggle = useCallback(async (windowInfo?: ActiveWindowInfo | null) => {
    let effectiveWindowInfo = windowInfo;
    
    // Check for Tutorial Override
    try {
        const tutorialMode = await tauriAPI.getStoreValue('SCRIBE_TUTORIAL_MODE');
        if (tutorialMode && tutorialMode.length > 0) {
            console.log('[RecorderOverlay] Tutorial Mode Detected:', tutorialMode);
            const titleMap: Record<string, string> = {
                'tutorial-slack': 'Tutorial - Slack',
                'tutorial-gmail': 'Tutorial - Gmail',
                'tutorial-notion': 'Tutorial - Notion'
            };
            effectiveWindowInfo = {
                app_name: 'scribe.exe',
                window_title: titleMap[tutorialMode] || 'Scribe Settings',
                executable_path: ''
            };
        }
    } catch (e) {
        console.error('[RecorderOverlay] Failed to check tutorial mode', e);
    }

    if (effectiveWindowInfo) {
      pendingWindowInfoRef.current = effectiveWindowInfo;
    }
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
    } else if (uiMode === 'setup') {
      console.log('[RecorderOverlay] Closing setup');
      // Close if toggled while in setup
      setIsVisible(false);
      setUiMode('none');
      // Re-enable mouse event ignoring when closing
      tauriAPI.setIgnoreMouseEvents(true);
    } else {
      console.log('[RecorderOverlay] Starting recording');
      // Start Recording
      handleStartRecording(undefined, pendingWindowInfoRef.current);
      pendingWindowInfoRef.current = null;
    }
  }, [recordingStatus, uiMode, handleStopRecording, apiKey, isKeyLoaded, showToast]);

  // Refs to hold latest callbacks for Tauri event listeners
  const handleToggleRef = useRef(handleToggle);
  
  // Keep refs up to date
  useEffect(() => {
    handleToggleRef.current = handleToggle;
  });

  // -- Keyboard Shortcuts (Escape key + F12 for DevTools) --
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        if (recordingStatus === 'recording') handleStopRecording();
        else setIsVisible(false);
      }
      
      // F12 to open DevTools
      if (e.key === 'F12') {
        e.preventDefault();
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          const window = getCurrentWindow();
          // @ts-ignore - isDevToolsOpen might not be in types
          if (window.isDevToolsOpen && await window.isDevToolsOpen()) {
            // @ts-ignore
            await window.closeDevTools();
          } else {
            // @ts-ignore
            await window.openDevTools();
          }
        } catch (err) {
          console.error('Failed to toggle DevTools:', err);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, handleStopRecording, recordingStatus]);

  // -- Tauri Event Listeners (setup ONCE using module-level flag) --
  useEffect(() => {
    // Skip if already initialized (prevents React Strict Mode double-init)
    if (listenersInitialized) {
      console.log('[RecorderOverlay] Listeners already initialized, skipping');
      return;
    }
    listenersInitialized = true;
    console.log('[RecorderOverlay] Setting up Tauri event listeners...');
    
    let unlistenToggle: (() => void) | null = null;
    let unlistenWarning: (() => void) | null = null;
    
    const setupListeners = async () => {
      console.log('[RecorderOverlay] Starting listener setup...');
      
      // Wait a bit for Tauri context to be available after HMR
      await new Promise(resolve => setTimeout(resolve, 100));
      
      unlistenToggle = await tauriAPI.onToggleRecording((windowInfo) => {
        console.log('[RecorderOverlay] Toggle recording callback fired with window info:', windowInfo);
        handleToggleRef.current(windowInfo);
      });
      
      unlistenWarning = await tauriAPI.onShowWarning((msg) => {
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
    };

    setupListeners().catch(error => {
      console.error('[RecorderOverlay] Failed to setup listeners:', error);
      listenersInitialized = false; // Allow retry
    });

    // Don't clean up on React re-renders - listeners should persist
    return () => {
      // Only log, don't actually cleanup (we want listeners to persist)
      console.log('[RecorderOverlay] Effect cleanup (listeners persist)');
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
      <div 
        className="fixed z-[9999] left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center justify-end"
        style={{ bottom: windowPadding + 48 }}
      >
      {/* 
        Capsule Container
      */}
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`
          pointer-events-auto
          flex items-center justify-center
          backdrop-blur-xl
          rounded-full
          transition-all duration-300
          ${status === 'setup' ? 'w-80 h-12 rounded-xl' : ''}
          ${status === 'warning' ? 'w-64 h-10 rounded-xl' : ''}
          ${status === 'recording' ? 'w-40 h-9' : ''}
          ${(status === 'idle' || status === 'processing' || status === 'success' || status === 'error') ? 'w-9 h-9' : ''}
        `}
        style={{
          backgroundColor: isDark ? '#0a0a0a' : '#f8fafc',
          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #d1d5db',
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.15)',
        }}
      >
        <div className="relative w-full h-full flex items-center justify-center">

          {/* WARNING MODE */}
          {status === 'warning' && <WarningView message={warningMessage} />}

          {/* SETUP MODE: Input Field */}
          {status === 'setup' && (
            <SetupView 
                onSave={handleSaveSetup}
                isDark={isDark}
            />
          )}

          {/* RECORDING MODE: Visualizer */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${status === 'recording' && mediaStream ? 'opacity-100 delay-100' : 'opacity-0 pointer-events-none'}`}
          >
            {/* Visualizer logic remains same */}
            {status === 'recording' && mediaStream && <AudioVisualizer stream={mediaStream} isRecording={true} barColor={isDark ? '#ffffff' : '#1f2937'} />}
          </div>

          {/* STATUS ICONS */}
          <StatusIndicator status={status} onSettingsClick={openSettings} isDark={isDark} />
        </div>
      </div>
      </div>
    </>
  );
};