import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  stream: MediaStream | null;
  isRecording: boolean;
  barColor?: string;
}

const BAR_COUNT = 48;
const SCROLL_INTERVAL_MS = 60; // push a new bar every 60ms

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ stream, isRecording, barColor }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  // Rolling buffer: each entry is an amplitude value (0-255)
  const scrollBufferRef = useRef<number[]>(new Array(BAR_COUNT).fill(0));
  const lastScrollTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!stream || !isRecording || !canvasRef.current) return;

    const effectiveBarColor = barColor || getComputedStyle(document.documentElement).getPropertyValue('--visualizer-bar').trim() || '#1f2937';

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();

    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.2;

    source.connect(analyser);

    analyserRef.current = analyser;
    const bufferLength = analyser.frequencyBinCount;
    dataArrayRef.current = new Uint8Array(bufferLength);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const barWidth = 3;
    const gap = 1;
    const logicalWidth = (BAR_COUNT * barWidth) + ((BAR_COUNT - 1) * gap) + 4;
    const logicalHeight = 30;

    canvas.width = logicalWidth * dpr;
    canvas.height = logicalHeight * dpr;
    ctx.scale(dpr, dpr);

    // Reset buffer on mount
    scrollBufferRef.current = new Array(BAR_COUNT).fill(0);
    lastScrollTimeRef.current = performance.now();

    const draw = (now: number) => {
      if (!isRecording) return;

      animationRef.current = requestAnimationFrame(draw);

      if (analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      }

      // Compute current RMS energy across voice-range bins (1-160)
      let sum = 0;
      const voiceStart = 1;
      const voiceEnd = 160;
      for (let i = voiceStart; i < voiceEnd; i++) {
        const v = dataArrayRef.current![i];
        sum += v * v;
      }
      const rms = Math.sqrt(sum / (voiceEnd - voiceStart));

      // Apply noise floor and expand dynamic range
      const noiseFloor = 12;
      let level = rms < noiseFloor ? 0 : (rms - noiseFloor) * 1.8;
      level = Math.min(255, level);

      // Push new sample into buffer at the scroll interval
      const elapsed = now - lastScrollTimeRef.current;
      if (elapsed >= SCROLL_INTERVAL_MS) {
        const steps = Math.floor(elapsed / SCROLL_INTERVAL_MS);
        const buf = scrollBufferRef.current;
        for (let s = 0; s < steps; s++) {
          // Shift left, new value enters from the right
          buf.shift();
          buf.push(level);
        }
        lastScrollTimeRef.current = now - (elapsed % SCROLL_INTERVAL_MS);
      }

      // Render
      ctx.clearRect(0, 0, logicalWidth, logicalHeight);

      const totalBarGroupWidth = (BAR_COUNT * barWidth) + ((BAR_COUNT - 1) * gap);
      const startX = (logicalWidth - totalBarGroupWidth) / 2;
      const buf = scrollBufferRef.current;

      for (let i = 0; i < BAR_COUNT; i++) {
        const percent = buf[i] / 255;

        const height = 2 + (Math.pow(percent, 0.85) * (logicalHeight - 4));

        const x = startX + i * (barWidth + gap);
        const y = (logicalHeight - height) / 2;

        const opacity = 0.4 + (percent * 0.6);

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = effectiveBarColor;
        ctx.fillRect(x, y, barWidth, height);
        ctx.restore();
      }
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationRef.current);
      source.disconnect();
      analyser.disconnect();
      if (audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, [stream, isRecording, barColor]);

  const displayWidth = (BAR_COUNT * 3) + ((BAR_COUNT - 1) * 1) + 4;

  return (
    <canvas
        ref={canvasRef}
        style={{ width: `${displayWidth}px`, height: '30px' }}
        className="opacity-100"
    />
  );
};
