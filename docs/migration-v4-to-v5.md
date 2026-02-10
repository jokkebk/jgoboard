# jGoBoard Migration: v4 to v5

This is a short upgrade guide for projects moving from the legacy `JGO.*` API to the v5 modular API.

## What Changed

- v5 is split into focused modules: `core`, `renderer`, `sgf`, `player`, `presets`.
- Rule logic and variation navigation are now explicit (`createGame`, `createGameTree`, `createCursor`).
- Rendering is centered around `createRenderer` + `BoardState`.
- SGF parsing/serialization is first-class and round-trippable.

## API Mapping

| v4 / legacy | v5 replacement |
| --- | --- |
| `new JGO.Board(size)` | `createBoard({ size })` |
| `JGO.BLACK`, `JGO.WHITE`, `JGO.CLEAR` | `STONE.BLACK`, `STONE.WHITE`, `STONE.CLEAR` |
| `JGO.MARK.*` | `MARK.*` |
| `new JGO.Setup(board, JGO.BOARD.large)` | `createRenderer(target, { board, theme: 'kaya-large' })` |
| `JGO.Record` + `JGO.Node` flow | `createGameTree(...)` + `createCursor(tree)` |
| `JGO.sgf.load(...)` / record conversion | `parseSgf(...)`, `gameTreeFromSgf(...)`, `sgfFromGameTree(...)` |
| ad-hoc viewer wiring | `createPlayer(target, { sgf })` |

## Typical Before/After

### Board + Renderer

```js
// v4
const board = new JGO.Board(19);
const setup = new JGO.Setup(board, JGO.BOARD.large);
setup.create('board');
```

```js
// v5
import { createBoard, createRenderer } from 'jgoboard';

const board = createBoard({ size: 19 });
const renderer = createRenderer('#board', { board, theme: 'kaya-large' });
await renderer.whenReady();
renderer.render();
```

### SGF + Navigation

```js
import { createCursor } from 'jgoboard/core';
import { gameTreeFromSgf } from 'jgoboard/sgf';

const tree = gameTreeFromSgf(sgfText);
const cursor = createCursor(tree);
cursor.next();
```

## Import Strategy

You can import from the root package:

```js
import { createBoard, createRenderer, createGameTree, createCursor } from 'jgoboard';
```

Or from subpaths for clearer ownership:

```js
import { createBoard, createGameTree, createCursor } from 'jgoboard/core';
import { createRenderer } from 'jgoboard/renderer';
```

## Notes

- If you still depend on v4 semantics, keep a legacy branch/tag (for example `v4-legacy`) and migrate app-by-app.
- v5 is now available as stable `5.0.0`.
