import Phaser from 'phaser';
import { VoiceLimiter, impactTone } from '../core/sound-params';

const MUTE_KEY = 'flagmarbles.muted';

type ToneOptions = { type?: OscillatorType; slideTo?: number; delay?: number; end?: () => void };

/** Applies the mute choice saved in the browser, if any. */
export function applyStoredMute(scene: Phaser.Scene): void {
  try {
    scene.sound.mute = localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    // Storage can be blocked (private window); sound simply starts on.
  }
}

/** Switches the whole game's sound on or off and remembers the choice. */
export function toggleMute(scene: Phaser.Scene): void {
  const muted = !scene.sound.mute;
  scene.sound.mute = muted;
  try {
    // Saves the value just set, not what the manager's getter returns: it can lag behind.
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // ignore, see applyStoredMute
  }
}

export function soundLabel(scene: Phaser.Scene): string {
  return `Sound: ${scene.sound.mute ? 'off' : 'on'} (M)`;
}

/**
 * Sound effects synthesized with WebAudio, so the game needs no audio files. They go through
 * Phaser's sound manager, which handles the browser's autoplay lock and the mute switch.
 */
export class Sfx {
  private readonly ctx: AudioContext | null = null;
  private readonly out: AudioNode | null = null;
  private readonly hits = new VoiceLimiter(0.035, 10);
  private readonly outs = new VoiceLimiter(0.05, 6); // eliminations that come in a rush

  constructor(scene: Phaser.Scene) {
    const manager = scene.sound;
    if (manager instanceof Phaser.Sound.WebAudioSoundManager) {
      this.ctx = manager.context;
      this.out = manager.destination;
    }
  }

  /** A marble hits a wall (`clank`: a moving one, like a spinner) or another marble. */
  hit(speed: number, kind: 'tick' | 'clank' = 'tick'): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || speed < 1.2) return;
    if (!this.hits.tryStart(ctx.currentTime)) return;
    const { freq, duration, gain } = impactTone(speed, Math.random());
    const clank = kind === 'clank';
    this.tone(clank ? freq * 0.55 : freq, duration * (clank ? 1.8 : 1), gain * (clank ? 1.3 : 1), {
      type: clank ? 'square' : 'triangle',
      end: () => this.hits.end(),
    });
  }

  /** A marble hits a bumper: a short rising boing. */
  bumper(): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || !this.hits.tryStart(ctx.currentTime)) return;
    this.tone(300, 0.13, 0.07, { slideTo: 640, end: () => this.hits.end() });
  }

  /** A marble is out: a short falling blop. */
  eliminated(): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || !this.outs.tryStart(ctx.currentTime)) return;
    this.tone(520, 0.22, 0.12, { slideTo: 150, end: () => this.outs.end() });
  }

  /** A marble fell into a green hole and goes round again: three rising notes. */
  recycled(): void {
    [523, 659, 880].forEach((f, i) =>
      this.tone(f, 0.12, 0.09, { type: 'triangle', delay: i * 0.06 }),
    );
  }

  /** A round is won: a short rising fanfare. */
  roundWon(): void {
    [523, 659, 784, 1047].forEach((f, i) =>
      this.tone(f, 0.28, 0.14, { type: 'triangle', delay: i * 0.11 }),
    );
  }

  /** The tournament is won: a longer fanfare that ends on a chord. */
  champion(): void {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) =>
      this.tone(f, 0.3, 0.14, { type: 'triangle', delay: i * 0.13 }),
    );
    [523, 659, 784, 1047].forEach((f) => this.tone(f, 1.2, 0.07, { type: 'sine', delay: 0.85 }));
  }

  click(): void {
    this.tone(880, 0.07, 0.1, { type: 'triangle' });
  }

  private tone(freq: number, duration: number, gain: number, opts: ToneOptions = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.out || ctx.state !== 'running') {
      opts.end?.();
      return;
    }
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t0 + duration);
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.006);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(amp).connect(this.out);
    osc.onended = () => {
      amp.disconnect();
      opts.end?.();
    };
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }
}
