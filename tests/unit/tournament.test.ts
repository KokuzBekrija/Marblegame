import { describe, expect, it } from 'vitest';
import { Tournament } from '../../src/core/tournament';

const pool = Array.from({ length: 50 }, (_, i) => `f${i}`);

describe('Tournament', () => {
  it('shrinks the field by one each round, excluding earlier winners', () => {
    const t = new Tournament(pool);
    expect(t.round).toBe(1);
    expect(t.participants).toHaveLength(50);
    t.recordWinner('f7');
    expect(t.round).toBe(2);
    expect(t.participants).toHaveLength(49);
    expect(t.participants).not.toContain('f7');
  });

  it('runs the finale with only the five round winners', () => {
    const t = new Tournament(pool);
    for (const w of ['f1', 'f2', 'f3', 'f4', 'f5']) t.recordWinner(w);
    expect(t.isFinale).toBe(true);
    expect(t.participants).toEqual(['f1', 'f2', 'f3', 'f4', 'f5']);
    expect(t.isComplete).toBe(false);
    t.recordWinner('f3');
    expect(t.champion).toBe('f3');
    expect(t.isComplete).toBe(true);
  });

  it('has 46 participants in round 5', () => {
    const t = new Tournament(pool);
    for (const w of ['f1', 'f2', 'f3', 'f4']) t.recordWinner(w);
    expect(t.round).toBe(5);
    expect(t.participants).toHaveLength(46);
  });

  it('rejects winners outside the round and results after completion', () => {
    const t = new Tournament(pool);
    t.recordWinner('f1');
    expect(() => t.recordWinner('f1')).toThrow();
    expect(() => t.recordWinner('nope')).toThrow();
    for (const w of ['f2', 'f3', 'f4', 'f5', 'f2']) t.recordWinner(w);
    expect(() => t.recordWinner('f2')).toThrow();
  });
});
