/** Data-driven level definitions so new levels need no scene code. */
export type LevelConfig = RingLevel | DropLevel;

/**
 * Static obstacle. `diamond` is a rhombus with diagonals `w` (horizontal) and `h` (vertical),
 * `circle` is a peg of diameter `w`.
 */
export interface Obstacle {
  shape?: 'bar' | 'diamond' | 'circle'; // default 'bar'
  x: number;
  y: number;
  w: number;
  h: number;
  angle?: number; // rad
}

interface BaseLevel {
  id: string;
  name: string;
  obstacles: Obstacle[];
}

/** Marbles inside a (rotating) ring; they drop out through holes. */
export interface RingLevel extends BaseLevel {
  kind: 'ring';
  center: { x: number; y: number };
  radius: number;
  rotationSpeed: number; // rad/s
  holes: { angle: number; width: number }[]; // angle in rad, width in rad
}

/**
 * Marbles start in a block at the top, fall under gravity through the obstacles and drop out
 * through the holes of the floor, which is built from the `obstacles` (wall bars and peaks).
 */
export interface DropLevel extends BaseLevel {
  kind: 'drop';
  bounds: { left: number; right: number; top: number };
  floorY: number; // y of the floor peaks; marbles falling past it are eliminated
  gravity: number; // Matter gravity.y
}
