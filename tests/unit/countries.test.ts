import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COUNTRIES } from '../../src/data/countries';

describe('COUNTRIES', () => {
  it('lists all 193 UN members plus the two observer states', () => {
    expect(COUNTRIES).toHaveLength(195);
  });

  it('has unique lowercase ISO codes and non-empty names', () => {
    expect(new Set(COUNTRIES.map((c) => c.code)).size).toBe(COUNTRIES.length);
    for (const c of COUNTRIES) {
      expect(c.code).toMatch(/^[a-z]{2}$/);
      expect(c.name.length).toBeGreaterThan(0);
    }
  });

  it('has a flag SVG for every country', () => {
    for (const c of COUNTRIES) {
      expect(existsSync(`public/flags/${c.code}.svg`), c.code).toBe(true);
    }
  });
});
