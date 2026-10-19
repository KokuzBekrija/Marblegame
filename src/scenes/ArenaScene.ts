import Phaser from 'phaser';
import { COUNTRIES } from '../data/countries';
import { EliminationTracker } from '../core/elimination';
import { arenaRing } from '../levels/arena-ring';
import type { RingLevel } from '../levels/types';

const CENTER = { x: 450, y: 450 };
const MARBLE_RADIUS = 16;
const WALL_THICKNESS = 24;
const MARBLE_TEXTURE_SIZE = 64; // must match makeMarbleTextures in BootScene
const SPAWN_RADIUS = 60;
const MARBLE_SPEED = 5; // px per physics step
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
  private ringGfx!: Phaser.GameObjects.Graphics;
  private marbles = new Map<string, Phaser.Physics.Matter.Image>();
  private statusText!: Phaser.GameObjects.Text;
  private finished = false;

  constructor() {
    super('Arena');
  }

  create(): void {
    this.finished = false;
    this.marbles.clear();
    // Top-down arena: no gravity, marbles keep moving and bounce off walls and obstacles.
    this.matter.world.setGravity(0, 0);
    this.ring = this.buildRing(this.level);
    this.ringGfx = this.drawRing(this.level);
    this.buildObstacles(this.level);

    const ids = COUNTRIES.slice(0, 8);
    this.tracker = new EliminationTracker(ids.map((c) => c.code));

    ids.forEach((c, i) => {
      const a = (i / ids.length) * TAU;
      const img = this.matter.add.image(
        CENTER.x + Math.cos(a) * SPAWN_RADIUS,
        CENTER.y + Math.sin(a) * SPAWN_RADIUS,
        `marble-${c.code}`,
        undefined,
        {
          // Body is built at texture size; setDisplaySize below scales it down to MARBLE_RADIUS.
          shape: { type: 'circle', radius: MARBLE_TEXTURE_SIZE / 2 },
          restitution: 1,
          friction: 0,
          frictionStatic: 0,
          frictionAir: 0,
        },
      );
      img.setDisplaySize(MARBLE_RADIUS * 2, MARBLE_RADIUS * 2);
      const dir = Phaser.Math.FloatBetween(0, TAU);
      img.setVelocity(Math.cos(dir) * MARBLE_SPEED, Math.sin(dir) * MARBLE_SPEED);
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
    const step = this.level.rotationSpeed * (delta / 1000);
    rotate(this.ring, step, CENTER);
    this.ringGfx.rotation += step;

    const escapeDistance = this.level.radius + WALL_THICKNESS + MARBLE_RADIUS;
    for (const [code, img] of this.marbles) {
      if (Phaser.Math.Distance.Between(img.x, img.y, CENTER.x, CENTER.y) > escapeDistance) {
        this.tracker.eliminate(code);
        img.destroy();
        this.marbles.delete(code);
        continue;
      }
      // Without gravity or friction, keep every marble at constant speed.
      const v = img.body!.velocity;
      const speed = Math.hypot(v.x, v.y);
      if (speed > 0.01) img.setVelocity((v.x / speed) * MARBLE_SPEED, (v.y / speed) * MARBLE_SPEED);
    }
    this.updateStatus();

    const winnerCode = this.tracker.winner;
    if (winnerCode) this.showWinner(winnerCode);
  }

  /** The last marble stays in the arena: it is frozen and glides to the center. */
  private showWinner(code: string): void {
    this.finished = true;
    const img = this.marbles.get(code);
    const name = COUNTRIES.find((c) => c.code === code)?.name ?? code;
    this.statusText.setText(`Vítěz: ${name}`);
    if (!img) return;
    img.setStatic(true);
    this.tweens.add({
      targets: img,
      x: CENTER.x,
      y: CENTER.y,
      scale: img.scale * 3,
      duration: 800,
      ease: 'Sine.easeInOut',
    });
  }

  /** Static obstacles inside the ring that marbles bounce off. */
  private buildObstacles(level: RingLevel): void {
    for (const o of level.obstacles) {
      const angle = o.angle ?? 0;
      this.matter.add.rectangle(o.x, o.y, o.w, o.h, { isStatic: true, angle, restitution: 1 });
      this.add.rectangle(o.x, o.y, o.w, o.h, 0xe0a458).setRotation(angle);
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

  /** Draws the ring as arcs between holes; rotated together with the physics body. */
  private drawRing(level: RingLevel): Phaser.GameObjects.Graphics {
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

  private updateStatus(): void {
    if (this.finished) return;
    this.statusText.setText(`Zbývá: ${this.tracker.remaining.length}`);
  }
}
