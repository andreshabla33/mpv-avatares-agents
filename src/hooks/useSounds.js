import { useRef, useCallback } from 'react';

// Genera sonidos retro 8-bit con Web Audio API — sin archivos externos
let audioCtx = null;
function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, duration, type = 'square', volume = 0.08) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

// Sound effects
const sounds = {
  responding: () => {
    playTone(523, 0.08, 'square', 0.06);
    setTimeout(() => playTone(659, 0.08, 'square', 0.06), 80);
  },
  scheduling: () => {
    playTone(440, 0.1, 'triangle', 0.07);
    setTimeout(() => playTone(554, 0.1, 'triangle', 0.07), 100);
    setTimeout(() => playTone(659, 0.12, 'triangle', 0.07), 200);
  },
  overloaded: () => {
    playTone(220, 0.15, 'sawtooth', 0.05);
    setTimeout(() => playTone(196, 0.15, 'sawtooth', 0.05), 150);
  },
  working: () => {
    playTone(440, 0.06, 'square', 0.04);
  },
  idle: () => {
    playTone(330, 0.12, 'sine', 0.03);
  },
};

export function useSounds() {
  const enabledRef = useRef(true);
  const lastPlayRef = useRef({});

  const playSound = useCallback((status) => {
    if (!enabledRef.current) return;
    // Throttle: don't play same sound more than once per 3 seconds
    const now = Date.now();
    if (lastPlayRef.current[status] && now - lastPlayRef.current[status] < 3000) return;
    lastPlayRef.current[status] = now;

    const fn = sounds[status] || sounds.working;
    fn();
  }, []);

  const toggleSounds = useCallback(() => {
    enabledRef.current = !enabledRef.current;
    return enabledRef.current;
  }, []);

  return { playSound, toggleSounds, isEnabled: () => enabledRef.current };
}
