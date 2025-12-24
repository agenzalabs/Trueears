import { useState, useRef, useCallback } from 'react';

export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    console.log('[useAudioRecorder] startRecording called');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(stream);
      setIsRecording(true);
      audioChunksRef.current = [];
      console.log('[useAudioRecorder] MediaStream acquired, isRecording set to true');

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('[useAudioRecorder] Audio chunk received, size:', event.data.size);
        }
      };

      recorder.start();
      console.log('[useAudioRecorder] MediaRecorder started');
    } catch (err) {
      console.error("[useAudioRecorder] Microphone error:", err);
      throw err;
    }
  };

  const stopRecording = useCallback(async (): Promise<Blob> => {
    console.log('[useAudioRecorder] stopRecording called, isRecording:', isRecording, 'mediaRecorderRef:', !!mediaRecorderRef.current);

    if (!mediaRecorderRef.current) {
      console.warn('[useAudioRecorder] No media recorder found');
      return new Blob([]);
    }

    if (!isRecording) {
      console.warn('[useAudioRecorder] Not recording, but mediaRecorder exists');
      return new Blob([]);
    }

    const recorder = mediaRecorderRef.current;
    const stream = mediaStream;

    console.log('[useAudioRecorder] Stopping MediaRecorder...');
    return new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('[useAudioRecorder] MediaRecorder stopped, blob size:', audioBlob.size, 'chunks:', audioChunksRef.current.length);

        // Cleanup
        if (stream) {
          stream.getTracks().forEach(t => t.stop());
          console.log('[useAudioRecorder] MediaStream tracks stopped');
        }
        setMediaStream(null);
        setIsRecording(false);
        console.log('[useAudioRecorder] States reset, isRecording set to false');

        resolve(audioBlob);
      };
      recorder.stop();
    });
  }, [isRecording, mediaStream]);

  const cancelRecording = useCallback(() => {
    console.log('[useAudioRecorder] cancelRecording called, isRecording:', isRecording);

    // Stop MediaRecorder if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      console.log('[useAudioRecorder] MediaRecorder stopped');
    }
    mediaRecorderRef.current = null;

    // Stop all MediaStream tracks
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      console.log('[useAudioRecorder] MediaStream tracks stopped');
    }
    setMediaStream(null);

    // Clear audio chunks - discard all captured audio
    audioChunksRef.current = [];
    console.log('[useAudioRecorder] Audio chunks cleared');

    // Reset recording state
    setIsRecording(false);
    console.log('[useAudioRecorder] Recording cancelled, state reset');
  }, [mediaStream]);

  return {
    isRecording,
    mediaStream,
    startRecording,
    stopRecording,
    cancelRecording
  };
};
