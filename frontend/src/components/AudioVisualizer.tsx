import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  stream: MediaStream | null;
  isRecording: boolean;
  barColor?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ stream, isRecording, barColor }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const visualStateRef = useRef<number[]>(new Array(12).fill(0));

  useEffect(() => {
    if (!stream || !isRecording || !canvasRef.current) return;
    
    // Get bar color from CSS variable if not provided
    const effectiveBarColor = barColor || getComputedStyle(document.documentElement).getPropertyValue('--visualizer-bar').trim() || '#1f2937';

    // Use the browser's native audio context (usually 44.1kHz or 48kHz) for visualization
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    
    // Use 512 to get ~256 frequency bins.
    analyser.fftSize = 512;
    
    // CRITICAL CHANGE: Reduced smoothing from 0.5 to 0.1 for instant, raw reaction
    analyser.smoothingTimeConstant = 0.1; 
    
    source.connect(analyser);
    
    analyserRef.current = analyser;
    const bufferLength = analyser.frequencyBinCount;
    dataArrayRef.current = new Uint8Array(bufferLength);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const logicalWidth = 104;
    const logicalHeight = 24;
    
    canvas.width = logicalWidth * dpr;
    canvas.height = logicalHeight * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      if (!isRecording) return;
      
      animationRef.current = requestAnimationFrame(draw);
      
      if (analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      }

      ctx.clearRect(0, 0, logicalWidth, logicalHeight);

      const bars = 12;
      const gap = 4; 
      const barWidth = 5;
      const totalBarGroupWidth = (bars * barWidth) + ((bars - 1) * gap);
      const startX = (logicalWidth - totalBarGroupWidth) / 2;
      
      // CRITICAL CHANGE: Increased lerp factor from 0.3 to 0.85
      // This makes the visual bars jump almost instantly to the target value, removing the "sluggish" feel.
      const lerpFactor = 0.85; 

      // Helper to average energy in a frequency range (indices)
      const getAverage = (start: number, end: number) => {
          let sum = 0;
          const count = end - start;
          if (count <= 0) return 0;
          for (let i = start; i < end; i++) {
              sum += dataArrayRef.current![i];
          }
          return sum / count;
      };

      // Define frequency ranges roughly optimized for human voice (12 bands)
      const ranges = [
          { s: 1, e: 3 },   // Sub-bass
          { s: 3, e: 5 },   // Bass
          { s: 5, e: 8 },   // Low-mid
          { s: 8, e: 12 },  // Mid-bass
          { s: 12, e: 18 }, // Low-mids
          { s: 18, e: 26 }, // Mids
          { s: 26, e: 36 }, // High-mids
          { s: 36, e: 50 }, // Presence
          { s: 50, e: 70 }, // Brilliance
          { s: 70, e: 95 }, // Highs
          { s: 95, e: 125 },// Air
          { s: 125, e: 160 }// Top
      ];

      for (let i = 0; i < bars; i++) {
          const range = ranges[i];
          // Get raw average (0-255)
          let rawValue = getAverage(range.s, range.e);

          // Boost sensitivity: multiply lower values to make them visible
          // and subtract a noise floor so silence is truly silence.
          const noiseFloor = 20;
          if (rawValue < noiseFloor) rawValue = 0;
          else {
              rawValue = (rawValue - noiseFloor) * 1.5; // Expand dynamic range
          }

          // Clamp to 255
          rawValue = Math.min(255, rawValue);

          const targetValue = rawValue;
          
          // Smooth transition
          const currentValue = visualStateRef.current[i];
          const newValue = currentValue + (targetValue - currentValue) * lerpFactor;
          visualStateRef.current[i] = newValue;

          const percent = newValue / 255;
          
          // Min height 4px (pill shape when idle), Max height logicalHeight
          // Non-linear height response makes quiet sounds visible but loud ones distinct
          const height = 4 + (Math.pow(percent, 0.8) * (logicalHeight - 4));
          
          const x = startX + i * (barWidth + gap);
          const y = (logicalHeight - height) / 2;

          // Opacity also scales with volume for a "glowing" effect
          const opacity = 0.5 + (percent * 0.5);
          
          ctx.save();
          ctx.globalAlpha = opacity;
          ctx.fillStyle = effectiveBarColor;
          
          ctx.beginPath();
          if (ctx.roundRect) {
              ctx.roundRect(x, y, barWidth, height, 10); // Full rounded caps
          } else {
              ctx.rect(x, y, barWidth, height); 
          }
          ctx.fill();
          ctx.restore();
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
      source.disconnect();
      analyser.disconnect();
      if (audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, [stream, isRecording, barColor]);

  return (
    <canvas 
        ref={canvasRef} 
        style={{ width: '80px', height: '24px' }}
        className="opacity-100"
    />
  );
};