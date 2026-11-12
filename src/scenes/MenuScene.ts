import Phaser from 'phaser';
import { Sfx, soundLabel, toggleMute } from '../audio/sfx';
import { CANVAS_HEIGHT, DEFAULT_CANVAS_WIDTH as WIDTH } from './TournamentScene';

interface GameChoice {
  scene: string;
  title: string;
  description: string;
}

const GAMES: GameChoice[] = [
  {
    scene: 'Arena',
    title: 'Rotating ring',
    description:
      'Flags bounce around inside a spinning ring and are out when they slip through a hole.',
  },
  {
    scene: 'Drop',
    title: 'Marble drop',
    description:
      'Flags ride up a tube and drop into a field of pegs. Red holes eliminate them, green holes send them back to the start.',
  },
  {
    scene: 'Race',
    title: 'Marble race',
    description:
      'All flags start together and race down a long track of slides, windmills and bumpers. The first across the finish line wins.',
  },
];

/** Start screen: the player picks which game to play. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    this.scale.setGameSize(WIDTH, CANVAS_HEIGHT); // the ring game uses a wider canvas
    this.add
      .text(WIDTH / 2, 150, 'Flag Marbles', {
        fontSize: '72px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(WIDTH / 2, 230, 'Choose a game', { fontSize: '28px', color: '#9aa0c0' })
      .setOrigin(0.5);

    const sound = this.add
      .text(WIDTH - 24, 24, soundLabel(this), {
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#323859',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    const toggle = () => {
      toggleMute(this);
      sound.setText(soundLabel(this));
      new Sfx(this).click();
    };
    sound.on('pointerdown', toggle);
    this.input.keyboard?.on('keydown-M', toggle);

    GAMES.forEach((game, i) => this.addButton(game, WIDTH / 2 + (i - 1) * 390, 520));
  }

  private addButton(game: GameChoice, x: number, y: number): void {
    const box = this.add
      .rectangle(x, y, 370, 400, 0x262a40)
      .setStrokeStyle(3, 0x6c7bd9)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y - 130, game.title, { fontSize: '36px', color: '#ffffff' }).setOrigin(0.5);
    this.add
      .text(x, y + 10, game.description, {
        fontSize: '21px',
        color: '#b8bfe8',
        align: 'center',
        wordWrap: { width: 320 },
      })
      .setOrigin(0.5);
    this.add
      .text(x, y + 150, 'Click to play', { fontSize: '24px', color: '#ffd166' })
      .setOrigin(0.5);

    box.on('pointerover', () => box.setFillStyle(0x323859));
    box.on('pointerout', () => box.setFillStyle(0x262a40));
    box.on('pointerdown', () => {
      new Sfx(this).click();
      this.scene.start(game.scene);
    });
  }
}
