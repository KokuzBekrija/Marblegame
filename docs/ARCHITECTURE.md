# Architecture

- **Phaser 3 + Matter.js** – rendering and 2D physics (bundled with Phaser).
- **src/core** – pure rules (elimination, scoring). No Phaser imports → unit-tested with Vitest.
- **src/levels** – data-driven `LevelConfig` (`ring` = rotating ring, `drop` = marble drop). A scene builds the world from config. The drop level defines the floor `holes` (red = eliminated, green = recycled) and the conveyor `tube`.
- **src/scenes** – Boot (asset loading) → Menu (pick a game) → Arena (rotating ring), Drop (marble drop) or Race (marble race). All modes extend `TournamentScene`, which holds the shared tournament flow, collision response and panels.
- **Marble drop flow** – `DropScene` keeps marbles that are not in the arena (waiting, riding up the tube, returning from a green hole) parked: static, without collisions, moved along a polyline (`core/path.ts`) by hand. One marble enters the tube every 300 ms, in shuffled order; a marble that falls through a green hole rides the channel back and queues up again. The level's `spinners` are windmills: static compound bodies turned by hand every frame; `TournamentScene.wallVelocityAt` lets a turning bar fling the marbles it hits.
- **Mixing in Marble drop** – a marble that falls straight down ends up in the hole under it, so releasing marbles across the width made the exit predictable (what is released at the end leaves through the last hole). Marbles are therefore all released at the center and spread by chance: windmills (the center one reverses its direction, otherwise it throws everything to one side), a Galton board of pinball _bumpers_ (`Obstacle.bumper`: kick plus random turn, see `bounceOffWall`) and a small random turn on every bounce (`bounceScatter`). In simulation the six holes get 13–23 % of the marbles each.
- **Marble race** – `RaceScene` plays on `levels/race-track.ts`: a 5500px tall track (slides, funnels, windmills, a field of bumpers) that the camera follows. All marbles stand in a pen, frozen (static) during a 3 s countdown. The tournament is a `ContinentTournament` (`core/continent-tournament.ts`, groups in `data/continents.ts`): one round per continent, the first 3 marbles across `finishY` advance, and the 18 qualified marbles race in the finale. The scene talks to either tournament through `TournamentLike`, and `EliminationTracker` takes the number of survivors; the marbles beyond the qualifiers are ranked by how far they got (the furthest back is eliminated first, quietly when there are many). UI objects use `setScrollFactor(0)` so they stay on screen, and the winner banner is placed in screen coordinates. Windmills (`buildSpinners`) and `nudgeIfStuck` are shared with Marble drop in `TournamentScene`.
- **Sound and effects** – `src/audio/sfx.ts` synthesizes all sounds with WebAudio (no audio files) through Phaser's sound manager, so the browser's autoplay lock and the mute switch (button or key M, saved in localStorage) apply. Pure parameters and the voice limiter (`core/sound-params.ts`) are unit-tested. `src/fx/effects.ts` has the particle effects (sparks, confetti) and the winner pulse; `TournamentScene` triggers both on hits, eliminations and winners.
- **src/data** – countries list; flags are SVGs in `public/flags`.
- **tests/unit** – Vitest; **tests/e2e** – Playwright smoke tests.
- **CI** – lint, typecheck, unit + e2e on every PR; deploy to GitHub Pages from `main`.

## Roadmap

1. Ring level: build ring from arc segments with gaps, rotate it, detect marbles leaving → eliminate.
2. Race level: start line, obstacles, finish detection, ranking.
3. Menu, level select, marble count, winner screen, sound.
4. Determinism option (seeded RNG) for fair replays/tests.
