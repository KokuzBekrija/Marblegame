import type { Obstacle, RingLevel } from './types';

// Ring sits in the upper right of the 1200x1070 canvas; the left part shows the round winners
// and the strip below the ring lists the eliminated flags.
const CENTER = { x: 760, y: 450 };
const DIAMOND_RADIUS = 290;

/** Obstacle positioned relative to the ring center. */
function at(dx: number, dy: number, rest: Omit<Obstacle, 'x' | 'y'>): Obstacle {
  return { x: CENTER.x + dx, y: CENTER.y + dy, ...rest };
}

// Eight rhombi on a circle between the bars and the ring, long diagonal pointing outwards.
const diamonds: Obstacle[] = Array.from({ length: 8 }, (_, k) => {
  const a = (Math.PI / 4) * k + Math.PI / 8;
  return at(Math.cos(a) * DIAMOND_RADIUS, Math.sin(a) * DIAMOND_RADIUS, {
    shape: 'diamond',
    w: 34,
    h: 58,
    angle: a - Math.PI / 2,
  });
});

export const arenaRing: RingLevel = {
  kind: 'ring',
  id: 'arena-ring',
  name: 'Rotující kruh',
  center: CENTER,
  radius: 380,
  rotationSpeed: 0.4,
  holes: [
    { angle: 0, width: 0.2 },
    { angle: 2.1, width: 0.2 },
    { angle: 4.2, width: 0.2 },
  ],
  obstacles: [
    at(0, -200, { w: 84, h: 12 }),
    at(0, 200, { w: 84, h: 12 }),
    at(-200, 0, { w: 12, h: 84 }),
    at(200, 0, { w: 12, h: 84 }),
    at(-160, -160, { w: 62, h: 12, angle: Math.PI / 4 }),
    at(160, -160, { w: 62, h: 12, angle: -Math.PI / 4 }),
    at(-160, 160, { w: 62, h: 12, angle: -Math.PI / 4 }),
    at(160, 160, { w: 62, h: 12, angle: Math.PI / 4 }),
    ...diamonds,
  ],
};
