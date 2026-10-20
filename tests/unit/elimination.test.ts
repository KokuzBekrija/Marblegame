import { describe, expect, it } from 'vitest';
import { EliminationTracker } from '../../src/core/elimination';

describe('EliminationTracker', () => {
  it('declares a winner when one marble remains', () => {
    const t = new EliminationTracker(['cz', 'sk', 'de']);
    t.eliminate('sk');
    expect(t.winner).toBeNull();
    t.eliminate('de');
    expect(t.winner).toBe('cz');
    expect(t.eliminationOrder).toEqual(['sk', 'de']);
  });

  it('ranks the first marble out last and the winner first', () => {
    const t = new EliminationTracker(['cz', 'sk', 'de', 'pl']);
    t.eliminate('sk');
    t.eliminate('pl');
    expect(t.placeOf('sk')).toBe(4);
    expect(t.placeOf('pl')).toBe(3);
    expect(t.placeOf('cz')).toBeNull(); // still in play
    t.eliminate('de');
    expect(t.placeOf('de')).toBe(2);
    expect(t.placeOf('cz')).toBe(1);
  });

  it('ignores double elimination', () => {
    const t = new EliminationTracker(['cz', 'sk']);
    t.eliminate('sk');
    t.eliminate('sk');
    expect(t.eliminationOrder).toEqual(['sk']);
  });
});
