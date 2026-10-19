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

  create(): void {
    this.scene.start('Arena', { levelId: 'arena-ring' });
  }
}
