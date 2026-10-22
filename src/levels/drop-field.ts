import type { DropHole, DropLevel, Obstacle, Spinner } from './types';

// Playfield right of the winners panel, above the strip listing the eliminated flags.
// The tube runs up the right edge; its return channel passes below the floor of the arena.
const LEFT = 390;
const RIGHT = 1090;
const TOP = 64;
const CEILING_Y = 74;
const FLOOR_Y = 940;
const WALL = 20;

const TUBE_X = 1133;
const TUBE_WIDTH = 46;
const TUBE_BOTTOM_Y = 1030;
const TUBE_TOP_Y = 110;
const RELEASE_MIN_X = LEFT + 40; // marbles fall out of the rail anywhere across the arena
const RELEASE_MAX_X = RIGHT - 40;
const RIGHT_WALL_TOP = 140; // below the passage that leads from the tube into the arena

const PEG_ROWS = 11;
const PEG_TOP = 190;
const PEG_ROW_GAP = 64;
const PEG_PITCH = 78;
const PEG_DIAMETER = 18;

const HOLE_KINDS: DropHole['kind'][] = ['red', 'green', 'red', 'red', 'green', 'red'];
const HOLES = HOLE_KINDS.length;
const PEAK_PITCH = (RIGHT - LEFT) / HOLES;
const PEAK_WIDTH = 66; // leaves a hole of PEAK_PITCH - PEAK_WIDTH = 50px, over 1.5 marble diameters

const FLOOR_BOTTOM = FLOOR_Y + 24;

/** Left wall, right wall (open at the top for the tube) and the ceiling over arena and tube. */
const walls: Obstacle[] = [
  { x: LEFT - WALL / 2, y: (CEILING_Y + FLOOR_BOTTOM) / 2, w: WALL, h: FLOOR_BOTTOM - CEILING_Y },
  {
    x: RIGHT + WALL / 2,
    y: (RIGHT_WALL_TOP + FLOOR_BOTTOM) / 2,
    w: WALL,
    h: FLOOR_BOTTOM - RIGHT_WALL_TOP,
  },
  {
    x: (LEFT - WALL + TUBE_X + TUBE_WIDTH / 2 + WALL / 2) / 2,
    y: CEILING_Y,
    w: TUBE_X + TUBE_WIDTH / 2 + WALL / 2 - (LEFT - WALL),
    h: 12,
  },
];

/** Rhombi along the floor; the holes are the gaps between them and slopes steer marbles in. */
const peaks: Obstacle[] = Array.from({ length: HOLES + 1 }, (_, k) => ({
  shape: 'diamond',
  x: LEFT + k * PEAK_PITCH,
  y: FLOOR_Y,
  w: PEAK_WIDTH,
  h: 48,
}));

const holes: DropHole[] = HOLE_KINDS.map((kind, k) => ({
  x: LEFT + (k + 0.5) * PEAK_PITCH,
  width: PEAK_PITCH - PEAK_WIDTH,
  kind,
}));

/**
 * Large windmills in three staggered rows that together cover most of the arena width: the
 * gaps between them are only about 1.5 marbles wide, so many marbles are caught and flung.
 * Neighbours turn in opposite directions, like meshing gears, so nothing is sheared between them.
 */
const spinners: Spinner[] = [
  { x: 520, y: 300, w: 170, h: 16, arms: 2, speed: 1.3 },
  { x: 740, y: 300, w: 170, h: 16, arms: 2, speed: -1.3 },
  { x: 960, y: 300, w: 170, h: 16, arms: 2, speed: 1.3 },
  { x: 630, y: 520, w: 170, h: 16, arms: 3, speed: -1.6 },
  { x: 850, y: 520, w: 170, h: 16, arms: 3, speed: 1.6 },
  { x: 520, y: 740, w: 170, h: 16, arms: 2, speed: -1.3 },
  { x: 740, y: 740, w: 170, h: 16, arms: 2, speed: 1.3 },
  { x: 960, y: 740, w: 170, h: 16, arms: 2, speed: -1.3 },
];
const SPINNER_CLEARANCE = 34; // pegs closer than this to the tip of a spinner are left out

/**
 * Staggered rows: even rows hold round pegs, odd rows alternate between tilted bars and
 * rhombi, so marbles are bounced around in several different ways. Pegs that would be
 * reached by a spinner are left out.
 */
const field: Obstacle[] = Array.from({ length: PEG_ROWS }, (_, row) => {
  const y = PEG_TOP + row * PEG_ROW_GAP;
  const offset = row % 2 === 0 ? PEG_PITCH / 2 : PEG_PITCH;
  const items: Obstacle[] = [];
  for (let k = 0, x = LEFT + offset; x < RIGHT - 30; k++, x += PEG_PITCH) {
    if (row % 2 === 0) items.push({ shape: 'circle', x, y, w: PEG_DIAMETER, h: PEG_DIAMETER });
    // Bars in a row all lean the same way (alternating between rows): opposite neighbours
    // would form a V-shaped cup that holds marbles.
    else if (k % 2 === 0) items.push({ x, y, w: 48, h: 9, angle: (row % 4 === 1 ? 1 : -1) * 0.6 });
    else items.push({ shape: 'diamond', x, y, w: 26, h: 40 });
  }
  return items.filter((o) =>
    spinners.every(
      (s) =>
        Math.hypot(o.x - s.x, o.y - s.y) > s.w / 2 + SPINNER_CLEARANCE + Math.max(o.w, o.h) / 2,
    ),
  );
}).flat();

export const dropField: DropLevel = {
  kind: 'drop',
  id: 'drop-field',
  name: 'Marble drop',
  bounds: { left: LEFT, right: RIGHT, top: TOP },
  floorY: FLOOR_Y,
  gravity: 0.9,
  holes,
  spinners,
  tube: {
    x: TUBE_X,
    width: TUBE_WIDTH,
    bottomY: TUBE_BOTTOM_Y,
    topY: TUBE_TOP_Y,
    releaseMinX: RELEASE_MIN_X,
    releaseMaxX: RELEASE_MAX_X,
  },
  obstacles: [...walls, ...peaks, ...field],
};
