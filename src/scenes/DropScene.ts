import Phaser from 'phaser';
import { dropSpawnPoints } from '../core/spawn';
import { dropField } from '../levels/drop-field';
import { TournamentScene } from './TournamentScene';

const ELIMINATION_MARGIN = 34; // px below the floor peaks where a falling marble is out
const MAX_SPEED = 12; // px per physics step; keeps fast marbles from tunnelling through pegs
const STUCK_DISTANCE = 10; // a marble that stays within this many px ...
const STUCK_AFTER = 1500; // ... for this many ms is considered stuck

/**
 * Marble-drop mode: marbles start in a block at the top, fall under gravity through pegs,
 * bars and rhombi, and are out when they drop through one of the holes in the floor.
 */
export class DropScene extends TournamentScene {
  protected readonly level = dropField;
  protected readonly arenaCenter = {
    x: (dropField.bounds.left + dropField.bounds.right) / 2,
    y: (dropField.bounds.top + dropField.floorY) / 2,
  };
  protected readonly wallRestitution = 0.55;
  protected readonly marbleRestitution = 0.5;
  protected readonly restSpeed = 0.7;
  protected readonly marbleFrictionAir = 0.02;
  private anchors = new Map<string, { x: number; y: number; ms: number }>();

  constructor() {
    super('Drop');
  }

  protected buildWorld(): void {
    this.anchors.clear();
    this.matter.world.setGravity(0, this.level.gravity);
    this.buildObstacles();
  }

  protected spawnPoints(count: number): { x: number; y: number }[] {
    return dropSpawnPoints(count, this.level);
  }

  protected initialVelocity(): { x: number; y: number } {
    return { x: Phaser.Math.FloatBetween(-0.5, 0.5), y: 0 };
  }

  protected stepWorld(delta: number): void {
    const outY = this.level.floorY + ELIMINATION_MARGIN;
    for (const [code, img] of this.marbles) {
      if (img.y > outY) {
        this.eliminate(code);
        if (this.tracker.winner) break;
        continue;
      }
      const v = img.body!.velocity;
      const speed = Math.hypot(v.x, v.y);
      if (speed > MAX_SPEED) {
        img.setVelocity((v.x / speed) * MAX_SPEED, (v.y / speed) * MAX_SPEED);
      }
      this.nudgeIfStuck(code, img, delta);
    }
  }

  /**
   * A marble balanced on a peak or wedged in a pile would never fall (it may jitter in place,
   * so speed alone does not tell): when it has hardly moved for a while, give it a kick.
   */
  private nudgeIfStuck(code: string, img: Phaser.Physics.Matter.Image, delta: number): void {
    const anchor = this.anchors.get(code);
    if (!anchor || Math.hypot(img.x - anchor.x, img.y - anchor.y) > STUCK_DISTANCE) {
      this.anchors.set(code, { x: img.x, y: img.y, ms: 0 });
      return;
    }
    anchor.ms += delta;
    if (anchor.ms > STUCK_AFTER) {
      img.setVelocity(Phaser.Math.FloatBetween(-3, 3), -3);
      anchor.ms = 0;
    }
  }
}
