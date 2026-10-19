/** Data-driven level definitions so new levels need no scene code. */
export type LevelConfig = RingLevel | RaceLevel;

/** Static obstacle; `diamond` is a rhombus with diagonals `w` (horizontal) and `h` (vertical). */
export interface Obstacle {
  shape?: 'bar' | 'diamond'; // default 'bar'
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
  radius: number;
  rotationSpeed: number; // rad/s
  holes: { angle: number; width: number }[]; // angle in rad, width in rad
}

/** Marbles start on a line and race through obstacles to a finish line. */
export interface RaceLevel extends BaseLevel {
  kind: 'race';
  startLineY: number;
  finishLineY: number;
  trackWidth: number;
}
