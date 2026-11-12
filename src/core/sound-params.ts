/** Pure helpers for the synthesized sounds, so that they can be unit-tested without audio. */

export interface Tone {
  freq: number; // Hz
  duration: number; // s
  gain: number; // 0..1
}

const MAX_IMPACT = 12; // px/step; faster impacts sound the same as this one

/**
 * Tone of a marble hitting something: harder impacts are higher, longer and louder.
 * `random` in [0, 1) varies the pitch a little so that a crowd of marbles does not drone.
 */
export function impactTone(speed: number, random: number): Tone {
  const s = Math.min(Math.max(speed, 0), MAX_IMPACT);
  return {
    freq: 260 + s * 28 + random * 120,
    duration: 0.05 + s * 0.004,
    gain: Math.min(0.015 + s * 0.008, 0.1),
  };
}

/**
 * Limits how many short sounds play at once and how close together they start. With hundreds of
 * marbles colliding all the time, unlimited sounds would turn into noise and eat CPU.
 */
export class VoiceLimiter {
  private active = 0;
  private lastStart = -Infinity;

  constructor(
    private readonly minGap: number, // s between two starts
    private readonly maxVoices: number,
  ) {}

  /** True when a sound may start now (at audio time `now`); the caller must then call `end`. */
  tryStart(now: number): boolean {
    if (this.active >= this.maxVoices || now - this.lastStart < this.minGap) return false;
    this.active++;
    this.lastStart = now;
    return true;
  }

  end(): void {
    this.active = Math.max(0, this.active - 1);
  }
}
