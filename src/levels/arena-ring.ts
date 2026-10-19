import type { RingLevel } from './types';

export const arenaRing: RingLevel = {
  kind: 'ring',
  id: 'arena-ring',
  name: 'Rotující kruh',
  radius: 380,
  rotationSpeed: 0.4,
  holes: [
    { angle: 0, width: 0.25 },
    { angle: 2.1, width: 0.25 },
    { angle: 4.2, width: 0.25 },
  ],
  // Absolute coordinates in the 900x900 arena (ring center = 450,450).
  obstacles: [
    { x: 450, y: 250, w: 120, h: 16 },
    { x: 450, y: 650, w: 120, h: 16 },
    { x: 250, y: 450, w: 16, h: 120 },
    { x: 650, y: 450, w: 16, h: 120 },
    { x: 290, y: 290, w: 90, h: 16, angle: Math.PI / 4 },
    { x: 610, y: 290, w: 90, h: 16, angle: -Math.PI / 4 },
    { x: 290, y: 610, w: 90, h: 16, angle: -Math.PI / 4 },
    { x: 610, y: 610, w: 90, h: 16, angle: Math.PI / 4 },
  ],
};
