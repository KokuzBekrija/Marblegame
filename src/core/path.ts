import type { Point } from './spawn';

/** Total length of a polyline. */
export function pathLength(points: readonly Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.y - points[i - 1]!.y);
  }
  return total;
}

/** Position `s` px along a polyline; clamped to its start and end. */
export function pointAt(points: readonly Point[], s: number): Point {
  if (points.length === 0) throw new Error('Path is empty');
  let rest = Math.max(0, s);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (rest <= len) {
      const t = len === 0 ? 0 : rest / len;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    rest -= len;
  }
  const last = points[points.length - 1]!;
  return { x: last.x, y: last.y };
}

/** The hole whose center is horizontally closest to `x`. */
export function nearestHole<T extends { x: number }>(holes: readonly T[], x: number): T {
  if (holes.length === 0) throw new Error('No holes');
  return holes.reduce((best, h) => (Math.abs(h.x - x) < Math.abs(best.x - x) ? h : best));
}
