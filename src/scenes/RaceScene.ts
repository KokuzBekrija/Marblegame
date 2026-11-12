import Phaser from 'phaser';
import { MARBLE_RADIUS } from '../core/spawn';
import type { Point } from '../core/spawn';
import { ContinentTournament } from '../core/continent-tournament';
import type { TournamentLike } from '../core/tournament';
import { CONTINENTS } from '../data/continents';
import { raceTrack } from '../levels/race-track';
import { CANVAS_HEIGHT, TournamentScene, countryName } from './TournamentScene';

const MAX_SPEED = 12; // px per physics step; keeps fast marbles from tunnelling through bars
const COUNTDOWN_MS = 3000;
const PEN_COLUMNS = 20;
const PEN_SPACING = 34; // between rows; a marble is 32px wide
const LEADER_SCREEN_Y = 0.45; // the leader is kept at this fraction of the screen height
const CAMERA_FOLLOW = 3; // 1/s; how quickly the camera catches up with the leader
const MAP_X = 1150; // progress bar on the right: x, top and bottom
const MAP_TOP = 90;
const MAP_BOTTOM = 990;
const QUIET_ABOVE = 12; // more marbles than this are ranked without sparks and sounds
const TRACK_COLOR = 0x20243a;
const ORDINALS = ['1st', '2nd', '3rd'];

const { bounds, finishY, worldHeight, pen } = raceTrack;
const CENTER_X = (bounds.left + bounds.right) / 2;
const WIDTH = bounds.right - bounds.left;

/**
 * Marble-race mode: all marbles start together in a pen at the top of a long track (ramps,
 * funnels, windmills, a field of bumpers) and the camera follows the leader. One round per
 * continent: the first three marbles across the finish line advance, the others are ranked by
 * how far they got. The finale is won by the first of the qualified marbles.
 */
export class RaceScene extends TournamentScene {
  protected readonly level = raceTrack;
  protected readonly wallRestitution = 0.5;
  protected readonly marbleRestitution = 0.5;
  protected readonly restSpeed = 0.7;
  protected readonly marbleFrictionAir = 0.02;
  protected readonly bounceScatter = 0.15;
  private countdownMs = COUNTDOWN_MS;
  private countdownText!: Phaser.GameObjects.Text;
  private leaderRing!: Phaser.GameObjects.Arc;
  private map!: Phaser.GameObjects.Graphics;
  private leader: string | null = null;
  private crossed = new Set<string>(); // marbles over the finish line, in no particular order

  constructor() {
    super('Race');
  }

  /** The middle of what the camera shows. */
  protected get arenaCenter(): Point {
    return { x: CENTER_X, y: this.cameras.main.scrollY + CANVAS_HEIGHT / 2 };
  }

