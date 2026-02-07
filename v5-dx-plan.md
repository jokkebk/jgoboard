# jGoBoard v5 DX Plan

## Goal
Design jGoBoard v5 around an elegant, usage-first developer experience for both JavaScript and TypeScript, with zero legacy constraints.

Core building blocks:
1. Rendering engine
2. Game tree + rules
3. SGF serialization/deserialization
4. Embeddable player component

## DX Principles
- Start simple, scale deep: one-liner setup for common cases, composable primitives for advanced cases.
- Headless core, optional UI: game logic should work in browser, Node, workers, tests.
- Strong TS support, frictionless JS support: first-class types with readable JS docs and examples.
- Explicit module boundaries: import only what you need.
- Predictable API naming: `createX`, `fromX`, `toX`, `applyX`.
- Safe defaults, no hidden globals, no `eval`.

## Recommended Package Shape
Single `jgoboard` package with subpath exports for tree-shaking and discoverability:

- `jgoboard/core` - board, moves, rules, game tree, cursor
- `jgoboard/renderer` - canvas renderer, layers, themes, export
- `jgoboard/sgf` - SGF parser/serializer and mapping to game tree
- `jgoboard/player` - embeddable player component
- `jgoboard/presets` - theme/layout presets
- `jgoboard/analysis` - optional territory/move-heatmap helpers

Keep `jgoboard` root export as a convenience facade for small apps.

## 1. Rendering Engine (Usage-Centered)

### Primary object
`BoardRenderer` bound to a `BoardView` (or directly to `BoardState`).

### First-run API
TypeScript:
```ts
import { createBoard } from 'jgoboard/core';
import { createRenderer } from 'jgoboard/renderer';
import { kayaMedium } from 'jgoboard/presets';

const board = createBoard({ size: 19 });
const renderer = createRenderer('#board', { board, theme: kayaMedium });
renderer.render();
```

JavaScript:
```js
import { createBoard } from 'jgoboard/core';
import { createRenderer } from 'jgoboard/renderer';

const board = createBoard({ size: 19 });
const renderer = createRenderer('#board', { board });
renderer.render();
```

### Partial board / diagram mode
```ts
renderer.setViewport({ from: 'K4', to: 'T10' });
renderer.render();
```

### Layered rendering model
Built-in render layers (ordered):
1. `grid`
2. `stars`
3. `stones`
4. `markers`
5. `labels`
6. `overlay` (selection, territory, heatmap)

Custom layers:
```ts
renderer.layers.add('ownership', {
  zIndex: 60,
  draw(ctx, frame) {
    // draw territory overlay
  }
});
```

### Export support (diagrams/download)
- `renderer.toDataURL({ format: 'png' | 'jpeg', scale?: number })`
- `renderer.toBlob({ format, quality?, scale? })`
- `renderer.renderToCanvas(canvas, options)`
- `renderBoardImage(board, options)` for Node/server-side image generation

### Config model (simple but deep)
Use structured config with sensible defaults:

- `theme` (tokens)
- `layout` (grid size, margins, coordinates)
- `viewport`
- `interactions` (on/off)
- `layers`

Common override example:
```ts
createRenderer('#board', {
  board,
  theme: { grid: { lineWidth: 1.2 } },
  viewport: { from: 'A1', to: 'J10' },
});
```

## 2. Game Tree + Rules

### Mental model
- `GameTree`: immutable-ish graph of nodes/variations
- `GameCursor`: mutable navigation state over a tree
- `BoardState`: current board projection
- `RuleSet`: plug-in rules engine

### Usage
```ts
import { createGameTree, createCursor, rules } from 'jgoboard/core';

const tree = createGameTree({ size: 19, rules: rules.japanese({ ko: 'simple', superko: 'positional' }) });
const cursor = createCursor(tree);

cursor.play('D4');
cursor.play('Q16');
cursor.undo();
cursor.redo();
```

### Rule plug-in interface
- Built-ins: `japanese`, `chinese`, `aga`
- Rule options: ko policy, superko policy, suicide policy, handicap behavior
- Custom rules via hooks:
  - `beforePlay`
  - `validatePlay`
  - `afterPlay`
  - `scorePosition`

### Return types
No string errors. Use typed result objects:

```ts
type PlayResult =
  | { ok: true; nodeId: string; captures: string[]; ko?: string }
  | { ok: false; code: 'occupied' | 'suicide' | 'ko' | 'superko'; message: string };
```

