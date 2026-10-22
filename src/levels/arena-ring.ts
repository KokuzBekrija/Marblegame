import type { Obstacle, RingLevel } from './types';

// The ring is as large as the screen allows: it fills the height of the 1400x1070 canvas
// (the status line fits above it) and sits right of the left column with the round winners
// and the eliminated flags.
const CENTER = { x: 885, y: 555 };

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
  radius: 495,
  rotationSpeed: 0.6,
  // A big ring needs more exits than a small one, or a round takes forever: five holes of
  // about 100px (three marble widths) evenly around the ring.
  holes: Array.from({ length: 5 }, (_, k) => ({ angle: (k / 5) * Math.PI * 2, width: 0.2 })),
  obstacles: [
    // Inner pinwheel: bars tilted against the radius so marbles get swirled outwards.
    ...circleOf(6, 120, 0, (a) => ({ w: 76, h: 14, angle: a + Math.PI / 2 + 0.6 })),
    // Rhombi with the long diagonal pointing outwards.
    ...circleOf(14, 240, Math.PI / 14, (a) => ({
      shape: 'diamond',
      w: 32,
      h: 56,
      angle: a - Math.PI / 2,
    })),
    // Outer: short bars along the ring that deflect marbles creeping around the wall.
    ...circleOf(12, 355, Math.PI / 12, (a) => ({ w: 70, h: 12, angle: a + Math.PI / 2 })),
  ],
};
