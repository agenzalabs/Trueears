import { useState, useCallback, useRef } from 'react';
import { useAudioRecorder } from './useAudioRecorder';
import { processTranscription, finalizeDictation } from '../controllers/dictationController';
import { Provider } from './useSettings';

export type DictationStatus = 'idle' | 'recording' | 'processing' | 'success' | 'error';

export const useDictation = () => {
  const [status, setStatus] = useState<DictationStatus>('idle');
  const { isRecording, mediaStream, startRecording, stopRecording } = useAudioRecorder();
  const isProcessingRef = useRef(false);

  const startDictation = async () => {
    console.log('[useDictation] startDictation called');
    try {
      await startRecording();
      setStatus('recording');
      console.log('[useDictation] Status set to recording');
    } catch (error) {
      console.error('[useDictation] Failed to start recording:', error);
      setStatus('error');
      throw error;
    }
  };

  const stopDictation = useCallback(async (provider: Provider, apiKey: string, model: string, onError?: (msg: string) => void) => {
    console.log('[useDictation] stopDictation called, isRecording:', isRecording, 'isProcessingRef:', isProcessingRef.current);
    
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
      const text = await processTranscription(audioBlob, provider, apiKey, model);
      console.log('[useDictation] Transcription result:', text);

      if (text) {
        await finalizeDictation(text);
        setStatus('success');
        console.log('[useDictation] Status set to success, will reset to idle in 1.5s');
        setTimeout(() => {
          setStatus('idle');
          isProcessingRef.current = false;
          console.log('[useDictation] Status reset to idle, isProcessingRef reset');
        }, 1500);
      } else {
        console.log('[useDictation] No text received, resetting to idle');
        setStatus('idle');
        isProcessingRef.current = false;
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
        console.log('[useDictation] Status reset to idle after error, isProcessingRef reset');
      }, 2000);
    }
  }, [isRecording, stopRecording]);

  return {
    status,
    mediaStream,
    startDictation,
    stopDictation
  };
};
