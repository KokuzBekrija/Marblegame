import Phaser from 'phaser';
import { MARBLE_RADIUS, WALL_THICKNESS, ringSpawnPoints } from '../core/spawn';
import { arenaRing } from '../levels/arena-ring';
import { TournamentScene } from './TournamentScene';

const MARBLE_SPEED = 3.5; // px per physics step
const SEGMENTS = 120; // ring resolution
const TAU = Math.PI * 2;
const CENTER = arenaRing.center;

/** Smallest absolute difference between two angles (rad). */
function angleDiff(a: number, b: number): number {
  const d = Math.abs((a - b) % TAU);
  return d > Math.PI ? TAU - d : d;
}

/**
 * Rotating-ring mode: marbles bounce around inside a rotating ring and are out when they
 * leave through one of its holes.
 */
export class ArenaScene extends TournamentScene {
  protected readonly level = arenaRing;
  protected readonly arenaCenter = CENTER;
  // Top-down arena without gravity: marbles keep their speed and bounce perfectly.
  protected readonly wallRestitution = 1;
  protected readonly marbleRestitution = 1;
  protected readonly restSpeed = 0;
  protected readonly marbleFrictionAir = 0;
  private ring!: MatterJS.BodyType;
  private ringGfx!: Phaser.GameObjects.Graphics;

  constructor() {
    super('Arena');
  }

  protected buildWorld(): void {
    this.matter.world.setGravity(0, 0);
    this.ring = this.buildRing();
    this.ringGfx = this.drawRing();
    this.buildObstacles();
  }

  protected spawnPoints(count: number): { x: number; y: number }[] {
    return ringSpawnPoints(count, this.level);
  }

  protected initialVelocity(): { x: number; y: number } {
    const dir = Phaser.Math.FloatBetween(0, TAU);
    return { x: Math.cos(dir) * MARBLE_SPEED, y: Math.sin(dir) * MARBLE_SPEED };
  }

  protected stepWorld(delta: number): void {
    // Rotate the compound ring around its geometric center.
    const step = this.level.rotationSpeed * (delta / 1000);
    this.rotateBody(this.ring, step, CENTER);
    this.ringGfx.rotation += step;

    const escapeDistance = this.level.radius + WALL_THICKNESS + MARBLE_RADIUS;
    for (const [code, img] of this.marbles) {
      if (Phaser.Math.Distance.Between(img.x, img.y, CENTER.x, CENTER.y) > escapeDistance) {
        this.eliminate(code);
        // If several marbles leave in the same frame, stop at the first moment one is left.
        if (this.tracker.winner) break;
        continue;
      }
      // Without gravity or friction, keep every marble at constant speed.
      const v = img.body!.velocity;
      const speed = Math.hypot(v.x, v.y);
      if (speed > 0.01) img.setVelocity((v.x / speed) * MARBLE_SPEED, (v.y / speed) * MARBLE_SPEED);
    }
  }

  /** Builds the ring from short rectangles, leaving gaps where the level defines holes. */
  private buildRing(): MatterJS.BodyType {
    const level = this.level;
    const parts: MatterJS.BodyType[] = [];
    const segmentLength = (TAU * level.radius) / SEGMENTS + 2;

    for (let i = 0; i < SEGMENTS; i++) {
      const a = (i / SEGMENTS) * TAU;
      if (level.holes.some((h) => angleDiff(a, h.angle) <= h.width / 2)) continue;
      parts.push(
        this.matter.bodies.rectangle(
          CENTER.x + Math.cos(a) * level.radius,
          CENTER.y + Math.sin(a) * level.radius,
          WALL_THICKNESS,
          segmentLength,
          { angle: a },
        ),
      );
    }

    const ring = this.matter.body.create({ parts, isStatic: true });
    this.matter.world.add(ring);
    return ring;
  }

  /** Draws the ring as arcs between holes; rotated together with the physics body. */
  private drawRing(): Phaser.GameObjects.Graphics {
    const level = this.level;
    const gfx = this.add.graphics({ x: CENTER.x, y: CENTER.y });
    gfx.lineStyle(WALL_THICKNESS, 0x6c7bd9, 1);
    const holes = [...level.holes].sort((a, b) => a.angle - b.angle);
    // Visible arcs run from the end of one hole to the start of the next.
    holes.forEach((h, i) => {
      const next = holes[(i + 1) % holes.length]!;
      const start = h.angle + h.width / 2;
      let end = next.angle - next.width / 2;
      if (end <= start) end += TAU;
      gfx.beginPath();
      gfx.arc(0, 0, level.radius, start, end);
      gfx.strokePath();
    });
    return gfx;
  }
}
