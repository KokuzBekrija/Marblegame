import Phaser from 'phaser';
import { COUNTRIES } from '../data/countries';
import { EliminationTracker } from '../core/elimination';
import { MARBLE_RADIUS, WALL_THICKNESS, ringSpawnPoints } from '../core/spawn';
import { Tournament } from '../core/tournament';
import { arenaRing } from '../levels/arena-ring';
import type { RingLevel } from '../levels/types';

const CENTER = arenaRing.center;
const MARBLE_TEXTURE_SIZE = 64; // must match makeMarbleTextures in BootScene
const NEXT_ROUND_DELAY = 3000; // ms the winner stays on screen
const PANEL_X = 24;
const PANEL_ROW_Y = 84;
const PANEL_ROW_HEIGHT = 48;
// Strip below the ring listing the eliminated flags with their final place, in elimination order.
const OUT_TOP = 868;
const OUT_COLS = 40;
const OUT_ROWS = 5;
const OUT_CELL_W = (1200 - 2 * PANEL_X) / OUT_COLS;
const OUT_CELL_H = 34;
const OUT_FLAG_SIZE = 20;
// The finale (5 flags) lists the full ranking with names, larger than the strip of normal rounds.
const FINAL_ROW_HEIGHT = 34;
const FINAL_FLAG_SIZE = 30;
const MARBLE_SPEED = 3.5; // px per physics step
const SEGMENTS = 120; // ring resolution
const TAU = Math.PI * 2;

/** Smallest absolute difference between two angles (rad). */
function angleDiff(a: number, b: number): number {
  const d = Math.abs((a - b) % TAU);
  return d > Math.PI ? TAU - d : d;
}

