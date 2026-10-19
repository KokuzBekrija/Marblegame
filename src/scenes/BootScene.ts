import Phaser from 'phaser';
import { COUNTRIES } from '../data/countries';

/** Loads assets (flag SVGs from public/flags) and starts the first level. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    for (const c of COUNTRIES) {
      this.load.svg(`flag-${c.code}`, `flags/${c.code}.svg`, { width: 64, height: 64 });
    }
  }

  /** Bakes each square flag into a circular `marble-<code>` texture. */
  private makeMarbleTextures(size = 64): void {
    for (const c of COUNTRIES) {
      const canvas = this.textures.createCanvas(`marble-${c.code}`, size, size);
      if (!canvas) continue;
      const ctx = canvas.getContext();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(
        this.textures.get(`flag-${c.code}`).getSourceImage() as CanvasImageSource,
        0,
        0,
        size,
        size,
      );
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 3;
      ctx.stroke();
      canvas.refresh();
    }
  }

  create(): void {
    this.makeMarbleTextures();
    this.scene.start('Arena', { levelId: 'arena-ring' });
  }
}
