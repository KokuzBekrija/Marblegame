# Architecture

- **Phaser 3 + Matter.js** – rendering and 2D physics (bundled with Phaser).
- **src/core** – pure rules (elimination, scoring). No Phaser imports → unit-tested with Vitest.
- **src/levels** – data-driven `LevelConfig` (`ring` = rotating ring, `drop` = marble drop). A scene builds the world from config.
- **src/scenes** – Boot (asset loading) → Menu (pick a game) → Arena (rotating ring) or Drop (marble drop). Both modes extend `TournamentScene`, which holds the shared tournament flow, collision response and panels.
- **src/data** – countries list; flags are SVGs in `public/flags`.
- **tests/unit** – Vitest; **tests/e2e** – Playwright smoke tests.
- **CI** – lint, typecheck, unit + e2e on every PR; deploy to GitHub Pages from `main`.

## Roadmap
1. Ring level: build ring from arc segments with gaps, rotate it, detect marbles leaving → eliminate.
2. Race level: start line, obstacles, finish detection, ranking.
3. Menu, level select, marble count, winner screen, sound.
4. Determinism option (seeded RNG) for fair replays/tests.
