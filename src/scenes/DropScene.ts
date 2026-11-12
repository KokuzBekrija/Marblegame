import Phaser from 'phaser';
import { nearestHole, pathLength, pointAt } from '../core/path';
import type { Point } from '../core/spawn';
import { dropField } from '../levels/drop-field';
import { TournamentScene } from './TournamentScene';

const MAX_SPEED = 12; // px per physics step; keeps fast marbles from tunnelling through pegs
const RIDE_SPEED = 180; // px/s along the tube
const RIDE_SPACING = 35; // px between marbles in the tube: a marble is 32px wide, so almost touching
const FEED_MS = (RIDE_SPACING / RIDE_SPEED) * 1000; // one marble enters the tube this often
const GOLDEN_CONJUGATE = 0.6180339887; // steps the drop position evenly across the arena
const RELEASE_SPEED = 6; // px/step; largest sideways speed a marble gets when it leaves the rail
const RETURN_SPEED = 300; // px/s along the channel from a green hole back to the tube
const MIN_GAP = 34; // marbles on the return channel keep at least this distance (they are 32px wide)
const GREEN_AT = 30; // px below the floor peaks where a marble counts as inside a green hole
const RED_AT = 40; // ... and where it is out in a red hole
const PIPE_COLOR = 0x20243a;
const RED_HOLE_COLOR = 0xd64545; // sparks of an eliminated marble, like the red pits
const GREEN_HOLE_COLOR = 0x2ecc71;
const ALL_CATEGORIES = 0xffffffff;

const { tube, floorY, holes } = dropField;

interface Traveller {
  code: string;
  s: number; // px travelled along the path
  path: Point[];
  length: number;
}

