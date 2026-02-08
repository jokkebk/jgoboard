# jGoBoard v5 GameTree + Cursor API

This document describes variation tree navigation in `src/core/game-tree.js`.

## Modules

```js
import { STONE, createGameTree, createCursor, rules } from 'jgoboard/core';
```

In this repo, local demos import from `./src/index.js`.

## Quick Start

```js
import { createCursor, createGameTree, rules } from './src/core.js';

const tree = createGameTree({
  size: 19,
  rules: rules.japanese({ ko: 'simple', suicide: 'forbidden' }),
});

const cursor = createCursor(tree);

cursor.play('D4');
cursor.play('Q16');
cursor.prev();
cursor.play('C4'); // creates a variation under the same parent
```

## Core Concepts

- `GameTree` stores nodes with stable node IDs (`root`, `n1`, `n2`, ...).
- Each node has a parent and ordered children (variations).
- `GameCursor` is mutable navigation state over one `GameTree`.
- `cursor.board` is a live `BoardState`, so renderer binding is direct.

## `createGameTree(options)`

- `options.size` or `options.width`/`options.height` (required)
- `options.rules`: same rules object used by `createGame`
- `options.startingPlayer`: `STONE.BLACK` (default) or `STONE.WHITE`

GameTree methods:

- `tree.getNode(nodeId?)`
- `tree.getChildren(nodeId?)`
- `tree.getParent(nodeId)`
- `tree.getPath(nodeId)`
- `tree.getNodeCount()`
- `tree.hasNode(nodeId)`

## `createCursor(tree, options?)`

- `options.nodeId`: optional initial node to restore cursor state

Cursor methods:

- `cursor.play(vertexOrPoint)`
- `cursor.pass()`
- `cursor.prev()`
- `cursor.next({ variationIndex?: number })`
- `cursor.gotoNode(nodeId)`
- `cursor.setVariation(level, variationIndex)`
- `cursor.getCurrentNode()`
- `cursor.getVariations(nodeId?)`
- `cursor.getPath()`
- `cursor.getState()`

## Result Shape (Cursor Actions)

Success includes `ok: true` and action-specific payload.

Errors use:

```js
{
  ok: false,
  code: string,
  message: string
}
```

Common codes:

- `occupied`, `ko`, `suicide` (from gameplay rules)
- `no_prev`, `no_next`
- `variation_index`
- `node_not_found`
- `tree_desync`

## Connecting to a Renderer

`cursor.board` is a live `BoardState` that updates automatically as the cursor
navigates. Pass it directly to `createRenderer` and the canvas will re-render
on every move, undo, or branch switch — no manual wiring needed.

```js
import { createCursor, createGameTree, createRenderer, rules } from './src/index.js';

const tree = createGameTree({
  size: 19,
  rules: rules.japanese({ ko: 'simple', suicide: 'forbidden' }),
});
const cursor = createCursor(tree);

const renderer = createRenderer('#board', {
  board: cursor.board,
  theme: 'kaya-medium',
});

await renderer.whenReady();
renderer.render();

// clicking the board plays a move; the renderer updates automatically
renderer.on('click', ({ vertex }) => {
  if (vertex) cursor.play(vertex);
});
```

## Demo

- `demoV5Tree.html`: full tree/cursor demo with branch creation and node navigation
- Includes keyboard navigation: `ArrowLeft`/`ArrowRight` for prev/next and `ArrowUp`/`ArrowDown` to switch sibling variation
