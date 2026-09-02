/**
 * Tactile click feedback for Ideum touch-table interactions.
 * Installed globally on the Ideum machine so every button/touch target gets audio.
 */

let audioCtx = null;
let lastPlayedAt = 0;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/** Clear, short UI click — noise transient + tonal tick. */
export function playIdeumClick() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const sampleRate = ctx.sampleRate;
  const durationSec = 0.045;
  const bufferSize = Math.max(1, Math.floor(sampleRate * durationSec));
  const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.12));
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 1200;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.35, now + 0.002);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
  noise.connect(highpass);
  highpass.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(now);
  noise.stop(now + durationSec + 0.01);

  const osc = ctx.createOscillator();
  const tickGain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(2200, now);
  osc.frequency.exponentialRampToValueAtTime(900, now + 0.022);
  tickGain.gain.setValueAtTime(0.0001, now);
  tickGain.gain.exponentialRampToValueAtTime(0.14, now + 0.0015);
  tickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
  osc.connect(tickGain);
  tickGain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.04);
}

/** @deprecated Use playIdeumClick — kept for existing imports. */
export const playIdeumPrefClick = playIdeumClick;

const INTERACTIVE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  '[role="button"]:not([aria-disabled="true"])',
  '[role="tab"]:not([aria-disabled="true"])',
  '.ideum-component-btn:not([disabled])',
  '.canvas-ideum-touch',
].join(', ');

function findClickSoundTarget(node) {
  if (!(node instanceof Element)) return null;
  if (node.closest('[data-no-ideum-click]')) return null;
  const el = node.closest(INTERACTIVE_SELECTOR);
  if (!el) return null;
  if (el.matches('input, textarea, select, label')) return null;
  if (el.closest('button[disabled], [aria-disabled="true"]')) return null;
  return el;
}

function handlePointerDown(event) {
  if (event.button !== undefined && event.button !== 0) return;
  if (!findClickSoundTarget(event.target)) return;

  const ts = Date.now();
  if (ts - lastPlayedAt < 45) return;
  lastPlayedAt = ts;
  playIdeumClick();
}

/**
 * Global capture listener — one install covers nav cards, configurator, toolbar, etc.
 * @returns {() => void} cleanup
 */
export function installIdeumClickSound() {
  if (typeof document === 'undefined') return () => {};

  document.addEventListener('pointerdown', handlePointerDown, true);
  return () => {
    document.removeEventListener('pointerdown', handlePointerDown, true);
  };
}
