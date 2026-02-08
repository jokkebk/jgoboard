# jGoBoard v5 Gameplay API

This document describes the first game-mechanics slice in `src/core/game.js`.

## Modules

```js
import { STONE, createGame, rules } from 'jgoboard/core';
```

In this repo, local demos import directly from `./src/index.js`.

## Quick Start

```js
import { createGame, rules } from './src/core.js';

const game = createGame({
  size: 19,
  rules: rules.japanese({ ko: 'simple', suicide: 'forbidden' }),
});

const result = game.play('D4');
if (!result.ok) {
  console.log(result.code, result.message);
}
```

## Core Concepts

- `GameState` is a headless move/rules engine.
- `game.board` is a normal `BoardState` for renderer binding.
- Legal move checks include:
  - occupied intersections
  - simple ko (immediate recapture)
  - suicide (configurable)
- Captures are tracked per color.
- Linear history supports undo/redo.

## `createGame(options)`

- `options.size` or `options.width`/`options.height`
- `options.board`: optional existing board instance
- `options.startingPlayer`: `STONE.BLACK` (default) or `STONE.WHITE`
- `options.rules`:
  - `ko`: `'simple' | 'none'`
  - `suicide`: `'forbidden' | 'allowed'`

## Rule Helpers

- `rules.japanese(options)`
- `rules.chinese(options)`
- `rules.aga(options)`

All return a normalized rule object accepted by `createGame`.

## Instance Methods

- `game.play(vertexOrPoint)`
- `game.pass()`
- `game.undo()`
- `game.redo()`
- `game.reset()`
- `game.getState()`
- `game.onChange(listener)`

## Result Shape

`play()` / `pass()` success:

```js
{
  ok: true,
  moveNumber: 1,
  player: STONE.BLACK,
  vertex: 'D4',
  captures: [],
  ko: null,
  nextPlayer: STONE.WHITE
}
```

Error shape:

```js
{
  ok: false,
  code: 'occupied' | 'ko' | 'suicide' | 'out_of_bounds' | 'invalid_point',
  message: string
}
```

## Demo

- `demoV5Game.html`: renderer + gameplay integration with pass/undo/redo and move log
- For variations and cursor navigation, see `docs/game-tree.md` and `demoV5Tree.html`
