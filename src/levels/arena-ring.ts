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
  obstacles: [],
};
