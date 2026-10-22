import Phaser from 'phaser';
import { COUNTRIES } from '../data/countries';
import { EliminationTracker } from '../core/elimination';
import { MARBLE_RADIUS } from '../core/spawn';
import type { Point } from '../core/spawn';
import { Tournament } from '../core/tournament';
import type { LevelConfig } from '../levels/types';

const MARBLE_TEXTURE_SIZE = 64; // must match makeMarbleTextures in BootScene
const NEXT_ROUND_DELAY = 3000; // ms the winner stays on screen
const PANEL_X = 24;
const PANEL_ROW_Y = 84;
const PANEL_ROW_HEIGHT = 48;
// Strip below the arena listing the eliminated flags with their final place, in elimination order.
const OUT_TOP = 420;
const OUT_COLS = 12;
const OUT_ROWS = 18; // 216 places: enough for a round of all 195 flags
const OUT_CELL_W = 28;
const OUT_CELL_H = 34;
const OUT_FLAG_SIZE = 20;
const PANEL_TEXT_WIDTH = 300; // longer names wrap instead of running into the arena
// The finale (5 flags) lists the full ranking with names, larger than the strip of normal rounds.
const FINAL_ROW_HEIGHT = 52;
const FINAL_FLAG_SIZE = 30;

export function countryName(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

type Vec = { x: number; y: number };

/**
 * Shared tournament flow: 5 rounds, each won by the last marble in play, then a finale of the
 * round winners. Subclasses build the world of one game mode and decide when marbles are out.
 *
 * Marbles are sensors: Matter only reports overlaps and does not resolve them, so the bounces
 * computed here are the only collision response (Matter's own solver leaves marbles sliding
 * along walls).
 */
export abstract class TournamentScene extends Phaser.Scene {
  protected tournament!: Tournament;
  protected tracker!: EliminationTracker;
  protected marbles = new Map<string, Phaser.Physics.Matter.Image>();
  protected finished = false;
  private panelRows: { icon: Phaser.GameObjects.Image | null; text: Phaser.GameObjects.Text }[] =
    [];
  private statusText!: Phaser.GameObjects.Text;
  private outCount = 0;
  private finalSlots: Phaser.GameObjects.Text[] = [];

  protected abstract readonly level: LevelConfig;
  /** Where the status line is centered and where the round winner glides to. */
  protected abstract readonly arenaCenter: Point;
  /** Fraction of the normal velocity kept after bouncing off a wall (1 = perfectly elastic). */
  protected abstract readonly wallRestitution: number;
  /** Same for two marbles hitting each other. */
  protected abstract readonly marbleRestitution: number;
  /** Impacts slower than this (px/step) do not bounce, so resting marbles do not jitter. */
  protected abstract readonly restSpeed: number;
  protected abstract readonly marbleFrictionAir: number;

  /** Creates gravity, walls and obstacles. */
  protected abstract buildWorld(): void;
  protected abstract spawnPoints(count: number): Point[];
  protected abstract initialVelocity(): Vec;
  /** Runs every frame: moves the world, eliminates marbles that are out (via `eliminate`). */
  protected abstract stepWorld(delta: number): void;
  /** Called once all marbles exist, before the first frame; lets a mode park or move them. */
  protected afterSpawn(): void {}
  /** Velocity (px/step) of a moving wall at point `p`; walls are static unless a mode says so. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected wallVelocityAt(_wall: MatterJS.BodyType, _p: Vec): Vec {
    return { x: 0, y: 0 };
  }

  /** Turns a static body about `pivot`; Phaser's typings omit the pivot argument of Body.rotate. */
  protected rotateBody(body: MatterJS.BodyType, angle: number, pivot: Vec): void {
    const rotate = this.matter.body.rotate as unknown as (
      body: MatterJS.BodyType,
      rotation: number,
      point: Vec,
    ) => void;
    rotate(body, angle, pivot);
  }

  /** Called when a round is decided, before the winner glides to the center. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected onWinner(_marble: Phaser.Physics.Matter.Image): void {}

  protected constructor(key: string) {
    super(key);
  }

  init(data: { tournament?: Tournament }): void {
    this.tournament = data.tournament ?? new Tournament(COUNTRIES.map((c) => c.code));
  }

  create(): void {
    this.finished = false;
    this.panelRows = [];
    this.outCount = 0;
    this.marbles.clear();
    this.matter.world.on('collisionstart', this.onCollide, this);
    this.matter.world.on('collisionactive', this.onCollide, this);
    this.buildWorld();

    const ids = Phaser.Utils.Array.Shuffle(this.tournament.participants);
    this.tracker = new EliminationTracker(ids);

    const spawn = this.spawnPoints(ids.length);
    ids.forEach((code, i) => {
      const img = this.matter.add.image(spawn[i]!.x, spawn[i]!.y, `marble-${code}`, undefined, {
        // Body is built at texture size; setDisplaySize below scales it down to MARBLE_RADIUS.
        shape: { type: 'circle', radius: MARBLE_TEXTURE_SIZE / 2 },
        isSensor: true, // collisions are reported but resolved manually, see onCollide
        restitution: 1,
        friction: 0,
        frictionStatic: 0,
        frictionAir: this.marbleFrictionAir,
      });
      img.setDisplaySize(MARBLE_RADIUS * 2, MARBLE_RADIUS * 2);
      img.setData('marble', true);
      const v = this.initialVelocity();
      img.setVelocity(v.x, v.y);
      this.marbles.set(code, img);
    });
    this.afterSpawn();

    this.statusText = this.add
      .text(this.arenaCenter.x, 16, '', { fontSize: '24px', color: '#ffffff' })
      .setOrigin(0.5, 0);
    this.buildPanel(ids.length);
    this.buildMenuLink();
    this.updateStatus();
  }

  update(_time: number, delta: number): void {
    if (this.finished) return;
    this.stepWorld(delta);
    this.updateStatus();
    const winnerCode = this.tracker.winner;
    if (winnerCode) this.showWinner(winnerCode);
  }

  /** Removes a marble from play and lists it with its final place. */
  protected eliminate(code: string): void {
    this.tracker.eliminate(code);
    this.addToOutList(code);
    this.marbles.get(code)?.destroy();
    this.marbles.delete(code);
  }

  /** Static obstacles that marbles bounce off, drawn to match their physics bodies. */
  protected buildObstacles(): void {
    for (const o of this.level.obstacles) {
      const angle = o.angle ?? 0;
      const opts = { isStatic: true, angle, restitution: 1 };
      if (o.shape === 'circle') {
        this.matter.add.circle(o.x, o.y, o.w / 2, opts);
        this.add.circle(o.x, o.y, o.w / 2, 0xb8bfe8);
      } else if (o.shape === 'diamond') {
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

  private marbleOf(body: MatterJS.BodyType): Phaser.Physics.Matter.Image | null {
    const go = body.gameObject as Phaser.Physics.Matter.Image | null | undefined;
    return go?.getData?.('marble') === true ? go : null;
  }

  private onCollide(event: {
    pairs: {
      bodyA: MatterJS.BodyType;
      bodyB: MatterJS.BodyType;
      collision: { normal: Vec; depth: number };
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
      else if (a) this.bounceOffWall(a, bodyB, { x: -normal.x, y: -normal.y }, depth);
      else if (b) this.bounceOffWall(b, bodyA, normal, depth);
    }
  }

  /**
   * Pushes the marble out of the wall and reflects its velocity about the wall surface. A moving
   * wall is handled in its own frame of reference, so a spinning bar flings the marble.
   */
  private bounceOffWall(
    marble: Phaser.Physics.Matter.Image,
    wall: MatterJS.BodyType,
    n: Vec, // points from the wall towards the marble
    depth: number,
  ): void {
    const body = marble.body as MatterJS.BodyType;
    this.matter.body.setPosition(
      body,
      { x: body.position.x + n.x * depth, y: body.position.y + n.y * depth },
      false,
    );
    const contact = {
      x: body.position.x - n.x * MARBLE_RADIUS,
      y: body.position.y - n.y * MARBLE_RADIUS,
    };
    const w = this.wallVelocityAt(wall, contact);
    const { x: vx, y: vy } = body.velocity;
    const vn = (vx - w.x) * n.x + (vy - w.y) * n.y;
    if (vn >= 0) return; // already moving away
    const e = -vn < this.restSpeed ? 0 : this.wallRestitution;
    marble.setVelocity(vx - (1 + e) * vn * n.x, vy - (1 + e) * vn * n.y);
  }

  /** Collision of two equal masses: they exchange velocity along the contact line. */
  private bounceMarbles(
    a: Phaser.Physics.Matter.Image,
    b: Phaser.Physics.Matter.Image,
    n: Vec, // points from a to b
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
    const e = approach < this.restSpeed ? 0 : this.marbleRestitution;
    const impulse = ((1 + e) * approach) / 2;
    a.setVelocity(va.x - impulse * n.x, va.y - impulse * n.y);
    b.setVelocity(vb.x + impulse * n.x, vb.y + impulse * n.y);
  }

  private roundLabel(): string {
    return this.tournament.isFinale
      ? 'Final'
      : `Round ${this.tournament.round}/${this.tournament.rounds}`;
  }

  private updateStatus(): void {
    if (this.finished) return;
    this.statusText.setText(`${this.roundLabel()} · Remaining: ${this.tracker.remaining.length}`);
  }

  private buildMenuLink(): void {
    const leave = () => this.scene.start('Menu');
    this.add
      .text(PANEL_X, 8, '< Menu (Esc)', {
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: '#323859',
        padding: { x: 10, y: 5 },
      })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', leave);
    this.input.keyboard?.once('keydown-ESC', leave);
  }

  /** Left-hand list: one row per qualifying round plus the finale, filled in as winners are known. */
  private buildPanel(fieldSize: number): void {
    const { rounds, winners, champion } = this.tournament;
    this.add.text(PANEL_X, 42, 'Round winners', {
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold',
    });

    for (let i = 0; i <= rounds; i++) {
      const y = PANEL_ROW_Y + i * PANEL_ROW_HEIGHT;
      const label = i < rounds ? `Round ${i + 1}` : 'Final';
      const text = this.add.text(PANEL_X + 44, y, '', {
        fontSize: '20px',
        color: '#ffffff',
        wordWrap: { width: PANEL_TEXT_WIDTH - 44 },
      });
      this.panelRows.push({ icon: null, text });
      const winner = i < rounds ? winners[i] : champion;
      this.setPanelRow(i, label, winner ?? null);
    }

    const finale = this.tournament.isFinale;
    this.add.text(PANEL_X, OUT_TOP - 4, finale ? 'Final ranking' : 'Eliminated – final place', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    if (finale) {
      this.finalSlots = [];
      for (let place = 1; place <= fieldSize; place++) {
        this.finalSlots.push(
          this.add.text(PANEL_X + FINAL_FLAG_SIZE + 12, this.finalRowY(place) - 14, `${place}. ?`, {
            fontSize: '22px',
            color: '#6b6f85',
            wordWrap: { width: PANEL_TEXT_WIDTH - FINAL_FLAG_SIZE - 12 },
          }),
        );
      }
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
    const x = PANEL_X + OUT_CELL_W * (col + 0.5) + 4;
    const y = OUT_TOP + 26 + row * OUT_CELL_H;
    this.add.image(x, y, `marble-${code}`).setDisplaySize(OUT_FLAG_SIZE, OUT_FLAG_SIZE);
    this.add
      .text(x, y + OUT_FLAG_SIZE / 2 + 1, String(place), {
        fontSize: '11px',
        color: place === 1 ? '#ffd166' : '#aab0c8',
      })
      .setOrigin(0.5, 0);
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
      this.statusText.setText(`Champion: ${countryName(code)} – click to return to the menu`);
    } else {
      this.statusText.setText(`${label} – winner: ${countryName(code)}`);
    }

    if (img) {
      this.onWinner(img);
      img.setStatic(true);
      this.tweens.add({
        targets: img,
        x: this.arenaCenter.x,
        y: this.arenaCenter.y,
        scale: img.scale * 3,
        duration: 800,
        ease: 'Sine.easeInOut',
      });
    }

    if (this.tournament.isComplete) {
      this.input.once('pointerdown', () => this.scene.start('Menu'));
    } else {
      this.time.delayedCall(NEXT_ROUND_DELAY, () =>
        this.scene.restart({ tournament: this.tournament }),
      );
    }
  }
}
