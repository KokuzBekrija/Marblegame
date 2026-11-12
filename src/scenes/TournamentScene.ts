import Phaser from 'phaser';
import { Sfx, soundLabel, toggleMute } from '../audio/sfx';
import { COUNTRIES } from '../data/countries';
import { Effects } from '../fx/effects';
import { EliminationTracker } from '../core/elimination';
import { MARBLE_RADIUS } from '../core/spawn';
import type { Point } from '../core/spawn';
import { Tournament } from '../core/tournament';
import type { LevelConfig } from '../levels/types';

const MARBLE_TEXTURE_SIZE = 64; // must match makeMarbleTextures in BootScene
export const DEFAULT_CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 1070;
const NEXT_ROUND_DELAY = 4500; // ms the winner stays on screen
// Bumpers (pinball style): they throw marbles away from them, which mixes the marbles up.
const BUMPER_RESTITUTION = 1.15; // above 1: the marble leaves faster than it came
const BUMPER_KICK = 3.5; // px/step; least speed away from a bumper
const BUMPER_SCATTER = 0.5; // rad; largest random turn after a bumper hit
type BumperPlugin = { bumper?: Phaser.GameObjects.Arc };
const WINNER_SCALE = 5; // the winner's flag is enlarged to this many times its size
const BANNER_WIDTH = 640; // longer country names wrap to a second line
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
  protected sfx!: Sfx;
  protected fx!: Effects;
  private panelRows: { icon: Phaser.GameObjects.Image | null; text: Phaser.GameObjects.Text }[] =
    [];
  private statusText!: Phaser.GameObjects.Text;
  private outCount = 0;
  private finalSlots: Phaser.GameObjects.Text[] = [];

  protected abstract readonly level: LevelConfig;
  /** Width of the game canvas in this mode; a mode may need more room for its arena. */
  protected get canvasWidth(): number {
    return DEFAULT_CANVAS_WIDTH;
  }
  /** Where the status line is centered and where the round winner glides to. */
  protected abstract readonly arenaCenter: Point;
  /** Fraction of the normal velocity kept after bouncing off a wall (1 = perfectly elastic). */
  protected abstract readonly wallRestitution: number;
  /** Same for two marbles hitting each other. */
  protected abstract readonly marbleRestitution: number;
  /** Impacts slower than this (px/step) do not bounce, so resting marbles do not jitter. */
  protected abstract readonly restSpeed: number;
  protected abstract readonly marbleFrictionAir: number;
  /** Largest random turn (rad) of a marble's direction when it bounces off a wall; 0 = none. */
  protected readonly bounceScatter: number = 0;

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
    this.scale.setGameSize(this.canvasWidth, CANVAS_HEIGHT);
    this.sfx = new Sfx(this);
    this.fx = new Effects(this);
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
      .setOrigin(0.5, 0)
      .setDepth(10); // stays readable when a marble leaves the arena right under it
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

  /** Removes a marble from play, with a puff of sparks in `color`, and lists its final place. */
  protected eliminate(code: string, color = 0xffffff): void {
    const img = this.marbles.get(code);
    if (img) this.fx.burst(img.x, img.y, color);
    this.sfx.eliminated();
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
        const body = this.matter.add.circle(o.x, o.y, o.w / 2, opts);
        if (o.bumper) {
          const view = this.add.circle(o.x, o.y, o.w / 2, 0xff6fa8).setStrokeStyle(3, 0xffc1d8);
          (body as unknown as { plugin: BumperPlugin }).plugin.bumper = view;
        } else {
          this.add.circle(o.x, o.y, o.w / 2, 0xb8bfe8);
        }
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
    const bumper = ((wall.parent ?? wall) as unknown as { plugin?: BumperPlugin }).plugin?.bumper;
    const e = bumper ? BUMPER_RESTITUTION : -vn < this.restSpeed ? 0 : this.wallRestitution;
    let nx = vx - (1 + e) * vn * n.x;
    let ny = vy - (1 + e) * vn * n.y;
    if (bumper) {
      // Even a light touch launches the marble: top up the speed away from the bumper.
      const away = nx * n.x + ny * n.y;
      if (away < BUMPER_KICK) {
        nx += (BUMPER_KICK - away) * n.x;
        ny += (BUMPER_KICK - away) * n.y;
      }
    }
    const scatter = bumper ? BUMPER_SCATTER : this.bounceScatter;
    if (e > 0 && scatter > 0) {
      // A real bounce is never perfectly predictable. A little random turn keeps marbles that
      // start almost identically from always following the same path through the obstacles.
      const turn = (Math.random() * 2 - 1) * scatter;
      const cos = Math.cos(turn);
      const sin = Math.sin(turn);
      const rx = nx * cos - ny * sin;
      const ry = nx * sin + ny * cos;
      // Never turn a marble back into the wall it has just left.
      if ((rx - w.x) * n.x + (ry - w.y) * n.y > 0) {
        nx = rx;
        ny = ry;
      }
    }
    marble.setVelocity(nx, ny);
    if (bumper) this.hitBumper(bumper, contact);
    else this.sfx.hit(-vn, w.x !== 0 || w.y !== 0 ? 'clank' : 'tick');
  }

  /** A bumper swells for a moment, throws a few sparks and boings (once per swell). */
  private hitBumper(view: Phaser.GameObjects.Arc, contact: Vec): void {
    this.sfx.bumper();
    if (view.getData('swelling')) return;
    view.setData('swelling', true);
    this.fx.burst(contact.x, contact.y, 0xff6fa8, 3);
    this.tweens.add({
      targets: view,
      scale: 1.5,
      duration: 70,
      yoyo: true,
      onComplete: () => view.setData('swelling', false),
    });
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
    this.sfx.hit(approach * 0.7); // marbles click softer than walls
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

    const sound = this.add
      .text(PANEL_X + 150, 8, soundLabel(this), {
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: '#323859',
        padding: { x: 10, y: 5 },
      })
      .setInteractive({ useHandCursor: true });
    const toggle = () => {
      toggleMute(this);
      sound.setText(soundLabel(this));
    };
    sound.on('pointerdown', toggle);
    this.input.keyboard?.on('keydown-M', toggle);
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
      const text = `${label} – ${countryName(code)}`;
      // A long name takes two lines; a smaller font keeps them inside the row.
      row.text
        .setText(text)
        .setColor('#ffffff')
        .setFontSize(text.length > 28 ? 16 : 20);
    } else {
      row.text.setText(`${label} – ?`).setColor('#6b6f85').setFontSize(20);
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

  /**
   * Makes the winner stand out: a gold ring around the enlarged flag, a caption above it and
   * the name of the country in big letters below it. They pop in once the flag has arrived.
   */
  private showWinnerBanner(code: string, caption: string, champion: boolean): void {
    const { x, y } = this.arenaCenter;
    const reach = MARBLE_RADIUS * WINNER_SCALE; // radius of the enlarged flag
    const outline = { stroke: '#1b1d2a', strokeThickness: 8 };
    const ring = this.add.circle(x, y, reach + 5).setStrokeStyle(6, 0xffd166);
    const top = this.add
      .text(x, y - reach - 16, caption, {
        fontSize: champion ? '40px' : '30px',
        color: '#ffd166',
        fontStyle: 'bold',
        ...outline,
      })
      .setOrigin(0.5, 1);
    const name = this.add
      .text(x, y + reach + 16, countryName(code), {
        fontSize: champion ? '60px' : '48px',
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: BANNER_WIDTH },
        ...outline,
      })
      .setOrigin(0.5, 0);
    for (const target of [ring, top, name]) {
      target.setDepth(15).setAlpha(0).setScale(0.6);
      this.tweens.add({
        targets: target,
        alpha: 1,
        scale: 1,
        duration: 450,
        delay: 350,
        ease: 'Back.easeOut',
      });
    }
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
      // The name is in the banner; a long name here would run off the screen.
      this.statusText.setText('Champion – click to return to the menu');
    } else {
      this.statusText.setText(`${label} – winner: ${countryName(code)}`);
    }

    const champion = this.tournament.isComplete;
    this.fx.winner(this.arenaCenter.x, this.arenaCenter.y, champion);
    if (champion) this.sfx.champion();
    else this.sfx.roundWon();

    if (img) {
      this.onWinner(img);
      img.setStatic(true);
      this.tweens.add({
        targets: img,
        x: this.arenaCenter.x,
        y: this.arenaCenter.y,
        scale: img.scale * WINNER_SCALE,
        duration: 800,
        ease: 'Sine.easeInOut',
      });
    }
    this.showWinnerBanner(code, champion ? 'CHAMPION' : `ROUND ${rowIndex + 1} WINNER`, champion);

    if (this.tournament.isComplete) {
      this.input.once('pointerdown', () => this.scene.start('Menu'));
    } else {
      this.time.delayedCall(NEXT_ROUND_DELAY, () =>
        this.scene.restart({ tournament: this.tournament }),
      );
    }
  }
}
