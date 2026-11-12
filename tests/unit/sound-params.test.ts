import { describe, expect, it } from 'vitest';
import { VoiceLimiter, impactTone } from '../../src/core/sound-params';

describe('impactTone', () => {
  it('makes harder impacts higher, longer and louder', () => {
    const soft = impactTone(2, 0);
    const hard = impactTone(10, 0);
    expect(hard.freq).toBeGreaterThan(soft.freq);
    expect(hard.duration).toBeGreaterThan(soft.duration);
    expect(hard.gain).toBeGreaterThan(soft.gain);
  });

  it('caps the loudness and treats negative speeds as silence-level taps', () => {
    expect(impactTone(500, 0.5).gain).toBeLessThanOrEqual(0.1);
    expect(impactTone(500, 0.5)).toEqual(impactTone(12, 0.5));
    expect(impactTone(-3, 0)).toEqual(impactTone(0, 0));
  });

  it('varies the pitch with the random value', () => {
    expect(impactTone(5, 0.9).freq).toBeGreaterThan(impactTone(5, 0.1).freq);
  });
});

describe('VoiceLimiter', () => {
  it('refuses sounds that start too close together', () => {
    const limiter = new VoiceLimiter(0.05, 10);
    expect(limiter.tryStart(1)).toBe(true);
    expect(limiter.tryStart(1.01)).toBe(false);
    expect(limiter.tryStart(1.06)).toBe(true);
  });

  it('refuses sounds beyond the maximum number of voices until one ends', () => {
    const limiter = new VoiceLimiter(0, 2);
    expect(limiter.tryStart(1)).toBe(true);
    expect(limiter.tryStart(2)).toBe(true);
    expect(limiter.tryStart(3)).toBe(false);
    limiter.end();
    expect(limiter.tryStart(4)).toBe(true);
  });

  it('never goes below zero active voices', () => {
    const limiter = new VoiceLimiter(0, 1);
    limiter.end();
    limiter.end();
    expect(limiter.tryStart(1)).toBe(true);
    expect(limiter.tryStart(2)).toBe(false);
  });
});
