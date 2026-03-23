import { useState, useRef, useCallback } from 'react';
import { encodeMonoWav, mergeFloat32Chunks } from '../utils/audioUtils';

type RecorderBackend = 'media-recorder' | 'wav';

type WavRecorderState = {
  audioContext: AudioContext;
  source: MediaStreamAudioSourceNode;
  processor: ScriptProcessorNode;
  gainNode: GainNode;
  chunks: Float32Array[];
  sampleRate: number;
};

const MEDIA_RECORDER_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/mp4',
];
const IS_LINUX = navigator.userAgent.toLowerCase().includes('linux');

export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaRecorderMimeTypeRef = useRef('audio/webm');
  const recorderBackendRef = useRef<RecorderBackend | null>(null);
  const wavRecorderRef = useRef<WavRecorderState | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const cleanupStream = useCallback((stream?: MediaStream | null) => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      console.log('[useAudioRecorder] MediaStream tracks stopped');
    }
  }, []);

  const cleanupWavRecorder = useCallback(async () => {
    const wavRecorder = wavRecorderRef.current;
    if (!wavRecorder) {
      return;
    }

    wavRecorder.processor.disconnect();
    wavRecorder.source.disconnect();
    wavRecorder.gainNode.disconnect();
    wavRecorder.processor.onaudioprocess = null;
    await wavRecorder.audioContext.close().catch(() => {
      // ignore close errors during cleanup
    });
    wavRecorderRef.current = null;
  }, []);

  const startWavRecorder = useCallback(async (stream: MediaStream) => {
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) {
      throw new Error('AudioContext is not available in this WebView');
    }

    const audioContext = new AudioContextCtor();
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0;

    const chunks: Float32Array[] = [];
    processor.onaudioprocess = (event) => {
      const channelData = event.inputBuffer.getChannelData(0);
      chunks.push(new Float32Array(channelData));
    };

    source.connect(processor);
    processor.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    wavRecorderRef.current = {
      audioContext,
      source,
      processor,
      gainNode,
      chunks,
      sampleRate: audioContext.sampleRate,
    };
    recorderBackendRef.current = 'wav';
    console.log('[useAudioRecorder] WAV fallback recorder started');
  }, []);

  const startMediaRecorder = useCallback((stream: MediaStream): boolean => {
    if (typeof MediaRecorder === 'undefined') {
      return false;
    }

    const supportedMimeType = MEDIA_RECORDER_MIME_CANDIDATES.find((candidate) => {
      return typeof MediaRecorder.isTypeSupported === 'function'
        ? MediaRecorder.isTypeSupported(candidate)
        : false;
    });

    const recorderOptions = supportedMimeType ? { mimeType: supportedMimeType } : undefined;

    try {
      const recorder = recorderOptions
        ? new MediaRecorder(stream, recorderOptions)
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      mediaRecorderMimeTypeRef.current = recorder.mimeType || supportedMimeType || 'audio/webm';
      recorderBackendRef.current = 'media-recorder';

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('[useAudioRecorder] Audio chunk received, size:', event.data.size);
        }
      };

      recorder.start();
      console.log('[useAudioRecorder] MediaRecorder started with mimeType:', mediaRecorderMimeTypeRef.current);
      return true;
    } catch (error) {
      mediaRecorderRef.current = null;
      recorderBackendRef.current = null;
      console.warn('[useAudioRecorder] MediaRecorder unavailable, falling back to WAV recorder:', error);
      return false;
    }
  }, []);

  const startRecording = async (deviceId?: string) => {
    console.log('[useAudioRecorder] startRecording called');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone API not available in this environment');
      }

      // Quick permission signal: labels are only present after mic permission is granted.
      // (Used by onboarding StepPermissions as well.)
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(d => d.kind === 'audioinput');
        const labelsPresent = audioInputs.some(d => (d.label || '').trim().length > 0);
        console.log('[useAudioRecorder] Audio inputs:', audioInputs.length, 'labelsPresent:', labelsPresent);
      } catch (e) {
        console.warn('[useAudioRecorder] Failed to enumerate devices:', e);
      }

      const MIC_REQUEST_TIMEOUT_MS = 10_000;
      const constraints: MediaStreamConstraints = {
        audio: deviceId && deviceId !== 'default'
          ? { deviceId: { exact: deviceId } }
          : true
      };
      const streamPromise = navigator.mediaDevices.getUserMedia(constraints);

      const result = await Promise.race([
        streamPromise.then((stream) => ({ kind: 'stream' as const, stream })),
        new Promise<{ kind: 'timeout' }>((resolve) =>
          setTimeout(() => resolve({ kind: 'timeout' }), MIC_REQUEST_TIMEOUT_MS)
        ),
      ]);

      if (result.kind === 'timeout') {
        // Best-effort cleanup if the request resolves later.
        streamPromise
          .then((stream) => stream.getTracks().forEach((t) => t.stop()))
          .catch(() => {
            // ignore
          });
        throw new Error(
          'Microphone permission request timed out. Open Settings and allow microphone access, then try again.'
        );
      }

      const stream = result.stream;
      setMediaStream(stream);
      setIsRecording(true);
      audioChunksRef.current = [];
      mediaRecorderRef.current = null;
      recorderBackendRef.current = null;
      console.log('[useAudioRecorder] MediaStream acquired, isRecording set to true');

      if (IS_LINUX) {
        // WebKit on Linux frequently lacks the GStreamer encoder stack required by
        // MediaRecorder. Prefer PCM/WAV capture here so Linux does not depend on
        // distro-specific media plugins.
        await startWavRecorder(stream);
        return;
      }

      if (startMediaRecorder(stream)) {
        return;
      }

      await startWavRecorder(stream);
    } catch (err) {
      console.error("[useAudioRecorder] Microphone error:", err);
      throw err;
    }
  };

  const stopRecording = useCallback(async (): Promise<Blob> => {
    console.log('[useAudioRecorder] stopRecording called, isRecording:', isRecording, 'backend:', recorderBackendRef.current);

    if (!isRecording) {
      console.warn('[useAudioRecorder] Not recording');
      return new Blob([]);
    }

    const stream = mediaStream;

    if (recorderBackendRef.current === 'media-recorder' && mediaRecorderRef.current) {
      const recorder = mediaRecorderRef.current;
      console.log('[useAudioRecorder] Stopping MediaRecorder...');

      return new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderMimeTypeRef.current });
          console.log('[useAudioRecorder] MediaRecorder stopped, blob size:', audioBlob.size, 'chunks:', audioChunksRef.current.length);

          mediaRecorderRef.current = null;
          recorderBackendRef.current = null;
          cleanupStream(stream);
          setMediaStream(null);
          setIsRecording(false);
          console.log('[useAudioRecorder] States reset, isRecording set to false');

          resolve(audioBlob);
        };
        recorder.stop();
      });
    }

    if (recorderBackendRef.current === 'wav' && wavRecorderRef.current) {
      console.log('[useAudioRecorder] Stopping WAV fallback recorder...');
      const wavRecorder = wavRecorderRef.current;
      const samples = mergeFloat32Chunks(wavRecorder.chunks);
      const audioBlob = encodeMonoWav(samples, wavRecorder.sampleRate);

      await cleanupWavRecorder();
      recorderBackendRef.current = null;
      cleanupStream(stream);
      setMediaStream(null);
      setIsRecording(false);
      console.log('[useAudioRecorder] WAV fallback recorder stopped, blob size:', audioBlob.size);

      return audioBlob;
    }

    console.warn('[useAudioRecorder] No recorder backend found');
    return new Blob([]);
  }, [cleanupStream, cleanupWavRecorder, isRecording, mediaStream]);

  const cancelRecording = useCallback(() => {
    console.log('[useAudioRecorder] cancelRecording called, isRecording:', isRecording, 'backend:', recorderBackendRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      console.log('[useAudioRecorder] MediaRecorder stopped');
    }
    mediaRecorderRef.current = null;
    recorderBackendRef.current = null;

    void cleanupWavRecorder();

    cleanupStream(mediaStream);
    setMediaStream(null);

    audioChunksRef.current = [];
    console.log('[useAudioRecorder] Audio chunks cleared');

    setIsRecording(false);
    console.log('[useAudioRecorder] Recording cancelled, state reset');
  }, [cleanupStream, cleanupWavRecorder, isRecording, mediaStream]);

  return {
    isRecording,
    mediaStream,
    startRecording,
    stopRecording,
    cancelRecording
  };
};
