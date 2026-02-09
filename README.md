# jGoBoard v5

Modular JavaScript toolkit for Go (Baduk/Weiqi): board state, rules engine, variation tree, SGF IO, renderer, and embeddable player.

This package is now v5-first. The legacy v4 API (`JGO.Board`, `JGO.Setup`, `JGO.Record`, etc.) is no longer the primary API surface.

## Installation

```bash
npm install jgoboard
```

## Quick Start

```js
import { createBoard, STONE, createRenderer } from 'jgoboard';

const board = createBoard({ size: 19 });
board.setStone('D4', STONE.BLACK);

const renderer = createRenderer('#board', {
  board,
  theme: 'kaya-medium',
});

await renderer.whenReady();
renderer.render();
```

## Module Entry Points

```js
import { createBoard, createGameTree, createCursor } from 'jgoboard';
// or subpaths
import { createGame, rules } from 'jgoboard/core';
import { createRenderer } from 'jgoboard/renderer';
import { kayaMedium } from 'jgoboard/presets';
import { parseSgf, gameTreeFromSgf, sgfFromGameTree } from 'jgoboard/sgf';
import { createPlayer } from 'jgoboard/player';
```

## Documentation

- [Renderer API](docs/renderer.md)
- [Gameplay API](docs/gameplay.md)
- [GameTree + Cursor API](docs/game-tree.md)
- [SGF API](docs/sgf.md)
- [Player API](docs/player.md)
- [Migration: v4 to v5](docs/migration-v4-to-v5.md)

## Demos

- `demoV5Renderer.html`
- `demoV5Layers.html`
- `demoV5Game.html`
- `demoV5Tree.html`
- `demoV5Player.html`

Run demos in dev mode:

```bash
npm install
npm run dev
```

Then open for example `http://localhost:5173/demoV5Player.html`.

## Development

```bash
npm run dev
npm run build
npm run test
npm run lint
npm run format
```

Build output includes:

- `dist/jgoboard.js` (ESM)
- `dist/jgoboard.cjs` (CJS)
- `dist/jgoboard.umd.min.js` (UMD)
- `dist/core.{js,cjs}`, `dist/renderer.{js,cjs}`, `dist/presets.{js,cjs}`, `dist/sgf.{js,cjs}`, `dist/player.{js,cjs}`
- `dist/*.d.ts`

## License

Creative Commons Attribution-NonCommercial 4.0 International (`CC-BY-NC-4.0`).

- [LICENSE.txt](LICENSE.txt)
- [License deed](http://creativecommons.org/licenses/by-nc/4.0/deed.en_US)
