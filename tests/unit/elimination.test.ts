import { describe, expect, it } from 'vitest';
import { EliminationTracker } from '../../src/core/elimination';

describe('EliminationTracker with several survivors', () => {
  it('is decided once three are left and ranks them by finishing order', () => {
    const t = new EliminationTracker(['a', 'b', 'c', 'd', 'e'], 3);
    t.markFinished('c');
    t.markFinished('a');
    t.markFinished('b');
    expect(t.decided).toBe(false);
    t.eliminate('e');
    t.eliminate('d');
    expect(t.decided).toBe(true);
    expect(t.standings).toEqual(['c', 'a', 'b']);
    expect(t.placeOf('c')).toBe(1);
    expect(t.placeOf('b')).toBe(3);
    expect(t.placeOf('d')).toBe(4);
    expect(t.placeOf('e')).toBe(5);
  });
});

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
