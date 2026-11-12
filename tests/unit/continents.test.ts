import { describe, expect, it } from 'vitest';
import { ContinentTournament } from '../../src/core/continent-tournament';
import { CONTINENTS } from '../../src/data/continents';
import { COUNTRIES } from '../../src/data/countries';

describe('CONTINENTS', () => {
  it('puts every country on exactly one continent', () => {
    const all = CONTINENTS.flatMap((c) => c.members);
    expect(new Set(all).size).toBe(all.length);
    expect([...all].sort()).toEqual(COUNTRIES.map((c) => c.code).sort());
  });

  it('keeps every round small enough to race and big enough to pick three from', () => {
    expect(CONTINENTS).toHaveLength(6);
    for (const c of CONTINENTS) {
      expect(c.members.length).toBeGreaterThan(10);
      expect(c.members.length).toBeLessThan(60);
    }
  });
});

describe('ContinentTournament', () => {
  const groups = [
    { name: 'A', members: ['a1', 'a2', 'a3', 'a4'] },
    { name: 'B', members: ['b1', 'b2', 'b3', 'b4', 'b5'] },
  ];

  it('plays one round per group and takes the best three on to the finale', () => {
    const t = new ContinentTournament(groups, 3);
    expect(t.rounds).toBe(2);
    expect(t.label).toBe('A');
    expect(t.participants).toEqual(['a1', 'a2', 'a3', 'a4']);
    expect(t.advancing).toBe(3);
    t.recordResult(['a3', 'a1', 'a4']);
    expect(t.label).toBe('B');
    expect(t.participants).toEqual(['b1', 'b2', 'b3', 'b4', 'b5']);
    t.recordResult(['b5', 'b2', 'b1']);
    expect(t.isFinale).toBe(true);
    expect(t.participants).toEqual(['a3', 'a1', 'a4', 'b5', 'b2', 'b1']);
    expect(t.advancing).toBe(1);
    expect(t.qualifiersOf(0)).toEqual(['a3', 'a1', 'a4']);
    t.recordResult(['b2']);
    expect(t.champion).toBe('b2');
    expect(t.isComplete).toBe(true);
    expect(t.qualifiersOf(2)).toEqual(['b2']);
  });

  it('rejects results that do not fit the round', () => {
    const t = new ContinentTournament(groups, 3);
    expect(() => t.recordResult(['a1'])).toThrow();
    expect(() => t.recordResult(['a1', 'a2', 'b1'])).toThrow();
    expect(() => t.recordResult(['a1', 'a1', 'a2'])).toThrow();
  });

  it('lets fewer marbles advance from a group smaller than the quota', () => {
    const t = new ContinentTournament([{ name: 'S', members: ['s1', 's2'] }], 3);
    expect(t.advancing).toBe(2);
  });
});
