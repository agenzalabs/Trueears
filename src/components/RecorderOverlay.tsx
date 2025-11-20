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

// Declare electronAPI for TypeScript visibility
declare global {
  interface Window {
    electronAPI?: {
      onToggleRecording: (callback: () => void) => () => void;
      onOpenSettings: (callback: () => void) => () => void;
      onShowWarning: (callback: (message: string) => void) => () => void;
      setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => void;
      sendTranscription: (text: string) => void;
    };
  }
}

export const RecorderOverlay: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [uiMode, setUiMode] = useState<'none' | 'setup' | 'settings' | 'warning'>('none');
  const [warningMessage, setWarningMessage] = useState('');
  
  const { apiKeys, models, provider, setProvider, isKeyLoaded, saveKey, saveModel } = useSettings();
  const { status: recordingStatus, mediaStream, startDictation, stopDictation } = useDictation();
  const { isVisible: isToastVisible, message: toastMessage, type: toastType, showToast, hideToast } = useToast();

  // Derived status for rendering
  const status = uiMode !== 'none' ? uiMode : recordingStatus;

  // -- Effect: Manage Click-Through --
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
    }
  }, []);

  const handleMouseEnter = () => {
    window.electronAPI?.setIgnoreMouseEvents(false);
  };

  const handleMouseLeave = () => {
    window.electronAPI?.setIgnoreMouseEvents(true, { forward: true });
  };

  // -- Effect: Auto-hide after success/error --
  const prevRecordingStatus = useRef(recordingStatus);
  useEffect(() => {
      if ((prevRecordingStatus.current === 'success' || prevRecordingStatus.current === 'error') && recordingStatus === 'idle') {
          setIsVisible(false);
      }
      prevRecordingStatus.current = recordingStatus;
  }, [recordingStatus]);


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
      setTimeout(() => handleStartRecording(trimmedKey), 100);
  };

  // -- Action: Toggle Settings --
  const toggleSettings = () => {
    if (uiMode === 'settings') {
      setUiMode('none');
    } else {
      setUiMode('settings');
      setIsVisible(true);
    }
  };

  // -- Action: Start Recording --
  const handleStartRecording = async (manualKey?: string) => {
    const effectiveKey = manualKey || apiKeys[provider];

    // If no API key, force setup mode
    if (!effectiveKey) {
      setUiMode('setup');
      setIsVisible(true); // Ensure visible for setup
      return;
    }

    await startDictation();
    setIsVisible(true);
  };

  // -- Action: Stop Recording --
  const handleStopRecording = useCallback(async () => {
    await stopDictation(provider, apiKeys[provider], models[provider], (msg) => showToast(msg, 'error'));
  }, [stopDictation, provider, apiKeys, models, showToast]);

  const lastToggleTimeRef = useRef(0);

  // -- Trigger: Toggle Visibility --
  const handleToggle = useCallback(async () => {
    const now = Date.now();
    if (now - lastToggleTimeRef.current < 500) {
      return; // Ignore rapid toggles (debounce)
    }
    lastToggleTimeRef.current = now;

    if (!isKeyLoaded) return; // Wait for storage check

    if (recordingStatus === 'recording') {
      handleStopRecording();
    } else if (uiMode === 'setup' || uiMode === 'settings') {
      // Close if toggled while in setup or settings
      setIsVisible(false);
      setUiMode('none');
    } else {
      // Start Recording
      handleStartRecording();
    }
  }, [recordingStatus, uiMode, handleStopRecording, apiKeys, isKeyLoaded, provider]); // Added dependencies

  // -- Listeners: Electron IPC & Keyboard Shortcuts --
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        if (recordingStatus === 'recording') handleStopRecording();
        else if (uiMode === 'settings') {
            setUiMode('none');
        }
        else setIsVisible(false);
      }
      // Enter key handling is now inside sub-components for setup/settings
    };

    window.addEventListener('keydown', handleKeyDown);

    // Electron IPC Listener
    let removeIpcListener: (() => void) | undefined;
    let removeSettingsListener: (() => void) | undefined;
    let removeWarningListener: (() => void) | undefined;

    if (window.electronAPI) {
      removeIpcListener = window.electronAPI.onToggleRecording(() => {
        handleToggle();
      });
      removeSettingsListener = window.electronAPI.onOpenSettings(() => {
        toggleSettings();
      });
      removeWarningListener = window.electronAPI.onShowWarning((msg) => {
        setWarningMessage(msg);
        setUiMode('warning');
        setIsVisible(true);
        // Auto hide warning after 3s
        setTimeout(() => {
            setIsVisible(false);
            setUiMode('none');
        }, 3000);
      });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (removeIpcListener) removeIpcListener();
      if (removeSettingsListener) removeSettingsListener();
      if (removeWarningListener) removeWarningListener();
    };
  }, [handleToggle, isVisible, handleStopRecording, recordingStatus, uiMode]);

  if (!isVisible) return null;

  return (
    <>
      <Toast 
        message={toastMessage} 
        type={toastType} 
        isVisible={isToastVisible} 
        onClose={hideToast} 
      />
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
                onClose={() => setUiMode('none')}
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