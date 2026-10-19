import type { Obstacle, RingLevel } from './types';

const CENTER = { x: 450, y: 450 };
const DIAMOND_RADIUS = 290;

// Eight rhombi on a circle between the bars and the ring, long diagonal pointing outwards.
const diamonds: Obstacle[] = Array.from({ length: 8 }, (_, k) => {
  const a = (Math.PI / 4) * k + Math.PI / 8;
  return {
    shape: 'diamond',
    x: CENTER.x + Math.cos(a) * DIAMOND_RADIUS,
    y: CENTER.y + Math.sin(a) * DIAMOND_RADIUS,
    w: 34,
    h: 58,
    angle: a - Math.PI / 2,
  };
});

export const arenaRing: RingLevel = {
  kind: 'ring',
  id: 'arena-ring',
  name: 'Rotující kruh',
  radius: 380,
  rotationSpeed: 0.4,
  holes: [
    { angle: 0, width: 0.2 },
    { angle: 2.1, width: 0.2 },
    { angle: 4.2, width: 0.2 },
  ],
  // Absolute coordinates in the 900x900 arena (ring center = 450,450).
  obstacles: [
    { x: 450, y: 250, w: 84, h: 12 },
    { x: 450, y: 650, w: 84, h: 12 },
    { x: 250, y: 450, w: 12, h: 84 },
    { x: 650, y: 450, w: 12, h: 84 },
    { x: 290, y: 290, w: 62, h: 12, angle: Math.PI / 4 },
    { x: 610, y: 290, w: 62, h: 12, angle: -Math.PI / 4 },
    { x: 290, y: 610, w: 62, h: 12, angle: -Math.PI / 4 },
    { x: 610, y: 610, w: 62, h: 12, angle: Math.PI / 4 },
    ...diamonds,
  ],
};
