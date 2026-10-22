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

/** Rotating obstacle: `arms` bars of length `w` and thickness `h` cross at (x, y) and turn at `speed`. */
export interface Spinner {
  x: number;
  y: number;
  w: number;
  h: number;
  arms: number;
  speed: number; // rad/s, positive = clockwise on screen
}

/** A gap in the floor: a marble falling through a red hole is out, through a green one it is recycled. */
export interface DropHole {
  x: number; // center
  width: number;
  kind: 'red' | 'green';
}

/**
 * Marbles ride up a tube in random order and are released into the arena, where they fall under
 * gravity through the obstacles to the holes of the floor. The floor is built from the
 * `obstacles` (wall bars and peaks); `holes` says what each gap does.
 */
export interface DropLevel extends BaseLevel {
  kind: 'drop';
  bounds: { left: number; right: number; top: number };
  floorY: number; // y of the floor peaks
  gravity: number; // Matter gravity.y
  holes: DropHole[];
  spinners: Spinner[];
  tube: {
    x: number; // center of the vertical part
    width: number;
    bottomY: number; // where marbles enter; also y of the channel that returns marbles from green holes
    topY: number; // marbles turn towards the arena here
    // Marbles ride along the rail above the arena and fall out of it at an x within this range.
    releaseMinX: number;
    releaseMaxX: number;
  };
}
