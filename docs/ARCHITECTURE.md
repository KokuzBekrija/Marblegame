# Architecture

- **Phaser 3 + Matter.js** – rendering and 2D physics (bundled with Phaser).
- **src/core** – pure rules (elimination, scoring). No Phaser imports → unit-tested with Vitest.
- **src/levels** – data-driven `LevelConfig` (`ring` = rotating ring, `drop` = marble drop). A scene builds the world from config. The drop level defines the floor `holes` (red = eliminated, green = recycled) and the conveyor `tube`.
- **src/scenes** – Boot (asset loading) → Menu (pick a game) → Arena (rotating ring) or Drop (marble drop). Both modes extend `TournamentScene`, which holds the shared tournament flow, collision response and panels.
- **Marble drop flow** – `DropScene` keeps marbles that are not in the arena (waiting, riding up the tube, returning from a green hole) parked: static, without collisions, moved along a polyline (`core/path.ts`) by hand. One marble enters the tube every 300 ms, in shuffled order; a marble that falls through a green hole rides the channel back and queues up again. The level's `spinners` are windmills: static compound bodies turned by hand every frame; `TournamentScene.wallVelocityAt` lets a turning bar fling the marbles it hits.
- **src/data** – countries list; flags are SVGs in `public/flags`.
- **tests/unit** – Vitest; **tests/e2e** – Playwright smoke tests.
- **CI** – lint, typecheck, unit + e2e on every PR; deploy to GitHub Pages from `main`.

## Roadmap
1. Ring level: build ring from arc segments with gaps, rotate it, detect marbles leaving → eliminate.
2. Race level: start line, obstacles, finish detection, ranking.
3. Menu, level select, marble count, winner screen, sound.
4. Determinism option (seeded RNG) for fair replays/tests.
