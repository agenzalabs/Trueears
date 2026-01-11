import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AudioVisualizer } from './AudioVisualizer';
import { useSettings } from '../hooks/useSettings';
import { useDictation } from '../hooks/useDictation';
import { Toast } from './Toast';
import { useToast } from '../hooks/useToast';
import { SetupView } from './SetupView';
import { StatusIndicator } from './StatusIndicator';
import { WarningView } from './WarningView';
import { ConfigPrompt } from './ConfigPrompt';
import { tauriAPI, ShortcutPressedPayload } from '../utils/tauriApi';
import { ActiveWindowInfo } from '../types/appProfile';

// Module-level flag to prevent duplicate listeners (survives React Strict Mode)
let listenersInitialized = false;

export const RecorderOverlay: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [uiMode, setUiMode] = useState<'none' | 'setup' | 'warning'>('none');
  const [warningMessage, setWarningMessage] = useState('');
  const [windowPadding, setWindowPadding] = useState(250); // Default padding, will be calculated
  const [onboardingTriggerActive, setOnboardingTriggerActive] = useState(false);
  const [isConfigTransitioning, setIsConfigTransitioning] = useState(false);
  const [isConfigAppearing, setIsConfigAppearing] = useState(false);
  const [isStartingRecording, setIsStartingRecording] = useState(false);

  const capsuleRef = useRef<HTMLDivElement | null>(null);
  const logConfigIgnoreMouseRef = useRef<boolean | null>(null);
  
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
    recordingMode,
  } = useSettings();
  
  const isDark = theme === 'dark';
  const {
    status: recordingStatus,
    mediaStream,
    startDictation,
    stopDictation,
    cancelDictation,
    activeWindowInfo: _activeWindowInfo,
    // Log Mode state
    pendingLogContent,
    pendingLogApp,
    confirmLogConfig,
    cancelLogConfig,
  } = useDictation();
  const { isVisible: isToastVisible, message: toastMessage, type: toastType, showToast, hideToast } = useToast();

  // Derived status for rendering
  const status = uiMode !== 'none' ? uiMode : recordingStatus;

  // Add CSS keyframes for smooth morphing animations
  const morphStyles = `
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;

  // -- Effect: Calculate window padding from window position --
  useEffect(() => {
    const calculatePadding = async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const window = getCurrentWindow();
        const position = await window.outerPosition();
        // Vertical padding is the absolute value of the negative Y position
        const paddingY = Math.abs(Math.min(position.y, 0));
        console.log('[RecorderOverlay] Window position:', position, 'Calculated vertical padding:', paddingY);
        setWindowPadding(paddingY);
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
    if (uiMode === 'none' && recordingStatus !== 'log-config-needed') {
      tauriAPI.setIgnoreMouseEvents(false);
    }
  };

  const handleMouseLeave = () => {
    // Only manage mouse events when in non-interactive mode
    if (uiMode === 'none' && recordingStatus !== 'log-config-needed') {
      tauriAPI.setIgnoreMouseEvents(true);
    }
  };

  // -- Effect: Auto-hide after success/error/cancelled/log-saved --
  const prevRecordingStatus = useRef(recordingStatus);
  useEffect(() => {
      // Check if we just transitioned FROM a finished state TO idle
      // OR if we are currently IN a finished state that should auto-hide
      if ((prevRecordingStatus.current === 'success' || prevRecordingStatus.current === 'error' || prevRecordingStatus.current === 'cancelled' || prevRecordingStatus.current === 'log-saved') && recordingStatus === 'idle') {
          setIsVisible(false);
      }

      // Handle toast for clipboard fallback (triggered via status change in hook)
      // We detect if we just entered 'log-saved' state and pendingLogContent is still set (meaning it was cancelled/skipped)
      // Actually, relying on status transition is tricky.
      // Let's just listen for the 'log-saved' status combined with a specific check?
      // Since we don't have the 'result' object here, we can't know for sure if it was file or clipboard.
      // BUT, we know that 'cancelLogConfig' sets status to 'log-saved'.

      prevRecordingStatus.current = recordingStatus;
  }, [recordingStatus]);

  // -- Effect: Manage mouse events based on UI mode and visibility --
  useEffect(() => {
    // While we are requesting mic permission / initializing MediaRecorder,
    // keep the window interactive so the WebView permission UI can be clicked.
    if (isStartingRecording) {
      tauriAPI.setIgnoreMouseEvents(false);
      return;
    }

    if (!isVisible) {
      // When completely hidden, ignore mouse events
      tauriAPI.setIgnoreMouseEvents(true);
    } else if (uiMode === 'setup' || uiMode === 'warning' || recordingStatus === 'log-config-needed') {
      // When showing interactive UI (including Log Mode config), enable mouse events
      tauriAPI.setIgnoreMouseEvents(false);
    } else if (uiMode === 'none') {
      // In normal mode, ignore events unless hovering
      tauriAPI.setIgnoreMouseEvents(true);
    }
  }, [isVisible, uiMode, recordingStatus, isStartingRecording]);

  // -- Effect: While Log Mode config is showing, allow click-through outside the capsule --
  // Prevents the overlay from blocking clicks on other windows, without relying on hover events
  // (which can stop firing once ignore-cursor-events is enabled).
  useEffect(() => {
    if (!isVisible || recordingStatus !== 'log-config-needed') return;

    let isUnmounted = false;
    let intervalId: NodeJS.Timeout | null = null;
    let inFlight = false;

    let cachedWindowPos: { x: number; y: number } | null = null;
    let cachedScale: number | null = null;

    const getWindowInfo = async () => {
      if (cachedWindowPos && cachedScale) {
        return { pos: cachedWindowPos, scale: cachedScale };
      }
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const window = getCurrentWindow();
      const [pos, scale] = await Promise.all([window.outerPosition(), window.scaleFactor()]);
      cachedWindowPos = pos;
      cachedScale = scale;
      return { pos, scale };
    };

    const tick = async () => {
      if (isUnmounted || inFlight) return;
      inFlight = true;

      try {
        const cursor = await tauriAPI.getCursorPosition();
        const rect = capsuleRef.current?.getBoundingClientRect();
        if (!cursor || !rect) return;

        const { pos, scale } = await getWindowInfo();
        const cursorX = (cursor.x - pos.x) / scale;
        const cursorY = (cursor.y - pos.y) / scale;

        const hitMargin = 12;
        const isOverCapsule =
          cursorX >= rect.left - hitMargin &&
          cursorX <= rect.right + hitMargin &&
          cursorY >= rect.top - hitMargin &&
          cursorY <= rect.bottom + hitMargin;

        const shouldIgnore = !isOverCapsule;
        if (logConfigIgnoreMouseRef.current !== shouldIgnore) {
          logConfigIgnoreMouseRef.current = shouldIgnore;
          tauriAPI.setIgnoreMouseEvents(shouldIgnore);
        }
      } catch (_e) {
        // Ignore
      } finally {
        inFlight = false;
      }
    };

    tick();
    intervalId = setInterval(tick, 50);

    return () => {
      isUnmounted = true;
      if (intervalId) clearInterval(intervalId);
      logConfigIgnoreMouseRef.current = null;
    };
  }, [isVisible, recordingStatus]);

  // -- Effect: Auto-hide idle state after 5 seconds --
  useEffect(() => {
    // Only auto-hide if we're visible, in idle state, and uiMode is 'none'
    if (isVisible && recordingStatus === 'idle' && uiMode === 'none' && !isStartingRecording) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000); // 5 seconds

      return () => clearTimeout(timer);
    }
  }, [isVisible, recordingStatus, uiMode, isStartingRecording]);

  // -- Effect: Dynamically register/unregister Escape shortcut based on visibility --
  // This prevents the global Escape shortcut from interfering with other apps when Scribe is not visible
  useEffect(() => {
    if (isVisible) {
      // Register Escape shortcut when overlay becomes visible
      tauriAPI.registerEscapeShortcut();
    } else {
      // Unregister Escape shortcut when overlay is hidden
      tauriAPI.unregisterEscapeShortcut();
    }

    // Cleanup: unregister on unmount
    return () => {
      tauriAPI.unregisterEscapeShortcut();
    };
  }, [isVisible]);

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
  const handleStartRecording = async (manualKey?: string, windowInfo?: ActiveWindowInfo | null, selectedText?: string | null) => {
    console.log('[RecorderOverlay] handleStartRecording called with window info:', windowInfo, 'selected text:', selectedText ? `${selectedText.length} chars` : 'none');
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

    // Show the overlay immediately while we request microphone permission.
    // In production/WebView2, the permission UI can otherwise be impossible to interact with
    // when the window is click-through.
    setIsVisible(true);
    setIsStartingRecording(true);
    tauriAPI.setIgnoreMouseEvents(false);

    try {
      console.log('[RecorderOverlay] Starting dictation...');
      await startDictation(windowInfo, selectedText);
      console.log('[RecorderOverlay] Dictation started');
    } catch (err) {
      console.error('[RecorderOverlay] Failed to start dictation:', err);
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg || 'Failed to start recording', 'error');

      // If mic permission is missing / stuck, open Settings so the user can re-run the permission step.
      if (msg.toLowerCase().includes('microphone')) {
        try {
          await openSettings();
        } catch {
          // ignore
        }
      }
    } finally {
      setIsStartingRecording(false);
    }
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
  const pendingSelectedTextRef = useRef<string | null>(null);
  
  // Refs for hybrid recording mode
  const pressStartTimeRef = useRef(0);
  const wasIdleOnPressRef = useRef(true);
  const recordingModeRef = useRef(recordingMode);
  const pttStopPendingRef = useRef(false); // Flag to stop recording as soon as it starts (for fast PTT release)
  
  // Keep recordingModeRef in sync
  useEffect(() => {
    console.log('[RecorderOverlay] Recording mode changed to:', recordingMode);
    recordingModeRef.current = recordingMode;
  }, [recordingMode]);

  // Handle PTT stop pending - when release happened before recording started
  useEffect(() => {
    if (recordingStatus === 'recording' && pttStopPendingRef.current) {
      console.log('[RecorderOverlay] PTT stop pending detected - stopping recording now that it has started');
      pttStopPendingRef.current = false;
      handleStopRecording();
    }
  }, [recordingStatus, handleStopRecording]);

  // -- Trigger: Handle Shortcut Pressed --
  const handleShortcutPressed = useCallback(async (payload: ShortcutPressedPayload) => {
    // IMPORTANT: Set timestamp immediately before any async operations
    // This ensures handleShortcutReleased has the correct press time
    const pressTime = Date.now();
    pressStartTimeRef.current = pressTime;

    // Start of a new press cycle: clear any prior pending-stop flag.
    // Do this BEFORE any awaits so a fast release can set it again.
    pttStopPendingRef.current = false;

    // Track if we were idle when pressed (release handler may run while this function awaits)
    wasIdleOnPressRef.current = recordingStatus !== 'recording';
    
    if (onboardingTriggerActive) {
      console.log('[RecorderOverlay] Ignoring press - onboarding trigger step active');
      return;
    }

    // Extract window info and selected text from payload
    let effectiveWindowInfo = payload.window_info;
    const selectedText = payload.selected_text;
    
    console.log('[RecorderOverlay] Payload received - window_info:', effectiveWindowInfo, 'selected_text:', selectedText ? `${selectedText.length} chars` : 'none');
    
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
    pendingSelectedTextRef.current = selectedText || null;
    
    const currentMode = recordingModeRef.current;
    console.log('[RecorderOverlay] handleShortcutPressed called, mode:', currentMode);
    console.log('[RecorderOverlay] State:', { recordingStatus, uiMode, isKeyLoaded, isVisible });
    
    if (pressTime - lastToggleTimeRef.current < 300) {
      console.log('[RecorderOverlay] Debounced - ignoring rapid press');
      return;
    }
    lastToggleTimeRef.current = pressTime;

    if (!isKeyLoaded) {
      console.log('[RecorderOverlay] Keys not loaded yet - waiting');
      return;
    }

    // Prevent starting a new recording while processing or showing success/error
    if (recordingStatus === 'processing' || recordingStatus === 'success' || recordingStatus === 'error') {
      console.log('[RecorderOverlay] Still processing previous recording - ignoring press');
      showToast('Please wait for the current transcription to complete', 'error');
      return;
    }

    if (recordingStatus === 'recording') {
      // Already recording - handle based on mode
      if (currentMode === 'toggle') {
        console.log('[RecorderOverlay] Toggle mode: stopping recording on press');
        handleStopRecording();
      } else if (currentMode === 'push-to-talk') {
        // PTT mode: normally release stops recording, but if user presses again
        // while recording, treat it as an emergency stop (fallback for platforms
        // where release events may not fire)
        console.log('[RecorderOverlay] PTT mode: second press detected - emergency stop');
        handleStopRecording();
      } else {
        // Auto mode: will be handled on release
        console.log('[RecorderOverlay] Auto mode: waiting for release to determine behavior');
      }
    } else if (uiMode === 'setup') {
      console.log('[RecorderOverlay] Closing setup');
      setIsVisible(false);
      setUiMode('none');
      tauriAPI.setIgnoreMouseEvents(true);
    } else {
      // Not recording - start recording
      console.log('[RecorderOverlay] Starting recording');
      handleStartRecording(undefined, pendingWindowInfoRef.current, pendingSelectedTextRef.current);
      pendingWindowInfoRef.current = null;
      pendingSelectedTextRef.current = null;
    }
  }, [recordingStatus, uiMode, handleStopRecording, isKeyLoaded, showToast, onboardingTriggerActive, handleStartRecording]);

  // -- Trigger: Handle Shortcut Released --
  const handleShortcutReleased = useCallback(() => {
    console.log('[RecorderOverlay] *** SHORTCUT RELEASED EVENT RECEIVED ***');
    
    if (onboardingTriggerActive) {
      return;
    }

    const PTT_THRESHOLD_MS = 300;
    const currentMode = recordingModeRef.current;
    const holdDuration = Date.now() - pressStartTimeRef.current;
    const wasIdleOnPress = wasIdleOnPressRef.current;
    
    console.log('[RecorderOverlay] handleShortcutReleased - Mode:', currentMode, 'Hold duration:', holdDuration + 'ms', 'Was idle on press:', wasIdleOnPress, 'Current status:', recordingStatus);

    // Handle case where release happens before recording has started (async microphone init)
    if (recordingStatus !== 'recording') {
      if (currentMode === 'push-to-talk' && wasIdleOnPress) {
        // PTT mode: user released before recording started - set pending stop
        console.log('[RecorderOverlay] PTT mode: release before recording started - setting pending stop');
        pttStopPendingRef.current = true;
        return;
      }
      if (currentMode === 'auto' && wasIdleOnPress && holdDuration >= PTT_THRESHOLD_MS) {
        // Auto mode with long press: treat as PTT, set pending stop
        console.log('[RecorderOverlay] Auto mode: long press release before recording started - setting pending stop');
        pttStopPendingRef.current = true;
        return;
      }
      console.log('[RecorderOverlay] Not recording, ignoring release');
      return;
    }

    if (currentMode === 'toggle') {
      // Toggle mode: release does nothing (press handles everything)
      console.log('[RecorderOverlay] Toggle mode: ignoring release');
      return;
    }

    if (currentMode === 'push-to-talk') {
      // PTT mode: always stop on release
      console.log('[RecorderOverlay] PTT mode: stopping recording on release');
      handleStopRecording();
      return;
    }

    // Auto mode: determine behavior based on hold duration
    if (wasIdleOnPress) {
      // Just started recording on this press
      if (holdDuration < PTT_THRESHOLD_MS) {
        // Quick press - toggle mode: keep recording
        console.log('[RecorderOverlay] Auto mode: quick press detected, keeping recording (toggle behavior)');
      } else {
        // Long press - PTT mode: stop recording
        console.log('[RecorderOverlay] Auto mode: long press detected, stopping recording (PTT behavior)');
        handleStopRecording();
      }
    } else {
      // Was already recording - this is a toggle-stop (regardless of duration)
      console.log('[RecorderOverlay] Auto mode: was already recording, stopping on release');
      handleStopRecording();
    }
  }, [recordingStatus, handleStopRecording, onboardingTriggerActive]);

  // -- Trigger: Handle Shortcut Cancelled (Escape) --
  const handleShortcutCancelled = useCallback(() => {
    console.log('[RecorderOverlay] *** SHORTCUT CANCELLED EVENT RECEIVED ***');

    if (recordingStatus === 'recording') {
        console.log('[RecorderOverlay] Cancelling dictation via global shortcut');
        cancelDictation();
    } else if (isVisible) {
        console.log('[RecorderOverlay] Hiding overlay via global shortcut');
        setIsVisible(false);
    }
  }, [recordingStatus, cancelDictation, isVisible]);

  // Legacy handleToggle for backward compatibility (used by some internal calls)
  const handleToggle = useCallback(async (payload: ShortcutPressedPayload) => {
    handleShortcutPressed(payload);
  }, [handleShortcutPressed]);

  // Refs to hold latest callbacks for Tauri event listeners
  const handleToggleRef = useRef(handleToggle);
  const handleShortcutPressedRef = useRef(handleShortcutPressed);
  const handleShortcutReleasedRef = useRef(handleShortcutReleased);
  const handleShortcutCancelledRef = useRef(handleShortcutCancelled);

  // Keep refs up to date
  useEffect(() => {
    handleToggleRef.current = handleToggle;
    handleShortcutPressedRef.current = handleShortcutPressed;
    handleShortcutReleasedRef.current = handleShortcutReleased;
    handleShortcutCancelledRef.current = handleShortcutCancelled;
  });

  // -- Keyboard Shortcuts (Escape key + F12 for DevTools) --
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        if (recordingStatus === 'recording') cancelDictation();
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
  }, [isVisible, cancelDictation, recordingStatus]);

  // -- Tauri Event Listeners (setup ONCE using module-level flag) --
  useEffect(() => {
    // Skip if already initialized (prevents React Strict Mode double-init)
    if (listenersInitialized) {
      console.log('[RecorderOverlay] Listeners already initialized, skipping');
      return;
    }
    listenersInitialized = true;
    console.log('[RecorderOverlay] Setting up Tauri event listeners...');
    
    let unlistenPressed: (() => void) | null = null;
    let unlistenReleased: (() => void) | null = null;
    let unlistenCancelled: (() => void) | null = null;
    let unlistenWarning: (() => void) | null = null;
    let unlistenOnboardingState: (() => void) | null = null;
    
    const setupListeners = async () => {
      console.log('[RecorderOverlay] Starting listener setup...');
      
      // Wait a bit for Tauri context to be available after HMR
      await new Promise(resolve => setTimeout(resolve, 100));
      
      unlistenPressed = await tauriAPI.onShortcutPressed((windowInfo) => {
        console.log('[RecorderOverlay] Shortcut pressed callback fired with window info:', windowInfo);
        handleShortcutPressedRef.current(windowInfo);
      });

      unlistenReleased = await tauriAPI.onShortcutReleased(() => {
        console.log('[RecorderOverlay] Shortcut released callback fired');
        handleShortcutReleasedRef.current();
      });

      unlistenCancelled = await tauriAPI.onShortcutCancelled(() => {
        console.log('[RecorderOverlay] Shortcut cancelled callback fired');
        handleShortcutCancelledRef.current();
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

      unlistenOnboardingState = await tauriAPI.onOnboardingTriggerState((active) => {
        console.log('[RecorderOverlay] onboarding-trigger-state changed:', active);
        setOnboardingTriggerActive(active);
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

  const handleCancelLogConfig = useCallback(async () => {
    // Start transition animation
    setIsConfigTransitioning(true);
    
    // @ts-ignore - awaiting the result of the callback we modified in useDictation
    const copied = await cancelLogConfig();
    
    // Wait a bit before showing toast to let shape morph start
    setTimeout(() => {
      if (copied) {
        showToast('Copied to clipboard', 'success');
      }
    }, 200);
    
    // After full transition completes, reset state
    setTimeout(() => {
      setIsConfigTransitioning(false);
    }, 600);
  }, [cancelLogConfig, showToast]);

  const handleConfirmLogConfig = useCallback(async (...args: Parameters<typeof confirmLogConfig>) => {
    // Start transition animation
    setIsConfigTransitioning(true);
    
    // Confirm the config
    await confirmLogConfig(...args);
    
    // After transition completes, reset state
    setTimeout(() => {
      setIsConfigTransitioning(false);
    }, 600);
  }, [confirmLogConfig]);

  // -- Effect: Hide overlay after toast completes during config transition --
  useEffect(() => {
    if (!isToastVisible && !isConfigTransitioning && recordingStatus === 'log-saved') {
      // Toast has finished showing, hide the overlay
      setIsVisible(false);
    }
  }, [isToastVisible, isConfigTransitioning, recordingStatus]);

  // -- Effect: Trigger config appearing animation --
  const prevStatusForConfig = useRef(recordingStatus);
  useEffect(() => {
    if (prevStatusForConfig.current !== 'log-config-needed' && recordingStatus === 'log-config-needed') {
      // Just transitioned to config prompt - start morphing animation
      setIsConfigAppearing(true);
      setTimeout(() => {
        setIsConfigAppearing(false);
      }, 600);
    }
    prevStatusForConfig.current = recordingStatus;
  }, [recordingStatus]);

  if (!isVisible && !isToastVisible) return null;

  return (
    <>
      <style>{morphStyles}</style>
      {/* External Toast - only for non-morphing cases */}
      {isToastVisible && !isConfigTransitioning && (
        <Toast
          message={toastMessage}
          type={toastType}
          isVisible={true}
          onClose={hideToast}
          bottomOffset={windowPadding + 48}
        />
      )}
      {isVisible && (
      <div
        className="fixed z-[9999] left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center justify-end"
        style={{ bottom: windowPadding + 48 }}
      >
      {/* 
        Capsule Container
      */}
      <div
        ref={capsuleRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`
          pointer-events-auto
          flex items-center justify-center
          backdrop-blur-xl
          rounded-full
          ${status === 'setup' ? 'w-80 h-12 rounded-xl' : ''}
          ${status === 'warning' ? 'w-64 h-10 rounded-xl' : ''}
          ${status === 'log-config-needed' && !isConfigTransitioning && !isConfigAppearing ? 'w-96 h-28 rounded-xl' : ''}
          ${isConfigAppearing ? 'w-96 h-28 rounded-xl' : ''}
          ${isConfigTransitioning && !isToastVisible ? 'w-64 h-20 rounded-xl' : ''}
          ${isConfigTransitioning && isToastVisible ? 'w-52 h-10 rounded-lg' : ''}
          ${status === 'recording' && !isConfigAppearing ? 'w-40 h-9' : ''}
          ${status === 'processing' && !isConfigAppearing ? 'w-9 h-9' : ''}
          ${((status === 'idle' || status === 'success' || status === 'error' || status === 'cancelled' || (status === 'log-saved' && !isConfigTransitioning && !isToastVisible)) && !isConfigAppearing) ? 'w-9 h-9' : ''}
        `}
        style={{
          backgroundColor: isConfigTransitioning 
            ? isToastVisible
              ? toastType === 'success' ? 'rgba(16, 185, 129, 0.9)' 
              : toastType === 'error' ? 'rgba(244, 63, 94, 0.9)' 
              : 'rgba(59, 130, 246, 0.9)'
              : isDark ? 'rgba(10, 10, 10, 0.95)' : 'rgba(248, 250, 252, 0.95)'
            : isDark ? '#0a0a0a' : '#f8fafc',
          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #d1d5db',
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.15)',
          transition: 'all 600ms cubic-bezier(0.4, 0, 0.2, 1)',
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

          {/* LOG MODE CONFIG: First-time app configuration */}
          {status === 'log-config-needed' && !isConfigTransitioning && !isConfigAppearing && pendingLogApp && pendingLogContent && (
            <ConfigPrompt
              appIdentifier={pendingLogApp.identifier}
              appDisplayName={pendingLogApp.displayName}
              pendingContent={pendingLogContent}
              onConfirm={handleConfirmLogConfig}
              onCancel={handleCancelLogConfig}
              isDark={isDark}
            />
          )}

          {/* MORPHING ANIMATION: Recorder to Config */}
          {isConfigAppearing && (
            <>
              {/* Previous status indicator fading out */}
              <div 
                className="absolute inset-0 flex items-center justify-center"
               style={{
                 animation: "fadeOut 400ms ease-out forwards",
                 pointerEvents: 'none',
               }}
              >
                <StatusIndicator status={prevStatusForConfig.current} onSettingsClick={openSettings} isDark={isDark} />
              </div>
              
              {/* ConfigPrompt fading in */}
              {pendingLogApp && pendingLogContent && (
                <div 
                  className="absolute inset-0 flex items-center justify-center"
                 style={{
                   animation: "fadeIn 400ms ease-in 200ms both",
                 }}
                >
                  <ConfigPrompt
                    appIdentifier={pendingLogApp.identifier}
                    appDisplayName={pendingLogApp.displayName}
                    pendingContent={pendingLogContent}
                    onConfirm={handleConfirmLogConfig}
                    onCancel={handleCancelLogConfig}
                    isDark={isDark}
                  />
                </div>
              )}
            </>
          )}

          {/* MORPHING ANIMATION: Config to Toast */}
          {isConfigTransitioning && (
            <>
              {/* ConfigPrompt fading out */}
              {pendingLogApp && pendingLogContent && (
                <div 
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    animation: "fadeOut 400ms ease-out forwards",
                  }}
                >
                  <ConfigPrompt
                    appIdentifier={pendingLogApp.identifier}
                    appDisplayName={pendingLogApp.displayName}
                    pendingContent={pendingLogContent}
                    onConfirm={handleConfirmLogConfig}
                    onCancel={handleCancelLogConfig}
                    isDark={isDark}
                  />
                </div>
              )}
              
              {/* Toast content fading in */}
              {isToastVisible && (
                <div 
                  className="absolute inset-0 flex items-center justify-center px-4"
                  style={{
                    animation: "fadeIn 400ms ease-in 200ms both",
                  }}
                >
                  <div className={`flex items-center gap-2 text-xs font-medium text-white ${
                    toastType === 'success' ? 'text-emerald-50' : toastType === 'error' ? 'text-rose-50' : 'text-blue-50'
                  }`}>
                    {toastType === 'success' && (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    <span>{toastMessage}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* RECORDING MODE: Visualizer */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${status === 'recording' && mediaStream ? 'opacity-100 delay-100' : 'opacity-0 pointer-events-none'}`}
          >
            {/* Visualizer logic remains same */}
            {status === 'recording' && mediaStream && <AudioVisualizer stream={mediaStream} isRecording={true} barColor={isDark ? '#ffffff' : '#1f2937'} />}
          </div>

          {/* STATUS ICONS - Hide during config transitions */}
          {!isConfigTransitioning && !isConfigAppearing && (
            <StatusIndicator status={status} onSettingsClick={openSettings} isDark={isDark} />
          )}
        </div>
      </div>
      </div>
      )}
    </>
  );
};