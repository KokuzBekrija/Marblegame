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

  it('ignores double elimination', () => {
    const t = new EliminationTracker(['cz', 'sk']);
    t.eliminate('sk');
    t.eliminate('sk');
    expect(t.eliminationOrder).toEqual(['sk']);
  });
});
