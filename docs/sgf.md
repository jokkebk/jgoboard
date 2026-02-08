# jGoBoard v5 SGF API

This document describes the SGF parser/mapper in `src/sgf/index.js`.

## Modules

```js
import { parseSgf, gameTreeFromSgf, sgfFromGameTree } from 'jgoboard/sgf';
```

## Quick Start

```js
import { createCursor } from 'jgoboard/core';
import { gameTreeFromSgf, sgfFromGameTree } from 'jgoboard/sgf';

const tree = gameTreeFromSgf(sgfText);
const cursor = createCursor(tree);

cursor.next();

const serialized = sgfFromGameTree(tree);
```

## API

- `parseSgf(text, options?)`
  - `options.mode`: `'strict' | 'permissive'`
  - `options.onWarning(warning)`
  - Returns AST collection `{ type: 'collection', trees, warnings }`

- `gameTreeFromSgf(astOrText, options?)`
  - Accepts SGF text or AST from `parseSgf`
  - Maps SGF root metadata and move tree to `GameTree`
  - Supports setup properties (`AB`, `AW`, `AE`) as setup nodes
  - Preserves raw SGF properties in `node.properties` for round-tripping

- `sgfFromGameTree(tree, options?)`
  - Serializes `GameTree` back to SGF
  - Deterministic key ordering
  - `options.variations: 'all' | 'mainline'`

## Notes

- Root setup (handicap placements) is applied automatically when a cursor is created.
- Strict mode rejects lowercase SGF property identifiers. Permissive mode normalizes them with warnings.
