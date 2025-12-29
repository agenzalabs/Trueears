export const playSuccessSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // A clean sine wave at 880Hz (High A) creates a bell-like tone
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);

    // ADSR Envelope: Fast attack, slow exponential decay
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.02); // Attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0); // Decay

    oscillator.start();
    oscillator.stop(ctx.currentTime + 1.0);
  } catch (error) {
    // Ignore audio errors
  }
};

export const playCancelSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Triangle wave at 440Hz (A4) for softer, less celebratory tone
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(440, ctx.currentTime);

    // Short duration (0.3s) for quick acknowledgment
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.02); // Attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3); // Quick decay

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.3);
  } catch (error) {
    // Ignore audio errors
  }
};

/**
 * Play a distinct "log saved" sound - a pleasant two-tone chime
 * that suggests "written down" or "noted".
 * Uses ascending notes (C5 -> E5) for a positive, distinct feel.
 */
export const playLogSavedSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();

    // First note: C5 (523Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523, ctx.currentTime);
    gain1.gain.setValueAtTime(0, ctx.currentTime);
    gain1.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.25);

    // Second note: E5 (659Hz) - starts slightly after first
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659, ctx.currentTime + 0.12);
    gain2.gain.setValueAtTime(0, ctx.currentTime + 0.12);
    gain2.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.5);
  } catch (error) {
    // Ignore audio errors
  }
};
