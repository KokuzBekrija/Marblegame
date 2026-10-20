import type { Obstacle, RingLevel } from './types';

// Ring sits in the upper right of the 1200x1070 canvas; the left part shows the round winners
// and the strip below the ring lists the eliminated flags.
const CENTER = { x: 760, y: 450 };

/** `count` obstacles evenly spaced on a circle around the ring center. */
function circleOf(
  count: number,
  radius: number,
  phase: number,
  make: (angle: number) => Omit<Obstacle, 'x' | 'y'>,
): Obstacle[] {
  return Array.from({ length: count }, (_, k) => {
    const a = phase + (k / count) * Math.PI * 2;
    return {
      x: CENTER.x + Math.cos(a) * radius,
      y: CENTER.y + Math.sin(a) * radius,
      ...make(a),
    };
  });
}

export const arenaRing: RingLevel = {
  kind: 'ring',
  id: 'arena-ring',
  name: 'Rotating ring',
  center: CENTER,
  radius: 380,
  rotationSpeed: 0.4,
  holes: [
    { angle: 0, width: 0.2 },
    { angle: 2.1, width: 0.2 },
    { angle: 4.2, width: 0.2 },
  ],
  obstacles: [
    // Inner pinwheel: bars tilted against the radius so marbles get swirled outwards.
    ...circleOf(6, 100, 0, (a) => ({ w: 60, h: 12, angle: a + Math.PI / 2 + 0.6 })),
    // Middle: rhombi with the long diagonal pointing outwards.
    ...circleOf(12, 200, Math.PI / 12, (a) => ({
      shape: 'diamond',
      w: 28,
      h: 48,
      angle: a - Math.PI / 2,
    })),
    // Outer: short bars along the ring that deflect marbles creeping around the wall.
    ...circleOf(10, 290, Math.PI / 10, (a) => ({ w: 56, h: 10, angle: a + Math.PI / 2 })),
  ],
};
