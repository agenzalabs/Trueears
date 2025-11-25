import { useState, useCallback, useRef } from 'react';
import { useAudioRecorder } from './useAudioRecorder';
import { processTranscription, postProcessTranscription, finalizeDictation } from '../controllers/dictationController';
import { Provider } from './useSettings';
import { ActiveWindowInfo } from '../types/appProfile';

export type DictationStatus = 'idle' | 'recording' | 'processing' | 'success' | 'error';

export const useDictation = () => {
  const [status, setStatus] = useState<DictationStatus>('idle');
  const { isRecording, mediaStream, startRecording, stopRecording } = useAudioRecorder();
  const isProcessingRef = useRef(false);
  const [activeWindowInfo, setActiveWindowInfo] = useState<ActiveWindowInfo | null>(null);

  const startDictation = async (windowInfo?: ActiveWindowInfo | null) => {
    console.log('[useDictation] startDictation called with window info:', windowInfo);
    try {
      if (windowInfo) {
        setActiveWindowInfo(windowInfo);
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
    provider: Provider,
    apiKey: string,
    model: string,
    onError?: (msg: string) => void,
    llmEnabled?: boolean,
    llmApiKey?: string,
    llmModel?: string,
    defaultPrompt?: string
  ) => {
    console.log('[useDictation] stopDictation called with llmEnabled:', llmEnabled);
    
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

    try {
      const audioBlob = await stopRecording();
      console.log('[useDictation] Audio blob size:', audioBlob.size);
      
      if (audioBlob.size === 0) {
        throw new Error("No audio captured");
      }

      console.log('[useDictation] Starting transcription...');
      let rawText = await processTranscription(audioBlob, provider, apiKey, model);
      console.log('[useDictation] Transcription result:', rawText);

      let finalText = rawText;

      // Apply LLM post-processing if enabled
      if (llmEnabled && llmApiKey && rawText) {
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
          setStatus('idle');
          isProcessingRef.current = false;
          setActiveWindowInfo(null);
          console.log('[useDictation] Status reset to idle, isProcessingRef reset');
        }, 1500);
      } else {
        console.log('[useDictation] No text received, resetting to idle');
        setStatus('idle');
        isProcessingRef.current = false;
        setActiveWindowInfo(null);
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
        setStatus('idle');
        isProcessingRef.current = false;
        setActiveWindowInfo(null);
        console.log('[useDictation] Status reset to idle after error, isProcessingRef reset');
      }, 2000);
    }
  }, [isRecording, stopRecording, activeWindowInfo]);

  return {
    status,
    mediaStream,
    startDictation,
    stopDictation,
    activeWindowInfo,
  };
};
