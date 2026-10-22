import { describe, expect, it } from 'vitest';
import { nearestHole, pathLength, pointAt } from '../../src/core/path';

const path = [
  { x: 0, y: 100 },
  { x: 0, y: 0 },
  { x: -50, y: 0 },
];

describe('path', () => {
  it('measures the length of a polyline', () => {
    expect(pathLength(path)).toBe(150);
    expect(pathLength([{ x: 3, y: 3 }])).toBe(0);
  });

  it('finds the position along the path, also across corners', () => {
    expect(pointAt(path, 0)).toEqual({ x: 0, y: 100 });
    expect(pointAt(path, 40)).toEqual({ x: 0, y: 60 });
    expect(pointAt(path, 125)).toEqual({ x: -25, y: 0 });
  });

  it('clamps to the start and the end', () => {
    expect(pointAt(path, -10)).toEqual({ x: 0, y: 100 });
    expect(pointAt(path, 1000)).toEqual({ x: -50, y: 0 });
  });

  it('picks the hole closest to x', () => {
    const holes = [{ x: 100 }, { x: 300 }, { x: 500 }];
    expect(nearestHole(holes, 120)).toBe(holes[0]);
    expect(nearestHole(holes, 420)).toBe(holes[2]);
    expect(() => nearestHole([], 1)).toThrow();
  });
});
