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
