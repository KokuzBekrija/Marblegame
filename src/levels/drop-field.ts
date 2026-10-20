import type { DropLevel, Obstacle } from './types';

// Playfield right of the winners panel, above the strip listing the eliminated flags.
const LEFT = 390;
const RIGHT = 1170;
const TOP = 64;
const FLOOR_Y = 815;
const WALL = 20;

const PEG_ROWS = 6;
const PEG_TOP = 395;
const PEG_ROW_GAP = 64;
const PEG_PITCH = 78;
const PEG_DIAMETER = 18;

const HOLES = 6;
const PEAK_PITCH = (RIGHT - LEFT) / HOLES;
const PEAK_WIDTH = 66; // leaves a hole of PEAK_PITCH - PEAK_WIDTH = 64px, two marble diameters

/** Left and right walls reaching from the top down to the floor. */
const walls: Obstacle[] = [LEFT - WALL / 2, RIGHT + WALL / 2].map((x) => ({
  x,
  y: (TOP + FLOOR_Y + 24) / 2,
  w: WALL,
  h: FLOOR_Y + 24 - TOP,
}));

/** Rhombi along the floor; the holes are the gaps between them and slopes steer marbles in. */
const peaks: Obstacle[] = Array.from({ length: HOLES + 1 }, (_, k) => ({
  shape: 'diamond',
  x: LEFT + k * PEAK_PITCH,
  y: FLOOR_Y,
  w: PEAK_WIDTH,
  h: 48,
}));

/**
 * Staggered rows: even rows hold round pegs, odd rows alternate between tilted bars and
 * rhombi, so marbles are bounced around in several different ways.
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
  return items;
}).flat();

export const dropField: DropLevel = {
  kind: 'drop',
  id: 'drop-field',
  name: 'Marble drop',
  bounds: { left: LEFT, right: RIGHT, top: TOP },
  floorY: FLOOR_Y,
  gravity: 0.9,
  obstacles: [...walls, ...peaks, ...field],
};