  protected buildWorld(): void {
    this.countdownMs = COUNTDOWN_MS;
    this.leader = null;
    this.crossed.clear();
    this.anchors.clear();
    this.cameras.main.setScroll(0, 0);
    this.matter.world.setGravity(0, this.level.gravity);
    this.add.rectangle(CENTER_X, worldHeight / 2, WIDTH, worldHeight, TRACK_COLOR).setDepth(-10);
    this.drawFinish();
    this.buildObstacles();
    this.buildSpinners(this.level.spinners);
    this.leaderRing = this.add.circle(0, 0, MARBLE_RADIUS + 5).setStrokeStyle(4, 0xffd166);
    this.leaderRing.setDepth(5).setVisible(false);
    this.map = this.add.graphics().setScrollFactor(0).setDepth(20);
    this.countdownText = this.add
      .text(CENTER_X, CANVAS_HEIGHT * 0.4, '', {
        fontSize: '140px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#1b1d2a',
        strokeThickness: 12,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20);
  }

  /** The marbles stand in rows in the pen, the first row on the bottom. */
  protected spawnPoints(count: number): Point[] {
    const columns = Math.min(PEN_COLUMNS, count);
    const spacing = Math.min(WIDTH / columns, 80);
    return Array.from({ length: count }, (_, i) => ({
      x: CENTER_X + ((i % columns) - (columns - 1) / 2) * spacing,
      y: pen.bottom - MARBLE_RADIUS - Math.floor(i / columns) * PEN_SPACING,
    }));
  }

  protected initialVelocity(): { x: number; y: number } {
    return { x: 0, y: 0 };
  }

  /** Until the start the marbles are held in place. */
  protected afterSpawn(): void {
    for (const img of this.marbles.values()) img.setStatic(true);
  }

  protected statusDetail(): string {
    if (this.countdownMs > 0) return 'Get ready';
    const need = this.tournament.advancing;
    const parts = [this.leader ? `Leader: ${countryName(this.leader)}` : ''];
    if (need > 1) parts.push(`Finished ${this.crossed.size}/${need}`);
    return parts.filter(Boolean).join(' · ');
  }

  protected newTournament(): TournamentLike {
    return new ContinentTournament(CONTINENTS, 3);
  }

  protected stepWorld(delta: number): void {
    this.stepSpinners(delta);
    if (this.countdownMs > 0) {
      this.countdown(delta);
      return;
    }
    let leaderY = -Infinity;
    let leader: string | null = null;
    for (const [code, img] of this.marbles) {
      if (this.crossed.has(code)) continue; // done: it rolls out on the floor below the line
      this.keepOnTrack(img);
      if (img.y > finishY) {
        this.cross(code, img);
        if (this.crossed.size >= this.tournament.advancing) {
          this.endRace();
          return;
        }
        continue;
      }
      const v = img.body!.velocity;
      const speed = Math.hypot(v.x, v.y);
      if (speed > MAX_SPEED) {
        img.setVelocity((v.x / speed) * MAX_SPEED, (v.y / speed) * MAX_SPEED);
      }
      this.nudgeIfStuck(code, img, delta);
      if (img.y > leaderY) {
        leaderY = img.y;
        leader = code;
      }
    }
    this.leader = leader;
    this.followLeader(leaderY, delta);
    this.drawMap();
  }

  /** A marble crosses the line: it keeps its place and a label shows which place it was. */
  private cross(code: string, img: Phaser.Physics.Matter.Image): void {
    this.crossed.add(code);
    this.tracker.markFinished(code);
    const place = this.crossed.size;
    if (this.tournament.advancing === 1) return;
    this.fx.burst(img.x, finishY, 0xffd166, 10);
    this.sfx.recycled();
    const label = this.add
      .text(img.x, finishY - 30, ORDINALS[place - 1] ?? `${place}th`, {
        fontSize: '30px',
        color: '#ffd166',
        fontStyle: 'bold',
        stroke: '#1b1d2a',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(8);
    this.tweens.add({
      targets: label,
      y: label.y - 50,
      alpha: 0,
      delay: 600,
      duration: 900,
      onComplete: () => label.destroy(),
    });
  }

  private countdown(delta: number): void {
    this.countdownMs -= delta;
    if (this.countdownMs <= 0) {
      this.start();
      return;
    }
    const step = Math.ceil(this.countdownMs / 1000);
    if (this.countdownText.text !== String(step)) {
      this.countdownText.setText(String(step));
      this.sfx.click();
    }
  }

  private start(): void {
    this.countdownText.setText('GO!');
    this.sfx.roundWon();
    this.tweens.add({
      targets: this.countdownText,
      alpha: 0,
      duration: 700,
      delay: 300,
      onComplete: () => this.countdownText.destroy(),
    });
    for (const img of this.marbles.values()) {
      img.setStatic(false).setVelocity(Phaser.Math.FloatBetween(-1, 1), 0);
    }
  }

  /** A marble that was squeezed through a wall is put back inside the track. */
  private keepOnTrack(img: Phaser.Physics.Matter.Image): void {
    const min = bounds.left + MARBLE_RADIUS;
    const max = bounds.right - MARBLE_RADIUS;
    if (img.x < min || img.x > max) {
      img.setPosition(Phaser.Math.Clamp(img.x, min, max), img.y);
      img.setVelocityX(0);
    }
  }

  /** The camera only ever moves down, and a little behind the leader so the track ahead shows. */
  private followLeader(leaderY: number, delta: number): void {
    const camera = this.cameras.main;
    const target = Phaser.Math.Clamp(
      leaderY - CANVAS_HEIGHT * LEADER_SCREEN_Y,
      0,
      worldHeight - CANVAS_HEIGHT,
    );
    if (target > camera.scrollY) {
      camera.scrollY += (target - camera.scrollY) * (1 - Math.exp((-delta / 1000) * CAMERA_FOLLOW));
    }
    const lead = this.leader ? this.marbles.get(this.leader) : undefined;
    this.leaderRing.setVisible(!!lead);
    if (lead) this.leaderRing.setPosition(lead.x, lead.y);
  }

  /** Enough marbles are over the line: the rest are ranked by how far they got. */
  private endRace(): void {
    const behind = [...this.marbles.entries()]
      .filter(([code]) => !this.crossed.has(code))
      .sort(([, a], [, b]) => a.y - b.y); // the one furthest back is out first
    const quiet = behind.length > QUIET_ABOVE;
    for (const [code] of behind) this.eliminate(code, 0xffffff, quiet);
    this.leaderRing.setVisible(false);
    this.map.clear();
  }

  /** Progress bar at the right edge with a dot for every marble. */
  private drawMap(): void {
    const g = this.map;
    g.clear();
    g.fillStyle(0x4a5280);
    g.fillRect(MAP_X - 2, MAP_TOP, 4, MAP_BOTTOM - MAP_TOP);
    g.fillStyle(0xffffff);
    g.fillRect(MAP_X - 12, MAP_BOTTOM - 2, 24, 4);
    const at = (y: number) =>
      MAP_TOP + Phaser.Math.Clamp(y / finishY, 0, 1) * (MAP_BOTTOM - MAP_TOP);
    g.fillStyle(0xb8bfe8, 0.7);
    for (const [code, img] of this.marbles) {
      if (code !== this.leader) g.fillCircle(MAP_X, at(img.y), 3);
    }
    const lead = this.leader ? this.marbles.get(this.leader) : undefined;
    if (lead) {
      g.fillStyle(0xffd166);
      g.fillCircle(MAP_X, at(lead.y), 7);
    }
  }

  /** Chequered line across the track. */
  private drawFinish(): void {
    const g = this.add.graphics().setDepth(-5);
    const size = 14;
    const columns = Math.ceil(WIDTH / size);
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < columns; col++) {
        g.fillStyle((row + col) % 2 === 0 ? 0xffffff : 0x1b1d2a);
        g.fillRect(bounds.left + col * size, finishY - size + row * size, size, size);
      }
    }
    this.add
      .text(CENTER_X, finishY + 36, 'FINISH', {
        fontSize: '48px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(-5);
  }
}
