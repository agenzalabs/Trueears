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
import { AppProfile, ActiveWindowInfo } from '../types/appProfile';
import { AppProfileService } from '../services/appProfileService';
import { debug } from '../utils/debug';

// Module-level flag to prevent duplicate listeners (survives React Strict Mode)
let listenersInitialized = false;

export const RecorderOverlay: React.FC = () => {
  const isLinux = navigator.userAgent.toLowerCase().includes('linux');
  const [isVisible, setIsVisible] = useState(false);
  const [uiMode, setUiMode] = useState<'none' | 'setup' | 'warning'>('none');
  const [warningMessage, setWarningMessage] = useState('');
  const [windowPadding, setWindowPadding] = useState(isLinux ? 12 : 250);
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
    microphoneId, // Read stored mic ID
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
  const statusMeta = {
    idle: {
      title: 'Standby',
      accent: '#b8f2ff',
      border: 'rgba(184, 242, 255, 0.14)',
      glow: 'rgba(184, 242, 255, 0.10)',
    },
    recording: {
      title: 'Live Capture',
      accent: '#d7fbff',
      border: 'rgba(215, 251, 255, 0.18)',
      glow: 'rgba(143, 236, 255, 0.12)',
    },
    processing: {
      title: 'Synthesizing',
      accent: '#f7f0d0',
      border: 'rgba(247, 240, 208, 0.16)',
      glow: 'rgba(247, 240, 208, 0.10)',
    },
    success: {
      title: 'Inserted',
      accent: '#dcffe8',
      border: 'rgba(220, 255, 232, 0.16)',
      glow: 'rgba(220, 255, 232, 0.10)',
    },
    error: {
      title: 'Signal Fault',
      accent: '#ffd6df',
      border: 'rgba(255, 214, 223, 0.16)',
      glow: 'rgba(255, 214, 223, 0.10)',
    },
    cancelled: {
      title: 'Aborted',
      accent: '#efe5c8',
      border: 'rgba(239, 229, 200, 0.14)',
      glow: 'rgba(239, 229, 200, 0.08)',
    },
    setup: {
      title: 'Provisioning',
      accent: '#b8f2ff',
      border: 'rgba(184, 242, 255, 0.14)',
      glow: 'rgba(184, 242, 255, 0.08)',
    },
    settings: {
      title: 'Control Deck',
      accent: '#b8f2ff',
      border: 'rgba(184, 242, 255, 0.14)',
      glow: 'rgba(184, 242, 255, 0.08)',
    },
    warning: {
      title: 'Signal Warning',
      accent: '#f7f0d0',
      border: 'rgba(247, 240, 208, 0.16)',
      glow: 'rgba(247, 240, 208, 0.10)',
    },
    'log-config-needed': {
      title: 'Route Mapping',
      accent: '#b8f2ff',
      border: 'rgba(184, 242, 255, 0.14)',
      glow: 'rgba(184, 242, 255, 0.08)',
    },
    'log-saved': {
      title: 'Archived',
      accent: '#dcffe8',
      border: 'rgba(220, 255, 232, 0.16)',
      glow: 'rgba(220, 255, 232, 0.10)',
    },
    none: {
      title: 'Standby',
      accent: '#b8f2ff',
      border: 'rgba(184, 242, 255, 0.14)',
      glow: 'rgba(184, 242, 255, 0.10)',
    },
  } as const;
  const currentMeta = statusMeta[status] || statusMeta.idle;
  const statusSizingClass =
    status === 'setup'
      ? 'w-[24rem] h-15 rounded-[1.35rem]'
      : status === 'warning'
        ? 'w-[30rem] max-w-[calc(100vw-2rem)] h-14 rounded-[1.25rem]'
        : status === 'log-config-needed'
          ? 'w-[28rem] h-30 rounded-[1.5rem]'
          : isConfigAppearing
            ? 'w-[28rem] h-30 rounded-[1.5rem]'
            : isConfigTransitioning && !isToastVisible
              ? 'w-[16rem] h-20 rounded-[1.2rem]'
            : isConfigTransitioning && isToastVisible
                ? 'w-[14rem] h-11 rounded-[0.95rem]'
                : status === 'recording'
                  ? 'w-[16.5rem] h-14 rounded-[1.15rem]'
                  : status === 'processing'
                    ? 'w-[12rem] h-14 rounded-[1.1rem]'
                    : 'w-[10rem] h-12 rounded-[1rem]';

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
    @keyframes softPulse {
      0%, 100% { opacity: 0.7; transform: scale(0.985); }
      50% { opacity: 1; transform: scale(1); }
    }
    @keyframes dataBlink {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 0.85; }
    }
  `;

  // -- Effect: Calculate window padding from window position --
  useEffect(() => {
    const calculatePadding = async () => {
      if (isLinux) {
        setWindowPadding(12);
        return;
      }

      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const window = getCurrentWindow();
        const position = await window.outerPosition();
        // Vertical padding is the absolute value of the negative Y position
        const paddingY = Math.abs(Math.min(position.y, 0));
        debug.log('[RecorderOverlay] Window position:', position, 'Calculated vertical padding:', paddingY);
        setWindowPadding(paddingY);
      } catch (e) {
        console.error('[RecorderOverlay] Failed to get window position:', e);
      }
    };
    calculatePadding();
  }, [isLinux]);

  // -- Effect: Debug Tauri availability --
  useEffect(() => {
    debug.log('[RecorderOverlay] Checking Tauri availability...');
    debug.log('[RecorderOverlay] window.__TAURI__ exists:', !!(window as any).__TAURI__);
    debug.log('[RecorderOverlay] window.__TAURI_INTERNALS__ exists:', !!(window as any).__TAURI_INTERNALS__);
    debug.log('[RecorderOverlay] window keys:', Object.keys(window).filter(k => k.includes('TAURI')));
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
  // This prevents the global Escape shortcut from interfering with other apps when Trueears is not visible
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
    debug.log('[RecorderOverlay] Opening settings window');
    await tauriAPI.openSettingsWindow();
  };

  const ensureOverlayWindowVisible = useCallback(async () => {
    if (!isLinux) {
      return;
    }

    try {
      const { getCurrentWindow, PhysicalSize } = await import('@tauri-apps/api/window');
      const window = getCurrentWindow();
      await window.setSize(new PhysicalSize(560, 220));
      await window.center();
      await window.show();
      debug.log('[RecorderOverlay] Ensured overlay window is visible on Linux');
    } catch (error) {
      console.error('[RecorderOverlay] Failed to ensure Linux overlay visibility:', error);
    }
  }, [isLinux]);

  // -- Action: Start Recording --
  const handleStartRecording = async (manualKey?: string, windowInfo?: ActiveWindowInfo | null, selectedText?: string | null) => {
    debug.log('[RecorderOverlay] handleStartRecording called with window info:', windowInfo, 'selected text:', selectedText ? `${selectedText.length} chars` : 'none');
    const effectiveKey = manualKey || apiKey;
    debug.log('[RecorderOverlay] Effective key exists:', !!effectiveKey);

    // If no API key, force setup mode
    if (!effectiveKey) {
      debug.log('[RecorderOverlay] No API key - showing setup');
      setUiMode('setup');
      setIsVisible(true); // Ensure visible for setup
      // Enable mouse events for setup screen
      tauriAPI.setIgnoreMouseEvents(false);
      await ensureOverlayWindowVisible();
      return;
    }

    // Show the overlay immediately while we request microphone permission.
    // In production/WebView2, the permission UI can otherwise be impossible to interact with
    // when the window is click-through.
    setIsVisible(true);
    setIsStartingRecording(true);
    tauriAPI.setIgnoreMouseEvents(false);
    await ensureOverlayWindowVisible();

    try {
      debug.log('[RecorderOverlay] Starting dictation...');
      await startDictation(windowInfo, selectedText, microphoneId);
      debug.log('[RecorderOverlay] Dictation started');
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
    // Get profile-specific language if available for the active window
    const profile = _activeWindowInfo ? AppProfileService.matchProfile(_activeWindowInfo) : null;
    const profileLanguage = profile?.language;

    // Use profile language (highest priority), then auto-detect (if enabled), then global language setting
    const transcriptionLanguage = profileLanguage || (autoDetectLanguage ? undefined : (language || 'en'));

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
  }, [stopDictation, apiKey, model, showToast, llmEnabled, llmApiKey, llmModel, defaultSystemPrompt, language, autoDetectLanguage, _activeWindowInfo]);

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
    debug.log('[RecorderOverlay] Recording mode changed to:', recordingMode);
    recordingModeRef.current = recordingMode;
  }, [recordingMode]);

  // Handle PTT stop pending - when release happened before recording started
  useEffect(() => {
    if (recordingStatus === 'recording' && pttStopPendingRef.current) {
      debug.log('[RecorderOverlay] PTT stop pending detected - stopping recording now that it has started');
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
      debug.log('[RecorderOverlay] Ignoring press - onboarding trigger step active');
      return;
    }

    // Extract window info and selected text from payload
    let effectiveWindowInfo = payload.window_info;
    const selectedText = payload.selected_text;

    debug.log('[RecorderOverlay] Payload received - window_info:', effectiveWindowInfo, 'selected_text:', selectedText ? `${selectedText.length} chars` : 'none');

    // Check for Tutorial Override
    try {
      const tutorialMode = await tauriAPI.getStoreValue('Trueears_TUTORIAL_MODE');
      if (tutorialMode && tutorialMode.length > 0) {
        debug.log('[RecorderOverlay] Tutorial Mode Detected:', tutorialMode);
        const titleMap: Record<string, string> = {
          'tutorial-slack': 'Tutorial - Slack',
          'tutorial-gmail': 'Tutorial - Gmail',
          'tutorial-notion': 'Tutorial - Notion'
        };
        effectiveWindowInfo = {
          app_name: 'Trueears.exe',
          window_title: titleMap[tutorialMode] || 'Trueears Settings',
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
    debug.log('[RecorderOverlay] handleShortcutPressed called, mode:', currentMode);
    debug.log('[RecorderOverlay] State:', { recordingStatus, uiMode, isKeyLoaded, isVisible });

    if (pressTime - lastToggleTimeRef.current < 300) {
      debug.log('[RecorderOverlay] Debounced - ignoring rapid press');
      return;
    }
    lastToggleTimeRef.current = pressTime;

    if (!isKeyLoaded) {
      debug.log('[RecorderOverlay] Keys not loaded yet - waiting');
      return;
    }

    // Prevent starting a new recording while processing or showing success/error
    if (recordingStatus === 'processing' || recordingStatus === 'success' || recordingStatus === 'error') {
      debug.log('[RecorderOverlay] Still processing previous recording - ignoring press');
      showToast('Please wait for the current transcription to complete', 'error');
      return;
    }

    if (recordingStatus === 'recording') {
      // Already recording - handle based on mode
      if (currentMode === 'toggle') {
        debug.log('[RecorderOverlay] Toggle mode: stopping recording on press');
        handleStopRecording();
      } else if (currentMode === 'push-to-talk') {
        // PTT mode: normally release stops recording, but if user presses again
        // while recording, treat it as an emergency stop (fallback for platforms
        // where release events may not fire)
        debug.log('[RecorderOverlay] PTT mode: second press detected - emergency stop');
        handleStopRecording();
      } else {
        // Auto mode: will be handled on release
        debug.log('[RecorderOverlay] Auto mode: waiting for release to determine behavior');
      }
    } else if (uiMode === 'setup') {
      debug.log('[RecorderOverlay] Closing setup');
      setIsVisible(false);
      setUiMode('none');
      tauriAPI.setIgnoreMouseEvents(true);
    } else {
      // Not recording - start recording
      debug.log('[RecorderOverlay] Starting recording');
      handleStartRecording(undefined, pendingWindowInfoRef.current, pendingSelectedTextRef.current);
      pendingWindowInfoRef.current = null;
      pendingSelectedTextRef.current = null;
    }
  }, [recordingStatus, uiMode, handleStopRecording, isKeyLoaded, showToast, onboardingTriggerActive, handleStartRecording]);

  // -- Trigger: Handle Shortcut Released --
  const handleShortcutReleased = useCallback(() => {
    debug.log('[RecorderOverlay] *** SHORTCUT RELEASED EVENT RECEIVED ***');

    if (onboardingTriggerActive) {
      return;
    }

    const PTT_THRESHOLD_MS = 300;
    const currentMode = recordingModeRef.current;
    const holdDuration = Date.now() - pressStartTimeRef.current;
    const wasIdleOnPress = wasIdleOnPressRef.current;

    debug.log('[RecorderOverlay] handleShortcutReleased - Mode:', currentMode, 'Hold duration:', holdDuration + 'ms', 'Was idle on press:', wasIdleOnPress, 'Current status:', recordingStatus);

    // Handle case where release happens before recording has started (async microphone init)
    if (recordingStatus !== 'recording') {
      if (currentMode === 'push-to-talk' && wasIdleOnPress) {
        // PTT mode: user released before recording started - set pending stop
        debug.log('[RecorderOverlay] PTT mode: release before recording started - setting pending stop');
        pttStopPendingRef.current = true;
        return;
      }
      if (currentMode === 'auto' && wasIdleOnPress && holdDuration >= PTT_THRESHOLD_MS) {
        // Auto mode with long press: treat as PTT, set pending stop
        debug.log('[RecorderOverlay] Auto mode: long press release before recording started - setting pending stop');
        pttStopPendingRef.current = true;
        return;
      }
      debug.log('[RecorderOverlay] Not recording, ignoring release');
      return;
    }

    if (currentMode === 'toggle') {
      // Toggle mode: release does nothing (press handles everything)
      debug.log('[RecorderOverlay] Toggle mode: ignoring release');
      return;
    }

    if (currentMode === 'push-to-talk') {
      // PTT mode: always stop on release
      debug.log('[RecorderOverlay] PTT mode: stopping recording on release');
      handleStopRecording();
      return;
    }

    // Auto mode: determine behavior based on hold duration
    if (wasIdleOnPress) {
      // Just started recording on this press
      if (holdDuration < PTT_THRESHOLD_MS) {
        // Quick press - toggle mode: keep recording
        debug.log('[RecorderOverlay] Auto mode: quick press detected, keeping recording (toggle behavior)');
      } else {
        // Long press - PTT mode: stop recording
        debug.log('[RecorderOverlay] Auto mode: long press detected, stopping recording (PTT behavior)');
        handleStopRecording();
      }
    } else {
      // Was already recording - this is a toggle-stop (regardless of duration)
      debug.log('[RecorderOverlay] Auto mode: was already recording, stopping on release');
      handleStopRecording();
    }
  }, [recordingStatus, handleStopRecording, onboardingTriggerActive]);

  // -- Trigger: Handle Shortcut Cancelled (Escape) --
  const handleShortcutCancelled = useCallback(() => {
    debug.log('[RecorderOverlay] *** SHORTCUT CANCELLED EVENT RECEIVED ***');

    if (recordingStatus === 'recording') {
      debug.log('[RecorderOverlay] Cancelling dictation via global shortcut');
      cancelDictation();
    } else if (isVisible) {
      debug.log('[RecorderOverlay] Hiding overlay via global shortcut');
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
      debug.log('[RecorderOverlay] Listeners already initialized, skipping');
      return;
    }
    listenersInitialized = true;
    debug.log('[RecorderOverlay] Setting up Tauri event listeners...');

    let unlistenPressed: (() => void) | null = null;
    let unlistenReleased: (() => void) | null = null;
    let unlistenCancelled: (() => void) | null = null;
    let unlistenWarning: (() => void) | null = null;
    let unlistenOnboardingState: (() => void) | null = null;

    const setupListeners = async () => {
      debug.log('[RecorderOverlay] Starting listener setup...');

      // Wait a bit for Tauri context to be available after HMR
      await new Promise(resolve => setTimeout(resolve, 100));

      unlistenPressed = await tauriAPI.onShortcutPressed((windowInfo) => {
        debug.log('[RecorderOverlay] Shortcut pressed callback fired with window info:', windowInfo);
        handleShortcutPressedRef.current(windowInfo);
      });

      unlistenReleased = await tauriAPI.onShortcutReleased(() => {
        debug.log('[RecorderOverlay] Shortcut released callback fired');
        handleShortcutReleasedRef.current();
      });

      unlistenCancelled = await tauriAPI.onShortcutCancelled(() => {
        debug.log('[RecorderOverlay] Shortcut cancelled callback fired');
        handleShortcutCancelledRef.current();
      });

      unlistenWarning = await tauriAPI.onShowWarning((msg) => {
        debug.log('[RecorderOverlay] Warning callback fired:', msg);
        setWarningMessage(msg);
        setUiMode('warning');
        setIsVisible(true);
        setTimeout(() => {
          setIsVisible(false);
          setUiMode('none');
        }, 3000);
      });

      unlistenOnboardingState = await tauriAPI.onOnboardingTriggerState((active) => {
        debug.log('[RecorderOverlay] onboarding-trigger-state changed:', active);
        setOnboardingTriggerActive(active);
      });

      debug.log('[RecorderOverlay] All listeners set up successfully!');
    };

    setupListeners().catch(error => {
      console.error('[RecorderOverlay] Failed to setup listeners:', error);
      listenersInitialized = false; // Allow retry
    });

    // Don't clean up on React re-renders - listeners should persist
    return () => {
      // Only log, don't actually cleanup (we want listeners to persist)
      debug.log('[RecorderOverlay] Effect cleanup (listeners persist)');
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
          className="fixed z-9999 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center justify-end"
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
          overflow-hidden
          ${statusSizingClass}
        `}
            style={{
              backgroundColor: isConfigTransitioning
                ? isToastVisible
                  ? toastType === 'success' ? 'rgba(16, 185, 129, 0.9)'
                    : toastType === 'error' ? 'rgba(244, 63, 94, 0.9)'
                      : 'rgba(59, 130, 246, 0.9)'
                  : 'rgba(10, 12, 18, 0.96)'
                : 'rgba(10, 12, 18, 0.92)',
              border: `1px solid ${currentMeta.border}`,
              boxShadow: `
                inset 0 1px 0 rgba(255,255,255,0.04),
                0 0 32px ${currentMeta.glow},
                0 12px 38px rgba(0,0,0,0.42)
              `,
              transition: 'all 600ms cubic-bezier(0.4, 0, 0.2, 1)',
              animation: status === 'recording' ? 'softPulse 2.8s ease-in-out infinite' : undefined,
            }}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="absolute inset-0 rounded-[inherit] overflow-hidden pointer-events-none">
                <div
                  className="absolute inset-0"
                  style={{
                    background: `
                      linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 28%),
                      linear-gradient(135deg, rgba(11, 14, 24, 0.98) 0%, rgba(8, 11, 19, 0.96) 100%)
                    `,
                  }}
                />
                <div
                  className="absolute inset-[1px] rounded-[inherit]"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 18%), linear-gradient(135deg, rgba(12,16,28,0.68), rgba(8,10,18,0.94))',
                  }}
                />
                <div
                  className="absolute inset-x-0 top-0 h-px"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${currentMeta.accent}, transparent)`,
                    opacity: 0.7,
                  }}
                />
              </div>

              {status === 'recording' && !isConfigTransitioning && !isConfigAppearing && (
                <div className="absolute inset-0 z-10 flex items-center justify-center gap-3 px-4 pointer-events-none">
                  <div className="relative flex h-10 w-[10rem] items-center justify-center">
                    <span
                      className="absolute left-1 inline-flex h-2 w-2 rounded-full"
                      style={{
                        background: currentMeta.accent,
                        boxShadow: `0 0 10px ${currentMeta.accent}`,
                        animation: 'dataBlink 1.6s linear infinite',
                      }}
                    />
                    {mediaStream && (
                      <AudioVisualizer
                        stream={mediaStream}
                        isRecording={true}
                        barColor={currentMeta.accent}
                      />
                    )}
                  </div>
                </div>
              )}

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
                      <div className={`flex items-center gap-2 text-xs font-medium text-white ${toastType === 'success' ? 'text-emerald-50' : toastType === 'error' ? 'text-rose-50' : 'text-blue-50'
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
                {status === 'recording' && mediaStream && <AudioVisualizer stream={mediaStream} isRecording={true} barColor={currentMeta.accent} />}
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
