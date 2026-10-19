/** Data-driven level definitions so new levels need no scene code. */
export type LevelConfig = RingLevel | RaceLevel;

interface BaseLevel {
  id: string;
  name: string;
  obstacles: { x: number; y: number; w: number; h: number; angle?: number }[];
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