function countryName(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

/**
 * Tournament on the rotating-ring level: 5 rounds, each won by the last marble inside the ring.
 * Round winners are listed on the left and meet in the finale.
 */
export class ArenaScene extends Phaser.Scene {
  private tournament!: Tournament;
  private panelRows: { icon: Phaser.GameObjects.Image | null; text: Phaser.GameObjects.Text }[] =
    [];
  private tracker!: EliminationTracker;
  private level: RingLevel = arenaRing;
  private ring!: MatterJS.BodyType;
  private ringGfx!: Phaser.GameObjects.Graphics;
  private marbles = new Map<string, Phaser.Physics.Matter.Image>();
  private statusText!: Phaser.GameObjects.Text;
  private finished = false;
  private outCount = 0;
  private finalSlots: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('Arena');
  }

  init(data: { tournament?: Tournament }): void {
    this.tournament = data.tournament ?? new Tournament(COUNTRIES.map((c) => c.code));
  }

  create(): void {
    this.finished = false;
    this.panelRows = [];
    this.outCount = 0;
    this.marbles.clear();
    // Top-down arena: no gravity, marbles keep moving and bounce off walls and obstacles.
    this.matter.world.setGravity(0, 0);
    // Matter's own solver leaves marbles sliding along walls, so bounces are computed manually.
    this.matter.world.on('collisionstart', this.onCollide, this);
    this.matter.world.on('collisionactive', this.onCollide, this);
    this.ring = this.buildRing(this.level);
    this.ringGfx = this.drawRing(this.level);
    this.buildObstacles(this.level);

    const ids = Phaser.Utils.Array.Shuffle(this.tournament.participants);
    this.tracker = new EliminationTracker(ids);

    const spawn = ringSpawnPoints(ids.length, this.level);
    ids.forEach((code, i) => {
      const img = this.matter.add.image(spawn[i]!.x, spawn[i]!.y, `marble-${code}`, undefined, {
        // Body is built at texture size; setDisplaySize below scales it down to MARBLE_RADIUS.
        shape: { type: 'circle', radius: MARBLE_TEXTURE_SIZE / 2 },
        isSensor: true, // collisions are reported but resolved manually, see onCollide
        restitution: 1,
        friction: 0,
        frictionStatic: 0,
        frictionAir: 0,
      });
      img.setDisplaySize(MARBLE_RADIUS * 2, MARBLE_RADIUS * 2);
      img.setData('marble', true);
      const dir = Phaser.Math.FloatBetween(0, TAU);
      img.setVelocity(Math.cos(dir) * MARBLE_SPEED, Math.sin(dir) * MARBLE_SPEED);
      this.marbles.set(code, img);
    });

    this.statusText = this.add
      .text(CENTER.x, 16, '', { fontSize: '24px', color: '#ffffff' })
      .setOrigin(0.5, 0);
    this.buildPanel();
    const finale = this.tournament.isFinale;
    this.add.text(PANEL_X, OUT_TOP - 4, finale ? 'Final ranking' : 'Eliminated – final place', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    if (finale) {
      this.finalSlots = [];
      for (let place = 1; place <= ids.length; place++) {
        this.finalSlots.push(
          this.add.text(PANEL_X + FINAL_FLAG_SIZE + 12, this.finalRowY(place) - 14, `${place}. ?`, {
            fontSize: '26px',
            color: '#6b6f85',
          }),
        );
      }
    }
    this.updateStatus();
  }

  private finalRowY(place: number): number {
    return OUT_TOP + 38 + (place - 1) * FINAL_ROW_HEIGHT;
  }

  /** Finale: writes the flag and name into the row of its final place. */
  private fillFinalSlot(code: string, place: number): void {
    const slot = this.finalSlots[place - 1];
    if (!slot) return;
    this.add
      .image(PANEL_X + FINAL_FLAG_SIZE / 2, this.finalRowY(place), `marble-${code}`)
      .setDisplaySize(FINAL_FLAG_SIZE, FINAL_FLAG_SIZE);
    slot
      .setText(`${place}. ${countryName(code)}`)
      .setColor(place === 1 ? '#ffd166' : '#ffffff')
      .setFontStyle(place === 1 ? 'bold' : 'normal');
  }

  /** Appends a flag with its final place to the strip of eliminated flags. */
  private addToOutList(code: string): void {
    const place = this.tracker.placeOf(code);
    if (place === null) return;
    if (this.tournament.isFinale) {
      this.fillFinalSlot(code, place);
      return;
    }
    if (this.outCount >= OUT_COLS * OUT_ROWS) return;
    const col = this.outCount % OUT_COLS;
    const row = Math.floor(this.outCount / OUT_COLS);
    this.outCount++;
    const x = PANEL_X + OUT_CELL_W * (col + 0.5);
    const y = OUT_TOP + 26 + row * OUT_CELL_H;
    this.add.image(x, y, `marble-${code}`).setDisplaySize(OUT_FLAG_SIZE, OUT_FLAG_SIZE);
    this.add
      .text(x, y + OUT_FLAG_SIZE / 2 + 1, String(place), {
        fontSize: '11px',
        color: place === 1 ? '#ffd166' : '#aab0c8',
      })
      .setOrigin(0.5, 0);
  }

  private marbleOf(body: MatterJS.BodyType): Phaser.Physics.Matter.Image | null {
    const go = body.gameObject as Phaser.Physics.Matter.Image | null | undefined;
    return go?.getData?.('marble') === true ? go : null;
  }

  /**
   * Marbles are sensors: Matter only reports the overlaps and does not resolve them, so the
   * bounce below is the only response (Matter's own solver leaves marbles sliding along walls).
   */
  private onCollide(event: {
    pairs: {
      bodyA: MatterJS.BodyType;
      bodyB: MatterJS.BodyType;
      collision: { normal: { x: number; y: number }; depth: number };
    }[];
  }): void {
    for (const { bodyA, bodyB, collision } of event.pairs) {
      const a = this.marbleOf(bodyA);
      const b = this.marbleOf(bodyB);
      const { depth } = collision;
      // Orient the normal from bodyA to bodyB by the body centers instead of trusting Matter's
      // sign convention: the center of a body always lies on the outer side of the face it touches.
      const sign =
        collision.normal.x * (bodyB.position.x - bodyA.position.x) +
          collision.normal.y * (bodyB.position.y - bodyA.position.y) >=
        0
          ? 1
          : -1;
      const normal = { x: collision.normal.x * sign, y: collision.normal.y * sign };
      if (a && b) this.bounceMarbles(a, b, normal, depth);
      else if (a) this.bounceOffWall(a, { x: -normal.x, y: -normal.y }, depth);
      else if (b) this.bounceOffWall(b, normal, depth);
    }
  }

  /** Pushes the marble out of the wall and mirrors its velocity about the wall surface. */
  private bounceOffWall(
    marble: Phaser.Physics.Matter.Image,
    n: { x: number; y: number }, // points from the wall towards the marble
    depth: number,
  ): void {
    const body = marble.body as MatterJS.BodyType;
    this.matter.body.setPosition(
      body,
      { x: body.position.x + n.x * depth, y: body.position.y + n.y * depth },
      false,
    );
    const { x: vx, y: vy } = body.velocity;
    const vn = vx * n.x + vy * n.y;
    if (vn >= 0) return; // already moving away
    marble.setVelocity(vx - 2 * vn * n.x, vy - 2 * vn * n.y);
  }

  /** Elastic collision of two equal masses: they swap their velocity along the contact line. */
  private bounceMarbles(
    a: Phaser.Physics.Matter.Image,
    b: Phaser.Physics.Matter.Image,
    n: { x: number; y: number }, // points from a to b
    depth: number,
  ): void {
    const ba = a.body as MatterJS.BodyType;
    const bb = b.body as MatterJS.BodyType;
    const half = depth / 2;
    this.matter.body.setPosition(
      ba,
      { x: ba.position.x - n.x * half, y: ba.position.y - n.y * half },
      false,
    );
    this.matter.body.setPosition(
      bb,
      { x: bb.position.x + n.x * half, y: bb.position.y + n.y * half },
      false,
    );
    const va = ba.velocity;
    const vb = bb.velocity;
    const approach = (va.x - vb.x) * n.x + (va.y - vb.y) * n.y;
    if (approach <= 0) return; // already separating
    a.setVelocity(va.x - approach * n.x, va.y - approach * n.y);
    b.setVelocity(vb.x + approach * n.x, vb.y + approach * n.y);
  }

  private roundLabel(): string {
    return this.tournament.isFinale
      ? 'Final'
      : `Round ${this.tournament.round}/${this.tournament.rounds}`;
  }

  /** Left-hand list: one row per qualifying round plus the finale, filled in as winners are known. */
  private buildPanel(): void {
    const { rounds, winners, champion } = this.tournament;
    this.add.text(PANEL_X, 24, 'Round winners', {
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold',
    });

    for (let i = 0; i <= rounds; i++) {
      const y = PANEL_ROW_Y + i * PANEL_ROW_HEIGHT;
      const label = i < rounds ? `Round ${i + 1}` : 'Final';
      const text = this.add.text(PANEL_X + 44, y, '', { fontSize: '22px', color: '#ffffff' });
      this.panelRows.push({ icon: null, text });
      const winner = i < rounds ? winners[i] : champion;
      this.setPanelRow(i, label, winner ?? null);
    }
  }

  private setPanelRow(index: number, label: string, code: string | null): void {
    const row = this.panelRows[index]!;
    const y = PANEL_ROW_Y + index * PANEL_ROW_HEIGHT;
    row.icon?.destroy();
    row.icon = null;
    if (code) {
      row.icon = this.add.image(PANEL_X + 16, y + 14, `marble-${code}`).setDisplaySize(32, 32);
      row.text.setText(`${label} – ${countryName(code)}`).setColor('#ffffff');
    } else {
      row.text.setText(`${label} – ?`).setColor('#6b6f85');
    }
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
        this.addToOutList(code);
        img.destroy();
        this.marbles.delete(code);
        // If several marbles leave in the same frame, stop at the first moment one is left.
        if (this.tracker.winner) break;
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
    const label = this.roundLabel();
    const rowIndex = this.tournament.isFinale ? this.tournament.rounds : this.tournament.round - 1;
    this.tournament.recordWinner(code);
    this.addToOutList(code);
    this.setPanelRow(
      rowIndex,
      rowIndex < this.tournament.rounds ? `Round ${rowIndex + 1}` : 'Final',
      code,
    );

    if (this.tournament.isComplete) {
      this.statusText.setText(`Champion: ${countryName(code)} – click to start a new game`);
    } else {
      this.statusText.setText(`${label} – winner: ${countryName(code)}`);
    }

    if (img) {
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

    if (this.tournament.isComplete) {
      this.input.once('pointerdown', () => this.scene.restart({}));
    } else {
      this.time.delayedCall(NEXT_ROUND_DELAY, () =>
        this.scene.restart({ tournament: this.tournament }),
      );
    }
  }

  /** Static obstacles inside the ring that marbles bounce off. */
  private buildObstacles(level: RingLevel): void {
    for (const o of level.obstacles) {
      const angle = o.angle ?? 0;
      const opts = { isStatic: true, angle, restitution: 1 };
      if (o.shape === 'diamond') {
        const hw = o.w / 2;
        const hh = o.h / 2;
        this.matter.add.fromVertices(
          o.x,
          o.y,
          [
            { x: 0, y: -hh },
            { x: hw, y: 0 },
            { x: 0, y: hh },
            { x: -hw, y: 0 },
          ],
          opts,
        );
        this.add.polygon(o.x, o.y, [hw, 0, o.w, hh, hw, o.h, 0, hh], 0x4fc3a1).setRotation(angle);
      } else {
        this.matter.add.rectangle(o.x, o.y, o.w, o.h, opts);
        this.add.rectangle(o.x, o.y, o.w, o.h, 0xe0a458).setRotation(angle);
      }
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
    this.statusText.setText(`${this.roundLabel()} · Remaining: ${this.tracker.remaining.length}`);
  }
}
