import { describe, expect, it } from 'vitest';
import { MARBLE_RADIUS, distanceToObstacle } from '../../src/core/spawn';
import { pathLength } from '../../src/core/path';
import { dropField } from '../../src/levels/drop-field';

const { holes, tube, bounds, obstacles } = dropField;

describe('drop field', () => {
  it('has red holes that eliminate and green holes that recycle', () => {
    expect(holes.filter((h) => h.kind === 'red').length).toBeGreaterThan(0);
    expect(holes.filter((h) => h.kind === 'green').length).toBeGreaterThan(0);
  });

  it('keeps every hole wide enough for a marble and inside the arena', () => {
    for (const h of holes) {
      expect(h.width).toBeGreaterThan(MARBLE_RADIUS * 2);
      expect(h.x - h.width / 2).toBeGreaterThan(bounds.left);
      expect(h.x + h.width / 2).toBeLessThan(bounds.right);
    }
  });

  it('leaves the gap of every hole free of obstacles', () => {
    for (const h of holes) {
      for (const dx of [-h.width / 2 + MARBLE_RADIUS, 0, h.width / 2 - MARBLE_RADIUS]) {
        for (const o of obstacles) {
          expect(distanceToObstacle({ x: h.x + dx, y: dropField.floorY + 4 }, o)).toBeGreaterThan(
            MARBLE_RADIUS - 1,
          );
        }
      }
    }
  });

  it('lets a marble fall out of the rail anywhere in the release range, clear of walls and ceiling', () => {
    expect(tube.releaseMinX).toBeGreaterThan(bounds.left);
    expect(tube.releaseMaxX).toBeLessThan(bounds.right);
    for (let x = tube.releaseMinX; x <= tube.releaseMaxX; x += 10) {
      for (const o of obstacles) {
        expect(distanceToObstacle({ x, y: tube.topY }, o)).toBeGreaterThan(MARBLE_RADIUS);
      }
    }
  });

  it('releases the marbles at the center of the arena, so that where a marble was released does not decide its hole', () => {
    // Falling straight down, a marble ends up in the hole under it: releasing across the width
    // made the exit predictable (marbles released at the end left through the last hole).
    const center = (bounds.left + bounds.right) / 2;
    expect((tube.releaseMinX + tube.releaseMaxX) / 2).toBeCloseTo(center, 0);
    expect(tube.releaseMaxX - tube.releaseMinX).toBeLessThan((bounds.right - bounds.left) * 0.2);
  });

  it('has bumpers that spread the marbles sideways above the floor', () => {
    const bumpers = obstacles.filter((o) => o.bumper);
    expect(bumpers.length).toBeGreaterThan(20);
    for (const b of bumpers) expect(b.shape).toBe('circle');
  });

  it('keeps the spinners clear of the walls, the floor, the obstacles and each other', () => {
    const { spinners, floorY } = dropField;
    expect(spinners.length).toBeGreaterThan(0);
    for (const s of spinners) {
      const reach = s.w / 2;
      expect(s.x - reach).toBeGreaterThan(bounds.left + MARBLE_RADIUS * 2);
      expect(s.x + reach).toBeLessThan(bounds.right - MARBLE_RADIUS * 2);
      expect(s.y + reach).toBeLessThan(floorY - 48);
      for (const o of obstacles) {
        // Room for a marble to slip between the tip of an arm and the obstacle.
        expect(distanceToObstacle({ x: s.x, y: s.y }, o)).toBeGreaterThan(
          reach + MARBLE_RADIUS * 2,
        );
      }
    }
    for (let i = 0; i < spinners.length; i++) {
      for (let j = i + 1; j < spinners.length; j++) {
        const a = spinners[i]!;
        const b = spinners[j]!;
        // A marble must be able to pass between the swept circles of two spinners.
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(
          (a.w + b.w) / 2 + MARBLE_RADIUS * 2,
        );
      }
    }
  });

  it('fits a marble in the tube, with room for the queue to ride up', () => {
    expect(tube.width).toBeGreaterThan(MARBLE_RADIUS * 2);
    expect(
      pathLength([
        { x: tube.x, y: tube.bottomY },
        { x: tube.x, y: tube.topY },
      ]),
    ).toBeGreaterThan(300);
  });
});
