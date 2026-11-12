import { scatter } from './scatter';
import type { Obstacle, RaceLevel, Spinner } from './types';

// The track fills the playfield right of the winners panel and runs a long way down; the camera
// follows the leader.
const LEFT = 390;
const RIGHT = 1090;
const WIDTH = RIGHT - LEFT;
const CENTER = (LEFT + RIGHT) / 2;
const WALL = 20;
const BAR = 14; // thickness of ramps and funnels

const PEN_TOP = 30;
const PEN_BOTTOM = 380;

const FINISH_Y = 5330;
const FLOOR_Y = 5450;
const WORLD_HEIGHT = 5500;

/** A bar of thickness `t` from (x1, y1) to (x2, y2). */
function segment(x1: number, y1: number, x2: number, y2: number, t = BAR): Obstacle {
  return {
    x: (x1 + x2) / 2,
    y: (y1 + y2) / 2,
    w: Math.hypot(x2 - x1, y2 - y1),
    h: t,
    angle: Math.atan2(y2 - y1, x2 - x1),
  };
}

/**
 * Ramps that alternate between the walls: each one is fixed to one wall, slopes down towards the
 * other and leaves a gap of `gap` there, through which the marbles drop onto the next ramp.
 */
function ramps(top: number, count: number, pitch: number, gap: number, rise: number): Obstacle[] {
  return Array.from({ length: count }, (_, k) => {
    const y = top + k * pitch;
    return k % 2 === 0
      ? segment(LEFT - 4, y - rise, RIGHT - gap, y + rise)
      : segment(RIGHT + 4, y - rise, LEFT + gap, y + rise);
  });
}

/** Two slopes from the walls that squeeze the field through a gap of `gap` in the middle. */
function funnel(y: number, gap: number, drop = 150): Obstacle[] {
  return [
    segment(LEFT - 4, y, CENTER - gap / 2, y + drop),
    segment(RIGHT + 4, y, CENTER + gap / 2, y + drop),
  ];
}

/** Rows of windmills, alternate rows shifted; neighbours turn in opposite directions. */
const WINDMILL_ROWS = [
  { y: 2060, xs: [520, 740, 960], arms: 2, speed: 1.3 },
  { y: 2280, xs: [630, 850], arms: 3, speed: -1.6 },
  { y: 2500, xs: [520, 740, 960], arms: 2, speed: -1.3 },
  { y: 2720, xs: [630, 850], arms: 3, speed: 1.6 },
];
const spinners: Spinner[] = WINDMILL_ROWS.flatMap((row, r) =>
  row.xs.map((x, k) => ({
    x,
    y: row.y,
    w: 170,
    h: 16,
    arms: row.arms,
    speed: row.speed * (k % 2 === 0 ? 1 : -1),
    // The windmills in the middle of the track would throw the marbles to one side for good.
    ...(r % 2 === 0 && k === 1 ? { reverseEvery: 5 } : {}),
  })),
);

/** A field of pinball bumpers: every marble has to bounce its way down through it. */
const BUMPER_TOP = 3200;
const BUMPER_ROWS = 16;
const BUMPER_ROW_GAP = 52;
const BUMPER_COLS = 9;
const BUMPER_EDGE = 30; // distance of the outermost bumpers from the walls
const BUMPER_PITCH = (WIDTH - 2 * BUMPER_EDGE) / BUMPER_COLS; // gaps of 55px between bumpers
const BUMPER_SIZE = 16;
const BUMPER_SCATTER = 10; // px; gaps stay wider than a marble
const bumpers: Obstacle[] = Array.from({ length: BUMPER_ROWS }, (_, row) => {
  const count = row % 2 === 0 ? BUMPER_COLS + 1 : BUMPER_COLS;
  const shift = row % 2 === 0 ? 0 : 0.5;
  return Array.from({ length: count }, (_, k) => {
    const atWall = row % 2 === 0 && (k === 0 || k === count - 1);
    return {
      shape: 'circle' as const,
      bumper: true,
      x:
        LEFT +
        BUMPER_EDGE +
        (k + shift) * BUMPER_PITCH +
        (atWall ? 0 : scatter(row, k) * BUMPER_SCATTER),
      y:
        BUMPER_TOP +
        row * BUMPER_ROW_GAP +
        (atWall ? 0 : scatter(k, row + 7) * (BUMPER_SCATTER / 2)),
      w: BUMPER_SIZE,
      h: BUMPER_SIZE,
    };
  });
}).flat();

const walls: Obstacle[] = [
  { x: LEFT - WALL / 2, y: FLOOR_Y / 2, w: WALL, h: FLOOR_Y },
  { x: RIGHT + WALL / 2, y: FLOOR_Y / 2, w: WALL, h: FLOOR_Y },
  { x: CENTER, y: FLOOR_Y, w: WIDTH + 2 * WALL, h: 24 }, // catches the marbles after the finish
];

export const raceTrack: RaceLevel = {
  kind: 'race',
  id: 'race-track',
  name: 'Marble race',
  bounds: { left: LEFT, right: RIGHT, top: 0 },
  worldHeight: WORLD_HEIGHT,
  pen: { top: PEN_TOP, bottom: PEN_BOTTOM },
  finishY: FINISH_Y,
  gravity: 0.7,
  spinners,
  obstacles: [
    ...walls,
    ...ramps(480, 6, 210, 120, 58), // slides
    ...funnel(1760, 130),
    ...funnel(2950, 130), // after the windmills
    ...bumpers,
    ...funnel(4150, 130),
    ...ramps(4400, 4, 190, 105, 62), // steep slides
    ...funnel(5100, 150),
  ],
};
