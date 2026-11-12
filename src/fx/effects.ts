import Phaser from 'phaser';

export const SPARK_TEXTURE = 'spark';
const DEPTH = 20; // above marbles and obstacles
const CONFETTI = [0xffd166, 0x6c7bd9, 0x4fc3a1, 0xd64545, 0xffffff];

/** Creates the small round texture the particle effects are made of. */
export function makeSparkTexture(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(4, 4, 4);
  g.generateTexture(SPARK_TEXTURE, 8, 8);
  g.destroy();
}

/** Visual effects: sparks when a marble is out, confetti and a pulse for winners. */
export class Effects {
  constructor(private readonly scene: Phaser.Scene) {}

  /** A puff of sparks, e.g. where a marble drops out. */
  burst(x: number, y: number, color: number, count = 14): void {
    this.explode(x, y, count, {
      speed: { min: 60, max: 220 },
      lifespan: 450,
      scale: { start: 1, end: 0 },
      tint: color,
    });
  }

  /** Confetti and an expanding ring around the winner of a round; bigger for the champion. */
  winner(x: number, y: number, champion: boolean): void {
    this.explode(x, y, champion ? 220 : 90, {
      speed: { min: 180, max: champion ? 620 : 420 },
      lifespan: champion ? 2200 : 1400,
      gravityY: 320,
      scale: { start: 2.2, end: 0.4 },
      tint: CONFETTI,
    });
    const ring = this.scene.add
      .circle(x, y, 24)
      .setStrokeStyle(5, 0xffd166)
      .setDepth(DEPTH)
      .setAlpha(0.9);
    this.scene.tweens.add({
      targets: ring,
      scale: champion ? 18 : 10,
      alpha: 0,
      duration: champion ? 1100 : 750,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
    const camera = this.scene.cameras.main;
    camera.flash(champion ? 350 : 200, 255, 255, 255, true);
    if (champion) camera.shake(400, 0.004);
  }

  private explode(
    x: number,
    y: number,
    count: number,
    config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
  ): void {
    const emitter = this.scene.add
      .particles(x, y, SPARK_TEXTURE, { ...config, angle: { min: 0, max: 360 }, emitting: false })
      .setDepth(DEPTH);
    emitter.explode(count);
    // The particles are gone after their lifespan; then the emitter itself can go too.
    const life = config.lifespan;
    this.scene.time.delayedCall(typeof life === 'number' ? life + 200 : 2500, () =>
      emitter.destroy(),
    );
  }
}
