let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let muteState = false;

function getContext(): { ctx: AudioContext; gain: GainNode } | null {
  if (muteState) return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.15;
      masterGain.connect(audioCtx.destination);
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return { ctx: audioCtx, gain: masterGain! };
}

function playTone(freq: number, duration: number, type: OscillatorType = 'square', gain: number = 0.15): void {
  const ctx = getContext();
  if (!ctx) return;
  const osc = ctx.ctx.createOscillator();
  const env = ctx.ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  env.gain.setValueAtTime(gain, ctx.ctx.currentTime);
  env.gain.exponentialRampToValueAtTime(0.001, ctx.ctx.currentTime + duration);
  osc.connect(env);
  env.connect(ctx.gain);
  osc.start();
  osc.stop(ctx.ctx.currentTime + duration);
}

function playNoise(duration: number, gain: number = 0.05): void {
  const ctx = getContext();
  if (!ctx) return;
  const bufferSize = ctx.ctx.sampleRate * duration;
  const buffer = ctx.ctx.createBuffer(1, bufferSize, ctx.ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.ctx.createBufferSource();
  source.buffer = buffer;
  const env = ctx.ctx.createGain();
  env.gain.setValueAtTime(gain, ctx.ctx.currentTime);
  env.gain.exponentialRampToValueAtTime(0.001, ctx.ctx.currentTime + duration);
  source.connect(env);
  env.connect(ctx.gain);
  source.start();
}

export function setMuted(muted: boolean): void {
  muteState = muted;
  if (muted && audioCtx) {
    audioCtx.suspend();
  }
}

export function isMuted(): boolean {
  return muteState;
}

export function playTradeSound(type: 'Buy' | 'Sell'): void {
  if (type === 'Buy') {
    playTone(880, 0.08, 'sine', 0.12);
    setTimeout(() => playTone(1100, 0.1, 'sine', 0.08), 60);
  } else {
    playTone(440, 0.08, 'sine', 0.12);
    setTimeout(() => playTone(330, 0.12, 'sine', 0.1), 60);
  }
}

export function playCashSound(): void {
  playTone(1200, 0.06, 'sine', 0.1);
  setTimeout(() => playTone(1500, 0.08, 'sine', 0.08), 80);
  setTimeout(() => playTone(1800, 0.1, 'sine', 0.06), 160);
}

export function playNewsSound(): void {
  playTone(660, 0.1, 'triangle', 0.12);
  setTimeout(() => playTone(880, 0.15, 'triangle', 0.1), 100);
}

export function playCrashSound(): void {
  playTone(200, 0.3, 'sawtooth', 0.15);
  playNoise(0.3, 0.08);
}

export function playRallySound(): void {
  playTone(600, 0.08, 'sine', 0.12);
  setTimeout(() => playTone(800, 0.08, 'sine', 0.12), 80);
  setTimeout(() => playTone(1000, 0.08, 'sine', 0.12), 160);
  setTimeout(() => playTone(1200, 0.12, 'sine', 0.1), 240);
}

export function playUpgradeSound(): void {
  playTone(523, 0.12, 'sine', 0.12);
  setTimeout(() => playTone(659, 0.12, 'sine', 0.12), 120);
  setTimeout(() => playTone(784, 0.2, 'sine', 0.1), 240);
}

export function playErrorSound(): void {
  playTone(200, 0.15, 'square', 0.1);
  setTimeout(() => playTone(150, 0.2, 'square', 0.1), 100);
}

export function playPrestigeSound(): void {
  const notes = [523, 659, 784, 1047];
  notes.forEach((note, i) => {
    setTimeout(() => playTone(note, 0.2, 'sine', 0.15), i * 150);
  });
}
