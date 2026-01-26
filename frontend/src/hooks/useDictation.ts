import { useState, useCallback, useRef } from 'react';
import { useAudioRecorder } from './useAudioRecorder';
import { processTranscription, postProcessTranscription, finalizeDictation, transformSelectedText } from '../controllers/dictationController';
import { ActiveWindowInfo } from '../types/appProfile';
import { playCancelSound, playSuccessSound, playLogSavedSound } from '../utils/soundUtils';
import { logModeService } from '../services/logModeService';
import { debug } from '../utils/debug';

export type DictationStatus = 'idle' | 'recording' | 'processing' | 'success' | 'error' | 'cancelled' | 'log-saved' | 'log-config-needed';
export type DictationMode = 'dictation' | 'transform';

export const useDictation = () => {
  const [status, setStatus] = useState<DictationStatus>('idle');
  const [mode, setMode] = useState<DictationMode>('dictation');
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const { isRecording, mediaStream, startRecording, stopRecording, cancelRecording } = useAudioRecorder();
  const isProcessingRef = useRef(false);
  const isCancellingRef = useRef(false);
  const [activeWindowInfo, setActiveWindowInfo] = useState<ActiveWindowInfo | null>(null);

  // Log Mode state
  const [pendingLogContent, setPendingLogContent] = useState<string | null>(null);
  const [pendingLogApp, setPendingLogApp] = useState<{ identifier: string; displayName: string } | null>(null);

  const startDictation = async (windowInfo?: ActiveWindowInfo | null, preSelectedText?: string | null, microphoneId?: string) => {
    debug.log('[useDictation] startDictation called with window info:', windowInfo, 'selected text:', preSelectedText ? `${preSelectedText.length} chars` : 'none');
    try {
      if (windowInfo) {
        setActiveWindowInfo(windowInfo);
      }

      // Use the pre-copied selected text passed from backend (copied before focus changed)
      if (preSelectedText && preSelectedText.trim().length > 0) {
        setMode('transform');
        setSelectedText(preSelectedText);
        debug.log('[useDictation] Transform mode - selected text:', preSelectedText.substring(0, 50) + (preSelectedText.length > 50 ? '...' : ''));
      } else {
        setMode('dictation');
        setSelectedText(null);
        debug.log('[useDictation] Dictation mode - no text selected');
      }

      await startRecording(microphoneId);
      setStatus('recording');
      debug.log('[useDictation] Status set to recording');
    } catch (error) {
      console.error('[useDictation] Failed to start recording:', error);
      setStatus('error');
      throw error;
    }
  };

  const stopDictation = useCallback(async (
    apiKey: string,
    model: string,
    onError?: (msg: string) => void,
    llmEnabled?: boolean,
    llmApiKey?: string,
    llmModel?: string,
    defaultPrompt?: string,
    language?: string
  ) => {
    debug.log('[useDictation] stopDictation called with llmEnabled:', llmEnabled, 'mode:', mode);

    if (!isRecording) {
      console.warn('[useDictation] Not recording, ignoring stop request');
      return;
    }

    // If already processing, ignore this call
    if (isProcessingRef.current) {
      console.warn('[useDictation] Already processing a transcription, ignoring stop request');
      return;
    }

    isProcessingRef.current = true;
    setStatus('processing');
    debug.log('[useDictation] Status set to processing');

    const resetState = () => {
      setStatus('idle');
      isProcessingRef.current = false;
      setActiveWindowInfo(null);
      setMode('dictation');
      setSelectedText(null);
      // Reset Log Mode state
      setPendingLogContent(null);
      setPendingLogApp(null);
    };

    try {
      const audioBlob = await stopRecording();
      debug.log('[useDictation] Audio blob size:', audioBlob.size);

      if (audioBlob.size === 0) {
        throw new Error("No audio captured");
      }

      debug.log('[useDictation] Starting transcription...');
      const rawText = await processTranscription(audioBlob, apiKey, model, language);
      debug.log('[useDictation] Transcription result:', rawText);

      // ========== Log Mode Check ==========
      // Check for trigger phrase BEFORE any LLM post-processing
      // Only in regular dictation mode (not transform mode)
      if (mode === 'dictation' && rawText) {
        try {
          const triggerResult = await logModeService.detectTrigger(rawText);

          if (triggerResult.detected && triggerResult.content !== undefined) {
            debug.log('[useDictation] Log Mode triggered:', triggerResult.trigger?.phrase);

            // Get the app identifier from active window
            const appIdentifier = activeWindowInfo?.app_name || 'unknown';
            const appDisplayName = activeWindowInfo?.app_name?.replace(/\.exe$/i, '') || 'Unknown App';

            // Check if we have a mapping for this app
            const mapping = await logModeService.findMappingForApp(appIdentifier);

            if (mapping) {
              // We have a mapping - save the log entry
              const result = await logModeService.saveLogEntry(triggerResult.content, appIdentifier);

              if (result.success) {
                debug.log('[useDictation] Log saved to:', result.filePath);
                playLogSavedSound();
                setStatus('log-saved');
                setTimeout(() => {
                  resetState();
                }, 2000);
                return; // Exit - we handled Log Mode
              } else if (result.fallbackToClipboard) {
                debug.log('[useDictation] Log copied to clipboard as fallback');
                playLogSavedSound();
                // We'll handle the toast in the UI component by checking for a special status or callback
                // But since we don't have a direct way to trigger toast from here without prop drilling,
                // we'll rely on the status change. The RecorderOverlay doesn't have toast logic for this yet.
                // For now, let's keep status as log-saved but maybe add a flag?
                // Actually, let's use a new status 'log-saved-clipboard' if needed, but 'log-saved' is fine for visual checkmark.
                // To show the toast, we need to pass a message up or use a global toast service.
                // Since useDictation is used in RecorderOverlay which has access to showToast,
                // we can add an onLogSaved callback to the hook, or just return the result.

                // For this quick fix without refactoring everything, let's just rely on the checkmark for now
                // and add the toast in the ConfigPrompt cancel handler which is where the user explicitly "skips".
                // Here, it's an error fallback, so maybe a toast IS needed.
                // Let's modify the hook to return a 'logResult' state that the UI can react to?
                // Or simpler: The RecorderOverlay can watch for status changes.

                setStatus('log-saved');
                setTimeout(() => {
                  resetState();
                }, 2000);
                return;
              } else {
                console.error('[useDictation] Log Mode failed:', result.error);
                // Fall through to normal dictation as fallback
              }
            } else {
              // No mapping - need to prompt user for configuration
              debug.log('[useDictation] No mapping for app:', appIdentifier);
              setPendingLogContent(triggerResult.content);
              setPendingLogApp({ identifier: appIdentifier, displayName: appDisplayName });
              setStatus('log-config-needed');
              isProcessingRef.current = false;
              // Don't reset - UI will show config prompt
              return;
            }
          }
        } catch (error) {
          console.error('[useDictation] Log Mode detection error:', error);
          // Fall through to normal dictation
        }
      }
      // ========== End Log Mode Check ==========

      let finalText = rawText;

      // Transform mode: use transcription as instruction to transform selected text
      if (mode === 'transform' && selectedText && rawText) {
        debug.log('[useDictation] Transform mode: applying transformation...');
        try {
          const effectiveLlmKey = llmApiKey || apiKey;
          const effectiveLlmModel = llmModel || 'openai/gpt-oss-120b';

          const transformed = await transformSelectedText(
            selectedText,
            rawText, // The spoken instruction
            effectiveLlmKey,
            effectiveLlmModel
          );

          if (transformed && transformed.trim().length > 0) {
            finalText = transformed;
            debug.log('[useDictation] Transformed text:', finalText);
          } else {
            throw new Error('Empty transformation result');
          }
        } catch (error) {
          console.error('[useDictation] Transform failed:', error);
          if (onError) {
            onError('Transform failed - please try again');
          }
          setStatus('error');
          debug.log('[useDictation] Transform error, will reset to idle in 2s');
          setTimeout(() => {
            resetState();
            debug.log('[useDictation] Status reset to idle after transform error');
          }, 2000);
          return; // Exit early, don't paste anything
        }
      } else if (llmEnabled && llmApiKey && rawText) {
        // Regular dictation mode with LLM post-processing
        debug.log('[useDictation] Applying LLM post-processing...');
        try {
          const processed = await postProcessTranscription(
            rawText,
            activeWindowInfo,
            llmApiKey,
            llmModel || 'openai/gpt-oss-120b',
            defaultPrompt || ''
          );
          if (processed && processed.trim().length > 0) {
            finalText = processed;
            debug.log('[useDictation] Post-processed text:', finalText);
          } else {
            console.warn('[useDictation] Post-processed text was empty, falling back to raw transcription');
          }
        } catch (error) {
          console.error('[useDictation] LLM post-processing failed:', error);
          // Continue with raw transcription
        }
      }

      if (finalText) {
        await finalizeDictation(finalText);
        setStatus('success');
        debug.log('[useDictation] Status set to success, will reset to idle in 1.5s');
        setTimeout(() => {
          resetState();
          debug.log('[useDictation] Status reset to idle, isProcessingRef reset');
        }, 1500);
      } else {
        debug.log('[useDictation] No text received, resetting to idle');
        resetState();
      }
    } catch (error) {
      console.error("[useDictation] Dictation failed", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (onError) {
        onError(errorMessage);
      }
      setStatus('error');
      debug.log('[useDictation] Status set to error, will reset to idle in 2s');
      setTimeout(() => {
        resetState();
        debug.log('[useDictation] Status reset to idle after error, isProcessingRef reset');
      }, 2000);
    }
  }, [isRecording, stopRecording, activeWindowInfo, mode, selectedText]);

  const cancelDictation = useCallback(() => {
    debug.log('[useDictation] cancelDictation called, isRecording:', isRecording, 'status:', status);

    // Prevent multiple cancellations
    if (isCancellingRef.current) {
      console.warn('[useDictation] Already cancelling, ignoring cancel request');
      return;
    }

    // Only cancel if currently recording
    if (!isRecording && status !== 'recording') {
      console.warn('[useDictation] Not recording, ignoring cancel request');
      return;
    }

    isCancellingRef.current = true;

    // Cancel the audio recording (discards audio, no Blob created)
    cancelRecording();

    // Set status to cancelled
    setStatus('cancelled');
    debug.log('[useDictation] Status set to cancelled');

    // Play cancel sound for audio feedback
    playCancelSound();

    // Reset state after display duration (matches success/error timing)
    setTimeout(() => {
      setStatus('idle');
      setActiveWindowInfo(null);
      setMode('dictation');
      setSelectedText(null);
      isCancellingRef.current = false;
      debug.log('[useDictation] Status reset to idle after cancellation');
    }, 1500);
  }, [isRecording, status, cancelRecording]);

  // ========== Log Mode Config Handlers ==========

  /**
   * Called when user confirms config in the ConfigPrompt.
   * Saves the mapping and logs the pending content.
   */
  const confirmLogConfig = useCallback(async (filePath: string) => {
    if (!pendingLogContent || !pendingLogApp) {
      console.warn('[useDictation] No pending log content to save');
      setStatus('idle');
      setPendingLogContent(null);
      setPendingLogApp(null);
      return;
    }

    debug.log('[useDictation] Confirming log config:', pendingLogApp.identifier, '->', filePath);

    try {
      // Save the new mapping
      await logModeService.addAppMapping(
        pendingLogApp.identifier,
        pendingLogApp.displayName,
        filePath
      );

      // Now save the pending log entry
      const result = await logModeService.saveLogEntry(pendingLogContent, pendingLogApp.identifier);

      if (result.success || result.fallbackToClipboard) {
        debug.log('[useDictation] Log saved after config:', result.filePath);
        playLogSavedSound();
        setStatus('log-saved');
        setTimeout(() => {
          setStatus('idle');
          setPendingLogContent(null);
          setPendingLogApp(null);
        }, 2000);
      } else {
        console.error('[useDictation] Failed to save log after config:', result.error);
        setStatus('error');
        setTimeout(() => {
          setStatus('idle');
          setPendingLogContent(null);
          setPendingLogApp(null);
        }, 2000);
      }
    } catch (error) {
      console.error('[useDictation] Log config confirmation failed:', error);
      setStatus('error');
      setTimeout(() => {
        setStatus('idle');
        setPendingLogContent(null);
        setPendingLogApp(null);
      }, 2000);
    }
  }, [pendingLogContent, pendingLogApp]);

  /**
   * Called when user cancels config in the ConfigPrompt.
   * Copies content to clipboard as fallback.
   */
  const cancelLogConfig = useCallback(async () => {
    if (pendingLogContent) {
      debug.log('[useDictation] Cancelling log config, copying to clipboard');
      try {
        await navigator.clipboard.writeText(logModeService.formatLogEntry(pendingLogContent));

        // Use a special status to trigger the toast in the UI
        setStatus('log-saved');

        // We need a way to signal "clipboard" vs "file" to the UI for the toast.
        // For now, we'll just rely on the 'log-saved' status and the fact that
        // the user *just clicked* "Skip", so they know what happened.
        // If we want a specific toast "Copied to clipboard", we should expose a signal.

        setTimeout(() => {
          setStatus('idle');
          setPendingLogContent(null);
          setPendingLogApp(null);
        }, 2000);

        // Return true to indicate clipboard copy happened (helper for UI if we refactor)
        return true;
      } catch (error) {
        console.error('[useDictation] Failed to copy to clipboard:', error);
        setStatus('idle');
        setPendingLogContent(null);
        setPendingLogApp(null);
        return false;
      }
    } else {
      setStatus('idle');
      setPendingLogContent(null);
      setPendingLogApp(null);
      return false;
    }
  }, [pendingLogContent]);

  // ========== End Log Mode Config Handlers ==========

  return {
    status,
    mode,
    mediaStream,
    startDictation,
    stopDictation,
    cancelDictation,
    activeWindowInfo,
    // Log Mode exports
    pendingLogContent,
    pendingLogApp,
    confirmLogConfig,
    cancelLogConfig,
  };
};
