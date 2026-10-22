import type { Obstacle, RingLevel } from '../levels/types';

export const MARBLE_RADIUS = 16;
export const WALL_THICKNESS = 24;
const SPAWN_SPACING = 19; // spiral scale; the first-round field (all flags) must fit

export interface Point {
  x: number;
  y: number;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Corners of an obstacle in world coordinates (a bar is a rectangle, a diamond a rhombus). */
export function obstacleCorners(o: Obstacle): Point[] {
  const hw = o.w / 2;
  const hh = o.h / 2;
  const local: Point[] =
    o.shape === 'diamond'
      ? [
          { x: 0, y: -hh },
          { x: hw, y: 0 },
          { x: 0, y: hh },
          { x: -hw, y: 0 },
        ]
      : [
          { x: -hw, y: -hh },
          { x: hw, y: -hh },
          { x: hw, y: hh },
          { x: -hw, y: hh },
        ];
  const cos = Math.cos(o.angle ?? 0);
  const sin = Math.sin(o.angle ?? 0);
  return local.map((p) => ({ x: o.x + p.x * cos - p.y * sin, y: o.y + p.x * sin + p.y * cos }));
}

/** Distance from a point to a convex polygon given in either winding order; 0 when inside. */
function distanceToPolygon(p: Point, poly: Point[]): number {
  let inside = true;
  let sign = 0;
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const cross = ex * (p.y - a.y) - ey * (p.x - a.x);
    if (sign === 0) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) inside = false;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * ex + (p.y - a.y) * ey) / (ex * ex + ey * ey)));
    best = Math.min(best, Math.hypot(p.x - (a.x + t * ex), p.y - (a.y + t * ey)));
  }
  return inside ? 0 : best;
}

export function distanceToObstacle(p: Point, o: Obstacle): number {
  if (o.shape === 'circle') return Math.max(0, Math.hypot(p.x - o.x, p.y - o.y) - o.w / 2);
  return distanceToPolygon(p, obstacleCorners(o));
}

/**
 * Start positions on a sunflower spiral around `center`, which spreads the marbles evenly
 * without overlaps. Points closer than `clearance` to an obstacle are skipped.
 * Throws when `count` points do not fit within `maxRadius`.
 */
export function spawnPoints(
  count: number,
  opts: {
    center: Point;
    maxRadius: number;
    spacing: number;
    clearance: number;
    obstacles: readonly Obstacle[];
  },
): Point[] {
  const { center, maxRadius, spacing, clearance, obstacles } = opts;
  const points: Point[] = [];
  for (let i = 0; points.length < count; i++) {
    const r = spacing * Math.sqrt(i + 0.5);
    if (r > maxRadius) throw new Error(`Cannot fit ${count} marbles in the arena`);
    const a = i * GOLDEN_ANGLE;
    const p = { x: center.x + Math.cos(a) * r, y: center.y + Math.sin(a) * r };
    if (obstacles.every((o) => distanceToObstacle(p, o) >= clearance)) points.push(p);
  }
  return points;
}

/** Start positions for `count` marbles inside a ring level, clear of obstacles and the wall. */
export function ringSpawnPoints(count: number, level: RingLevel): Point[] {
  return spawnPoints(count, {
    center: level.center,
    maxRadius: level.radius - WALL_THICKNESS / 2 - MARBLE_RADIUS - 4,
    spacing: SPAWN_SPACING,
    clearance: MARBLE_RADIUS + 2,
    obstacles: level.obstacles,
  });
}