/**
 * Marble-drop mode: marbles ride up a tube in random order and are released one by one into a
 * field of pegs, bars and rhombi. Falling through a red hole of the floor eliminates a marble,
 * a green hole sends it back to the start of the tube. The last marble left wins.
 *
 * Marbles that are not in the arena (waiting, riding, returning) are parked: static, without
 * collisions, moved along their path by hand.
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
  // Without it, marbles dropped at similar places follow the same lanes and nearly all of them
  // leave through one or two holes.
  protected readonly bounceScatter = 0.3;
  private waiting: string[] = []; // hidden at the tube entrance, in the order they will ride up
  private riding: Traveller[] = [];
  private returning: Traveller[] = [];
  private away = new Set<string>(); // waiting, riding or returning: not in the arena
  private feedMs = 0;
  private dropPhase = 0; // random start of the sequence of drop positions
  private dropCount = 0;
  private waitingText!: Phaser.GameObjects.Text;

  constructor() {
    super('Drop');
  }

  protected buildWorld(): void {
    this.anchors.clear();
    this.waiting = [];
    this.riding = [];
    this.returning = [];
    this.away.clear();
    this.feedMs = FEED_MS;
    this.dropPhase = Math.random();
    this.dropCount = 0;
    this.matter.world.setGravity(0, this.level.gravity);
    this.drawPipes();
    this.buildObstacles();
    this.buildSpinners(this.level.spinners);
    this.waitingText = this.add
      .text(1176, 16, '', { fontSize: '20px', color: '#9aa0c0' })
      .setOrigin(1, 0);
  }

  protected spawnPoints(count: number): Point[] {
    return Array.from({ length: count }, () => ({ x: tube.x, y: tube.bottomY }));
  }

  protected initialVelocity(): { x: number; y: number } {
    return { x: 0, y: 0 };
  }

  /** The marbles start in the order they were shuffled in, all waiting at the tube entrance. */
  protected afterSpawn(): void {
    for (const [code, img] of this.marbles) {
      this.park(img);
      this.waiting.push(code);
      this.away.add(code);
    }
  }

  protected onWinner(marble: Phaser.Physics.Matter.Image): void {
    marble.setVisible(true);
  }

  protected stepWorld(delta: number): void {
    const dt = delta / 1000;
    this.feed(delta);
    this.advance(this.riding, RIDE_SPEED * dt, (t) => this.release(t.code, t.path.at(-1)!.x));
    this.advanceReturning(RETURN_SPEED * dt);
    this.stepSpinners(delta);
    this.updateArena(delta);
    this.waitingText.setText(`Waiting: ${this.waiting.length}`);
  }

  /** Lets the next waiting marble into the tube. */
  private feed(delta: number): void {
    this.feedMs += delta;
    const code = this.waiting[0];
    if (code === undefined) {
      this.feedMs = Math.min(this.feedMs, FEED_MS);
      return;
    }
    if (this.feedMs < FEED_MS) return;
    // Keep the time left over from this frame, so that the spacing in the tube stays exact.
    const overshoot = Math.min(this.feedMs - FEED_MS, FEED_MS);
    this.feedMs = overshoot;
    this.waiting.shift();
    // Up the tube, then along the rail to this marble's drop position.
    const path = [
      { x: tube.x, y: tube.bottomY },
      { x: tube.x, y: tube.topY },
      { x: this.nextDropX(), y: tube.topY },
    ];
    const s = (overshoot / 1000) * RIDE_SPEED;
    const p = pointAt(path, s);
    this.marbles.get(code)?.setPosition(p.x, p.y).setVisible(true);
    this.riding.push({ code, s, path, length: pathLength(path) });
  }

  /**
   * Drop positions follow a golden-ratio sequence from a random start: unpredictable, but
   * consecutive marbles never land next to each other, so the arena fills evenly.
   */
  private nextDropX(): number {
    this.dropCount++;
    const u = (this.dropPhase + this.dropCount * GOLDEN_CONJUGATE) % 1;
    return tube.releaseMinX + u * (tube.releaseMaxX - tube.releaseMinX);
  }

  /** Moves the marbles in the tube along their paths; `arrive` is called for those that reach the end. */
  private advance(list: Traveller[], step: number, arrive: (t: Traveller) => void): void {
    for (let i = list.length - 1; i >= 0; i--) {
      const t = list[i]!;
      t.s += step;
      if (t.s >= t.length) {
        list.splice(i, 1);
        arrive(t);
      } else {
        const p = pointAt(t.path, t.s);
        this.marbles.get(t.code)?.setPosition(p.x, p.y);
      }
    }
  }

  /**
   * The return channel is a one-lane conveyor. A marble first drops down the chute of its hole
   * (vertical part of its path) and then joins the horizontal channel to the tube.
   *
   * - In the same lane (one chute, or the channel) the marbles closest to the tube move first and
   *   each one stops short of the marble in front of it.
   * - A marble at the foot of a chute enters the channel only when there is room: it waits one
   *   marble's width above the channel until no marble is about to pass the junction.
   *
   * So marbles from the same or from different holes never overlap.
   */
  private advanceReturning(step: number): void {
    const dropLength = (t: Traveller) =>
      Math.hypot(t.path[1]!.x - t.path[0]!.x, t.path[1]!.y - t.path[0]!.y);
    const inChannel = (t: Traveller) => t.s >= dropLength(t);
    // Where the marbles in the channel are right now.
    const channel = this.returning.filter(inChannel).map((t) => pointAt(t.path, t.s));
    const placed: { p: Point; channel: boolean }[] = []; // marbles already moved this frame
    const nearestFirst = [...this.returning].sort((a, b) => a.length - a.s - (b.length - b.s));
    for (const t of nearestFirst) {
      const drop = dropLength(t);
      const next = Math.min(t.s + step, t.length);
      const p = pointAt(t.path, next);
      const nextInChannel = next >= drop;
      const stopLine = drop - MIN_GAP;
      const mustYield =
        // Reaching the stop line above the channel: only go on if no marble will pass the junction.
        (t.s < stopLine &&
          next >= stopLine &&
          // Marbles already past the junction are far enough ahead; those still approaching
          // from the left must be at least two marble widths away.
          channel.some((q) => q.x > t.path[1]!.x - 2 * MIN_GAP && q.x < t.path[1]!.x + 1)) ||
        placed.some(
          (q) => q.channel === nextInChannel && Math.hypot(q.p.x - p.x, q.p.y - p.y) < MIN_GAP,
        );
      if (mustYield) {
        placed.push({ p: pointAt(t.path, t.s), channel: inChannel(t) });
        continue;
      }
      t.s = next;
      if (next >= t.length) {
        this.returning.splice(this.returning.indexOf(t), 1);
        this.enqueue(t.code); // swallowed by the feeder at the end of the channel
        continue;
      }
      placed.push({ p, channel: nextInChannel });
      this.marbles.get(t.code)?.setPosition(p.x, p.y);
    }
  }

  /** The marble drops out of the rail at `x` and falls into the arena. */
  private release(code: string, x: number): void {
    const img = this.marbles.get(code);
    if (!img) return;
    img
      .setPosition(x, tube.topY)
      .setStatic(false)
      .setCollidesWith(ALL_CATEGORIES)
      .setVelocity(Phaser.Math.FloatBetween(-RELEASE_SPEED, RELEASE_SPEED), 0);
    this.away.delete(code);
    this.anchors.delete(code);
  }

  /** A marble back at the tube entrance waits for its turn behind the others. */
  private enqueue(code: string): void {
    const img = this.marbles.get(code);
    if (!img) return;
    img.setPosition(tube.x, tube.bottomY).setVisible(false);
    this.waiting.push(code);
  }

  /** Takes a marble out of the physics: it stays where it is until moved by hand. */
  private park(img: Phaser.Physics.Matter.Image): void {
    img
      .setVelocity(0, 0)
      .setStatic(true)
      .setCollidesWith(0)
      .setPosition(tube.x, tube.bottomY)
      .setVisible(false);
  }

  /** A marble fell through a green hole: it rides the channel back to the start of the tube. */
  private startReturn(code: string, img: Phaser.Physics.Matter.Image): void {
    this.fx.burst(img.x, img.y, GREEN_HOLE_COLOR, 9);
    this.sfx.recycled();
    // If the chute is occupied, the marble queues up above the marble in front of it.
    const busy = this.returning.map((t) => pointAt(t.path, t.s));
    let y = img.y;
    while (y > floorY - 20 && busy.some((q) => Math.hypot(q.x - img.x, q.y - y) < MIN_GAP)) {
      y -= 6;
    }
    // The channel ends a marble's width before the tube, so that a marble arriving at the end
    // never overlaps the one that was just fed into the tube.
    const path = [
      { x: img.x, y },
      { x: img.x, y: tube.bottomY },
      { x: tube.x - MIN_GAP, y: tube.bottomY },
    ];
    img.setVelocity(0, 0).setStatic(true).setCollidesWith(0).setPosition(img.x, y);
    this.away.add(code);
    this.anchors.delete(code);
    this.returning.push({ code, s: 0, path, length: pathLength(path) });
  }

  /** Floor holes, speed limit and unsticking for the marbles that are in the arena. */
  private updateArena(delta: number): void {
    for (const [code, img] of this.marbles) {
      if (this.away.has(code)) continue;
      if (img.y > floorY + GREEN_AT) {
        if (nearestHole(holes, img.x).kind === 'green') {
          this.startReturn(code, img);
          continue;
        }
        if (img.y > floorY + RED_AT) {
          this.eliminate(code, RED_HOLE_COLOR);
          if (this.tracker.winner) break;
          continue;
        }
      }
      const v = img.body!.velocity;
      const speed = Math.hypot(v.x, v.y);
      if (speed > MAX_SPEED) {
        img.setVelocity((v.x / speed) * MAX_SPEED, (v.y / speed) * MAX_SPEED);
      }
      this.nudgeIfStuck(code, img, delta);
    }
  }

  /** Draws the tube, its return channel, the red pits and the green chutes. */
  private drawPipes(): void {
    const g = this.add.graphics();
    const half = tube.width / 2;
    const channelStartX = Math.min(...holes.filter((h) => h.kind === 'green').map((h) => h.x));
    const floorBottom = floorY + 24;
    type Rect = [number, number, number, number]; // x, y, width, height
    const rects: Rect[] = [
      [tube.x - half, tube.topY - half, tube.width, tube.bottomY - tube.topY + tube.width], // tube
      [
        tube.releaseMinX - half,
        tube.topY - half,
        tube.x - tube.releaseMinX + tube.width,
        tube.width,
      ], // rail
      [channelStartX - half, tube.bottomY - half, tube.x - channelStartX + tube.width, tube.width], // channel
      ...holes
        .filter((h) => h.kind === 'green')
        .map((h): Rect => [h.x - h.width / 2, floorBottom, h.width, tube.bottomY - floorBottom]),
    ];
    // Outline first, then the fill, so that joints between pipe sections show no seams.
    g.fillStyle(0x6c7bd9);
    for (const [x, y, w, h] of rects) g.fillRoundedRect(x - 3, y - 3, w + 6, h + 6, 10);
    g.fillStyle(PIPE_COLOR);
    for (const [x, y, w, h] of rects) g.fillRoundedRect(x, y, w, h, 8);

    // Red pits catch the eliminated marbles; green mouths mark the way back.
    for (const h of holes) {
      g.fillStyle(h.kind === 'red' ? 0xd64545 : 0x2ecc71);
      g.fillRect(h.x - h.width / 2, floorBottom, h.width, h.kind === 'red' ? 26 : 8);
    }

    // Arrows show the direction of travel.
    g.fillStyle(0x4a5280);
    for (let y = tube.bottomY - 60; y > tube.topY + 40; y -= 90) {
      g.fillTriangle(tube.x, y - 9, tube.x - 9, y + 6, tube.x + 9, y + 6);
    }
    for (let x = tube.x - 80; x > channelStartX + 20; x -= 90) {
      g.fillTriangle(x + 9, tube.bottomY, x - 6, tube.bottomY - 9, x - 6, tube.bottomY + 9);
    }
  }
}
