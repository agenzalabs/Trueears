import { useState, useCallback, useRef } from 'react';
import { useAudioRecorder } from './useAudioRecorder';
import { processTranscription, postProcessTranscription, finalizeDictation, transformSelectedText } from '../controllers/dictationController';
import { ActiveWindowInfo } from '../types/appProfile';
import { playCancelSound } from '../utils/soundUtils';

export type DictationStatus = 'idle' | 'recording' | 'processing' | 'success' | 'error' | 'cancelled';
export type DictationMode = 'dictation' | 'transform';

export const useDictation = () => {
  const [status, setStatus] = useState<DictationStatus>('idle');
  const [mode, setMode] = useState<DictationMode>('dictation');
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const { isRecording, mediaStream, startRecording, stopRecording, cancelRecording } = useAudioRecorder();
  const isProcessingRef = useRef(false);
  const isCancellingRef = useRef(false);
  const [activeWindowInfo, setActiveWindowInfo] = useState<ActiveWindowInfo | null>(null);

  const startDictation = async (windowInfo?: ActiveWindowInfo | null, preSelectedText?: string | null) => {
    console.log('[useDictation] startDictation called with window info:', windowInfo, 'selected text:', preSelectedText ? `${preSelectedText.length} chars` : 'none');
    try {
      if (windowInfo) {
        setActiveWindowInfo(windowInfo);
      }
      
      // Use the pre-copied selected text passed from backend (copied before focus changed)
      if (preSelectedText && preSelectedText.trim().length > 0) {
        setMode('transform');
        setSelectedText(preSelectedText);
        console.log('[useDictation] Transform mode - selected text:', preSelectedText.substring(0, 50) + (preSelectedText.length > 50 ? '...' : ''));
      } else {
        setMode('dictation');
        setSelectedText(null);
        console.log('[useDictation] Dictation mode - no text selected');
      }
      
      await startRecording();
      setStatus('recording');
      console.log('[useDictation] Status set to recording');
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
    console.log('[useDictation] stopDictation called with llmEnabled:', llmEnabled, 'mode:', mode);
    
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
    console.log('[useDictation] Status set to processing');

    const resetState = () => {
      setStatus('idle');
      isProcessingRef.current = false;
      setActiveWindowInfo(null);
      setMode('dictation');
      setSelectedText(null);
    };

    try {
      const audioBlob = await stopRecording();
      console.log('[useDictation] Audio blob size:', audioBlob.size);
      
      if (audioBlob.size === 0) {
        throw new Error("No audio captured");
      }

      console.log('[useDictation] Starting transcription...');
      let rawText = await processTranscription(audioBlob, apiKey, model, language);
      console.log('[useDictation] Transcription result:', rawText);

      let finalText = rawText;

      // Transform mode: use transcription as instruction to transform selected text
      if (mode === 'transform' && selectedText && rawText) {
        console.log('[useDictation] Transform mode: applying transformation...');
        try {
          const effectiveLlmKey = llmApiKey || apiKey;
          const effectiveLlmModel = llmModel || 'llama-3.3-70b-versatile';
          
          const transformed = await transformSelectedText(
            selectedText,
            rawText, // The spoken instruction
            effectiveLlmKey,
            effectiveLlmModel
          );
          
          if (transformed && transformed.trim().length > 0) {
            finalText = transformed;
            console.log('[useDictation] Transformed text:', finalText);
          } else {
            throw new Error('Empty transformation result');
          }
        } catch (error) {
          console.error('[useDictation] Transform failed:', error);
          if (onError) {
            onError('Transform failed - please try again');
          }
          setStatus('error');
          console.log('[useDictation] Transform error, will reset to idle in 2s');
          setTimeout(() => {
            resetState();
            console.log('[useDictation] Status reset to idle after transform error');
          }, 2000);
          return; // Exit early, don't paste anything
        }
      } else if (llmEnabled && llmApiKey && rawText) {
        // Regular dictation mode with LLM post-processing
        console.log('[useDictation] Applying LLM post-processing...');
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
            console.log('[useDictation] Post-processed text:', finalText);
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
        console.log('[useDictation] Status set to success, will reset to idle in 1.5s');
        setTimeout(() => {
          resetState();
          console.log('[useDictation] Status reset to idle, isProcessingRef reset');
        }, 1500);
      } else {
        console.log('[useDictation] No text received, resetting to idle');
        resetState();
      }
    } catch (error) {
      console.error("[useDictation] Dictation failed", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (onError) {
        onError(errorMessage);
      }
      setStatus('error');
      console.log('[useDictation] Status set to error, will reset to idle in 2s');
      setTimeout(() => {
        resetState();
        console.log('[useDictation] Status reset to idle after error, isProcessingRef reset');
      }, 2000);
    }
  }, [isRecording, stopRecording, activeWindowInfo, mode, selectedText]);

  const cancelDictation = useCallback(() => {
    console.log('[useDictation] cancelDictation called, isRecording:', isRecording, 'status:', status);

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
    console.log('[useDictation] Status set to cancelled');

    // Play cancel sound for audio feedback
    playCancelSound();

    // Reset state after display duration (matches success/error timing)
    setTimeout(() => {
      setStatus('idle');
      setActiveWindowInfo(null);
      setMode('dictation');
      setSelectedText(null);
      isCancellingRef.current = false;
      console.log('[useDictation] Status reset to idle after cancellation');
    }, 1500);
  }, [isRecording, status, cancelRecording]);

  return {
    status,
    mode,
    mediaStream,
    startDictation,
    stopDictation,
    cancelDictation,
    activeWindowInfo,
  };
};
