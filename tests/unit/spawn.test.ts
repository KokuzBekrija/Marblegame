import { describe, expect, it } from 'vitest';
import { COUNTRIES } from '../../src/data/countries';
import { distanceToObstacle, ringSpawnPoints } from '../../src/core/spawn';
import { arenaRing } from '../../src/levels/arena-ring';

describe('spawn points', () => {
  it('fit every flag into the ring clear of the obstacles', () => {
    const points = ringSpawnPoints(COUNTRIES.length, arenaRing);
    expect(points).toHaveLength(COUNTRIES.length);
    for (const p of points) {
      for (const o of arenaRing.obstacles)
        expect(distanceToObstacle(p, o)).toBeGreaterThanOrEqual(18);
      expect(Math.hypot(p.x - arenaRing.center.x, p.y - arenaRing.center.y)).toBeLessThan(
        arenaRing.radius - 12 - 16,
      );
    }
  });

  it('measures the distance to a peg', () => {
    expect(distanceToObstacle({ x: 30, y: 0 }, { shape: 'circle', x: 0, y: 0, w: 20, h: 20 })).toBe(
      20,
    );
  });

  it('measures the distance to a rotated bar', () => {
    const bar = { x: 0, y: 0, w: 100, h: 10, angle: Math.PI / 2 }; // vertical bar
    expect(distanceToObstacle({ x: 20, y: 0 }, bar)).toBeCloseTo(15);
    expect(distanceToObstacle({ x: 0, y: 30 }, bar)).toBe(0);
  });
});