## 3. SGF as Serialization Layer

Treat SGF like JSON for game trees: parse, validate, transform, serialize.

### API
```ts
import { parseSgf, gameTreeFromSgf, sgfFromGameTree } from 'jgoboard/sgf';

const ast = parseSgf(text);
const tree = gameTreeFromSgf(ast);
const sgf = sgfFromGameTree(tree);
```

### DX behavior
- Strict parser mode and permissive parser mode
- Warning channel for non-fatal issues
- Preserve unsupported properties where possible
- Stable serialization for deterministic output

### Editor workflow support
Allow exporting:
- Full game with variations/comments/marks
- Current branch only
- Static board snapshot (as setup node + metadata)

## 4. Embeddable Player Component

### Zero-friction embed
```ts
import { createPlayer } from 'jgoboard/player';

const player = createPlayer('#player', {
  sgf,
  theme: 'kaya-medium',
  controls: 'minimal',
  responsive: true,
});
```

### Player responsibilities
- Load SGF or GameTree
- Render board
- Navigate moves and variations
- Show comments, captures, metadata
- Emit events for host app integration

### Player events
- `moveChange`
- `variationChange`
- `playAttempt`
- `illegalMove`
- `ready`

### Integration modes
- Uncontrolled: player owns internal cursor
- Controlled: host app drives move/variation state

## Demos Strategy (Built from Same Primitives)

1. `playable-demo`
- Uses `core + renderer`
- Rule switching (ko/superko)

2. `sgf-viewer`
- Uses `sgf + player`
- Fullscreen mode, variation tree panel

3. `scoring-demo`
- Uses `core + analysis + renderer overlay`

4. `ai-heatmap-demo`
- Uses `analysis + renderer layers`

5. `diagram-generator-demo`
- Uses `renderer export` and partial viewport presets

## TypeScript and JavaScript Support

### TypeScript
- Full `.d.ts` for every subpath export
- Typed events and option objects
- Exhaustive result unions for rule validation

### JavaScript
- Same API shape as TS
- JSDoc-powered IntelliSense
- Runtime option validation in development mode with clear errors

## Tree-Shaking and Build Behavior
- ESM-first distribution
- Subpath exports so users can import only required modules
- No global side effects in ESM
- UMD bundle for `<script>` usage kept separate
- `sideEffects` only for legacy/UMD wrappers, not core modules

## Alternative Designs

### Option A (Recommended): Single package + subpath modules
- Best balance of DX, adoption, and maintainability
- One dependency for users, strong tree-shaking for modern bundlers
- Clean docs: one brand, one package, multiple entry points

### Option B: Multi-package (`@jgoboard/core`, `@jgoboard/renderer`, ...)
- Excellent module isolation and version control
- Better for large contributor ecosystem
- Higher release complexity and onboarding friction

### Option C: Framework-first packages (`@jgoboard/react`, `@jgoboard/vue`) as primary
- Great for specific app ecosystems
- Risks diluting core API design and non-framework use cases
- Better as follow-up phase, not primary architecture

## Recommendation
Adopt **Option A** now:
- Keep name `jgoboard`
- Build strict module boundaries internally
- Expose subpath exports as stable public API
- Make player a thin composition over `core + renderer + sgf`

This gives an elegant developer experience immediately, keeps the brand simple, and still enables deep tree-shaking and robust long-term growth.

## Proposed v5 Public API Sketch

```ts
// core
createBoard(config)
createGameTree(config)
createCursor(tree)
rules.japanese(opts)
rules.chinese(opts)

// renderer
createRenderer(target, options)
renderBoardImage(board, options)

// sgf
parseSgf(text, options)
gameTreeFromSgf(ast, options)
sgfFromGameTree(tree, options)

// player
createPlayer(target, options)

// presets
kayaMedium
kayaLarge
walnutMedium
bwMinimal

// analysis
estimateTerritory(board, options)
evaluateMoves(board, options)
```

## Suggested Delivery Sequence
1. Finalize API contracts and type shapes (`core`, `renderer`, `sgf`).
2. Implement `core` + `sgf` with exhaustive tests.
3. Implement renderer with layer system and export API.
4. Build embeddable player on top of those primitives.
5. Add analysis overlays and demos.
6. Publish v5 docs with JS-first quickstart and TS reference.
