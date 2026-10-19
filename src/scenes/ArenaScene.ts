import Phaser from 'phaser';
import { COUNTRIES } from '../data/countries';
import { EliminationTracker } from '../core/elimination';
import { arenaRing } from '../levels/arena-ring';
import type { RingLevel } from '../levels/types';

const CENTER = { x: 450, y: 450 };
const MARBLE_RADIUS = 16;
const WALL_THICKNESS = 24;
const SEGMENTS = 120; // ring resolution
const TAU = Math.PI * 2;

/** Smallest absolute difference between two angles (rad). */
function angleDiff(a: number, b: number): number {
  const d = Math.abs((a - b) % TAU);
  return d > Math.PI ? TAU - d : d;
}

/** Level 1: marbles in a rotating ring. Marbles that fall through a hole are eliminated. */
export class ArenaScene extends Phaser.Scene {
  private tracker!: EliminationTracker;
  private level: RingLevel = arenaRing;
  private ring!: MatterJS.BodyType;
  private marbles = new Map<string, Phaser.Physics.Matter.Image>();
  private statusText!: Phaser.GameObjects.Text;
  private finished = false;

  constructor() {
    super('Arena');
  }

  create(): void {
    this.finished = false;
    this.marbles.clear();
    this.ring = this.buildRing(this.level);

    const ids = COUNTRIES.slice(0, 8);
    this.tracker = new EliminationTracker(ids.map((c) => c.code));

    ids.forEach((c, i) => {
      const img = this.matter.add.image(
        CENTER.x + (i - ids.length / 2) * 36,
        CENTER.y - 120,
        `flag-${c.code}`,
        undefined,
        { shape: { type: 'circle', radius: MARBLE_RADIUS }, restitution: 0.8, friction: 0.05 },
      );
      img.setDisplaySize(MARBLE_RADIUS * 2, MARBLE_RADIUS * 2);
      this.marbles.set(c.code, img);
    });

    this.statusText = this.add
      .text(CENTER.x, 24, '', { fontSize: '24px', color: '#ffffff' })
      .setOrigin(0.5, 0);
    this.updateStatus();
  }

  update(_time: number, delta: number): void {
    if (this.finished) return;

    // Rotate the compound ring around its geometric center.
    // Phaser's typings omit the optional `point` argument of Matter's Body.rotate.
    const rotate = this.matter.body.rotate as unknown as (
      body: MatterJS.BodyType,
      rotation: number,
      point: { x: number; y: number },
    ) => void;
    rotate(this.ring, this.level.rotationSpeed * (delta / 1000), CENTER);

    const escapeDistance = this.level.radius + WALL_THICKNESS + MARBLE_RADIUS;
    for (const [code, img] of this.marbles) {
      if (Phaser.Math.Distance.Between(img.x, img.y, CENTER.x, CENTER.y) > escapeDistance) {
        this.tracker.eliminate(code);
        img.destroy();
        this.marbles.delete(code);
      }
    }
    this.updateStatus();

    if (this.tracker.winner) {
      this.finished = true;
      const winner = COUNTRIES.find((c) => c.code === this.tracker.winner);
      this.statusText.setText(`Vítěz: ${winner?.name ?? this.tracker.winner}`);
    }
  }

  /** Builds the ring from short rectangles, leaving gaps where the level defines holes. */
  private buildRing(level: RingLevel): MatterJS.BodyType {
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

  private updateStatus(): void {
    if (this.finished) return;
    this.statusText.setText(`Zbývá: ${this.tracker.remaining.length}`);
  }
}
