import { describe, expect, it } from 'vitest';
import { MARBLE_RADIUS, distanceToObstacle } from '../../src/core/spawn';
import { COUNTRIES } from '../../src/data/countries';
import { raceTrack } from '../../src/levels/race-track';

const { bounds, obstacles, spinners, pen, finishY, worldHeight } = raceTrack;
const MARBLE = MARBLE_RADIUS * 2;

describe('race track', () => {
  it('has a pen big enough for every flag in rows of one marble height', () => {
    const rows = Math.floor((pen.bottom - pen.top) / 34);
    expect(rows * 20).toBeGreaterThanOrEqual(COUNTRIES.length);
  });

  it('keeps the pen clear of obstacles', () => {
    const edge = MARBLE_RADIUS + 1; // a marble stands next to the wall, not in it
    for (let x = bounds.left + edge; x <= bounds.right - edge; x += 20) {
      for (const y of [pen.top, pen.bottom]) {
        for (const o of obstacles) {
          expect(distanceToObstacle({ x, y }, o)).toBeGreaterThan(MARBLE_RADIUS);
        }
      }
    }
  });

  it('puts the finish line above the floor and inside the world', () => {
    expect(finishY).toBeGreaterThan(pen.bottom);
    expect(finishY + 100).toBeLessThan(worldHeight);
    // Only the floor, which catches the marbles after the finish, lies below the line.
    expect(obstacles.filter((o) => o.y > finishY)).toHaveLength(1);
  });

  it('keeps the bumpers and pegs a marble apart, so that nothing wedges', () => {
    const circles = obstacles.filter((o) => o.shape === 'circle');
    expect(circles.filter((o) => o.bumper).length).toBeGreaterThan(100);
    for (let i = 0; i < circles.length; i++) {
      for (let j = i + 1; j < circles.length; j++) {
        const a = circles[i]!;
        const b = circles[j]!;
        const gap = Math.hypot(a.x - b.x, a.y - b.y) - (a.w + b.w) / 2;
        expect(gap).toBeGreaterThan(MARBLE + 2);
      }
    }
  });

  it('keeps the windmills clear of the walls, the obstacles and each other', () => {
    expect(spinners.length).toBeGreaterThan(0);
    for (const s of spinners) {
      const reach = s.w / 2;
      expect(s.x - reach).toBeGreaterThan(bounds.left + MARBLE);
      expect(s.x + reach).toBeLessThan(bounds.right - MARBLE);
      for (const o of obstacles) {
        expect(distanceToObstacle({ x: s.x, y: s.y }, o)).toBeGreaterThan(reach + MARBLE);
      }
    }
    for (let i = 0; i < spinners.length; i++) {
      for (let j = i + 1; j < spinners.length; j++) {
        const a = spinners[i]!;
        const b = spinners[j]!;
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan((a.w + b.w) / 2 + MARBLE);
      }
    }
  });
});
