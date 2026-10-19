import type { RaceLevel } from './types';

export const raceTrack: RaceLevel = {
  kind: 'race',
  id: 'race-track',
  name: 'Závod překážkami',
  startLineY: 60,
  finishLineY: 2400,
  trackWidth: 700,
  obstacles: [{ x: 350, y: 400, w: 200, h: 20, angle: 0.3 }],
};
