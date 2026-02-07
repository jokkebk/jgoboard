# jGoBoard 5.0 Architecture Draft

## Scope
This draft reviews the current v4 paradigms and proposes a v5 architecture that:
- Adds an embeddable player component with variation support
- Improves SGF and game record robustness
- Makes board configuration simpler and safer
- Supports optional AI overlays for territory and move evaluation
- Enables real tree-shaking so users can ship only what they need

## Current Paradigm Review (v4)

### What is solid
- The board model is small and understandable (`JGO/board.js`) and has useful primitives (`playMove`, `getGroup`, listeners).
- Rendering output quality is good and themes are visually pleasant.
- `Record` + `Node` already encode variation trees and reversible changes.
- Demos communicate capabilities well and are easy to run.

### Pain points and coupling observed
1. Entry point and exports reduce tree-shaking effectiveness.
- `main.js` writes `window.JGO` as a side effect for all consumers (`main.js:4`).
- `JGO/index.js` eagerly imports and assembles all modules (`JGO/index.js:1-30`).
- Package exports only `.` and no subpath entry points (`package.json:12-19`).

2. Setup is a "god helper" that mixes concerns.
- `Setup` merges options, creates renderer, loads images, and owns notifier wiring (`JGO/setup.js:12-109`).
- This makes custom renderer, worker parsing, and reactive UI integration harder.

3. Record, node, and board are tightly coupled and mutable.
- `Record` always owns a live `Board` (`JGO/record.js:12-16`).
- `Node` mutates board directly while storing reversible deltas (`JGO/node.js:47-97`).
- Player logic in demos reaches through internals (`jrecord.jboard`) instead of stable controller APIs (`demoPlay.html:66-68`).

4. SGF API shape is hard to consume robustly.
- `sgf.load()` returns `Record | Record[] | string` (`JGO/sgf.js:457-480`).
- Parser and conversion are fused, which limits validation/transforms.
- There are correctness/code quality smells (example: `else if ('W')`) (`JGO/sgf.js:72`).

5. Board configuration is powerful but awkward.
- Presets live in global scripts (`medium/board.js`, `large/board.js`) and are not package exports.
- They depend on `JGO.util.extend` and global `JGO.BOARD` mutation (`medium/board.js:4-55`).
- `package.json` `files` does not include `medium/` or `large/` assets (`package.json:20-26`), so npm users cannot rely on those demo paths.

6. Auto/embed mode has security and maintenance debt.
- `auto.js` uses `eval` on `data-jgostyle` (`JGO/auto.js:56-59`).

7. Renderer update model currently redraws full viewport.
- `Canvas.draw()` intentionally overrides partial redraw to full redraw due to alignment issues (`JGO/canvas.js:353-357`).

8. Type surface is effectively missing today.
- Generated `dist/index.d.ts` is empty in this workspace, making typed usage difficult.

## v5 Design Principles
1. Headless core first, UI optional.
2. Composition over helper monoliths.
3. Safe defaults, explicit opt-ins.
4. No globals in ESM path.
5. Stable typed APIs with discriminated results (never error strings).
6. Subpath exports for every major capability.
7. Backward compatibility via an adapter package, not by freezing old internals.

## Recommended Architecture (Option B)

### Layering
1. `core` (no DOM)
- Board state, rules, move application, captures, ko/superko policy hooks
- Game tree model + cursor/navigation
- Snapshot/undo APIs

2. `sgf` (no DOM)
- SGF parser to typed AST
- AST <-> game tree conversion
- SGF serializer

3. `render-canvas`
- Canvas renderer only
- Viewport/layout/theme resolution
- Overlay channels (labels, heatmap, territory masks)

4. `player`
- Embeddable controller + default UI skin
- Variation navigation, comments, metadata panel
- Keyboard and pointer bindings

5. `analysis-basic` (optional)
- Territory estimator
- Move candidate scoring
- Lightweight confidence and explanation strings

6. `presets` and `assets` (optional)
- Board/theme presets as normal module exports
- Texture URLs or loader helpers

### Why Option B
- Keeps repo and release flow manageable.
- Produces clean separation for tree-shaking.
- Avoids immediate complexity of full multi-repo package sprawl.

## Alternative Options

### Option A: Conservative single-package refactor
- Keep one package, add internal modules and subpath exports.
- Fastest path, lower migration risk.
- Tradeoff: weaker long term ownership boundaries.

### Option C: Multi-package workspace
- `@jgoboard/core`, `@jgoboard/sgf`, `@jgoboard/player`, etc.
- Best for strict boundaries and ecosystem growth.
- Tradeoff: release and versioning complexity.

## API Style Recommendation
Use explicit constructors/factories and typed results.

```ts
import { createGameTree, createCursor, createBoard } from 'jgoboard/core';
import { parseSgf, sgfToGameTree } from 'jgoboard/sgf';
import { CanvasRenderer } from 'jgoboard/render-canvas';

const ast = parseSgf(text); // throws ParseError or returns Result<T, E>
const tree = sgfToGameTree(ast);
const cursor = createCursor(tree);
const board = createBoard({ size: 19 });

const renderer = new CanvasRenderer(container, {
  theme: 'kaya-medium',
  coordinates: true,
});

renderer.bind(board);
cursor.applyCurrent(board);
```

### Key surface changes
- Replace `Record` mutable ownership with `GameTree + Cursor + BoardProjection`.
- Replace `string` errors with `Result` or exceptions carrying codes.
- Replace global `JGO.BOARD` with imported presets.

## Embeddable Player Component

### Base component
- `createPlayer(container, options)` for vanilla JS
- Optional web component `<jgo-player>` wrapper
- Controlled and uncontrolled modes

### Required capabilities
- Variation-aware timeline and branch picker
- Comments/info panel
- Move number jump and keyboard navigation
- URL state sync hooks
- Event API:
  - `onMoveChange`
  - `onVariationChange`
  - `onPlayAttempt`
  - `onIllegalMove`

### Variation model recommendation
- Keep a stable `nodeId` graph.
- Cursor state:
  - `path` (selected child indices)
  - `ply`
  - `currentNodeId`
- APIs:
  - `next({ variationIndex? })`
  - `prev()`
  - `gotoNode(nodeId)`
  - `setVariation(level, index)`

## SGF and Record Redesign

### SGF pipeline
1. Parse text -> AST
2. Validate AST with warnings/errors
3. Convert AST -> internal game tree
4. Optional normalize/transform steps
5. Serialize back when needed

### Benefits
- Better debugging and editor tooling
- Easier support for partial SGF features and future extensions
- Cleaner player integration and import/export workflows

## Board Configuration Redesign

### Current issue
Style config currently combines theme tokens, layout geometry, and asset paths in one mutable blob.

### v5 approach
Split into three small schemas:
1. `ThemeTokens`
- Colors, line widths, fonts, mark colors

2. `BoardLayout`
- Grid spacing, margins, star point rules, coordinate visibility

3. `TexturePack` (optional)
- URLs or loaded images

### Preset strategy
- Export presets as pure modules:
  - `import { mediumKaya, largeWalnut } from 'jgoboard/presets';`
- Allow deep partial overrides with typed validation.
- Reject unknown keys in development mode to reduce config mistakes.

## AI Integration (Simple and Useful)

### Keep AI optional and visual-first
- `analysis-basic` should not mutate game state.
- It produces overlays and candidate lists that player/renderer can display.

### Suggested initial features
1. Territory estimator
- Flood-fill empty regions
- Classify owner by boundary dominance
- Mark uncertain regions

2. Move evaluation
- Quick local heuristics:
  - liberties gained/lost
  - atari save/attack
  - capture size
  - self-atari penalty
- Return top N candidates with score and rationale

### API shape
```ts
import { evaluateMoves, estimateTerritory } from 'jgoboard/analysis-basic';

const territory = estimateTerritory(board);
const suggestions = evaluateMoves(board, { player: 'B', topN: 5 });
```

## Demo Plan for v5

1. `demo-player-basic`
- Load SGF and navigate moves/variations

2. `demo-player-embed`
- Multiple players on one page with independent state

3. `demo-scoring`
- Final position scoring and uncertain region visualization

4. `demo-analysis`
- Suggest moves and display rationale overlay

5. `demo-config-lab`
- Live editor for theme/layout/texture settings

## Tree-Shaking and Packaging Plan

### Package exports
Use subpath exports so users import exactly what they need.

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./core": "./dist/core/index.js",
    "./sgf": "./dist/sgf/index.js",
    "./render-canvas": "./dist/render-canvas/index.js",
    "./player": "./dist/player/index.js",
    "./analysis-basic": "./dist/analysis-basic/index.js",
    "./presets": "./dist/presets/index.js"
  },
  "sideEffects": [
    "./dist/umd/*",
    "./dist/legacy/*"
  ]
}
```

### Additional rules
- Keep `window.JGO` only in UMD build, never in ESM entry.
- Ensure each submodule has its own `.d.ts`.
- Avoid eager imports in root index; re-export lazily from submodules.

## Migration Strategy

### Compatibility targets
- Keep v4 running via `jgoboard/legacy` adapter.
- Ship codemod or migration guide for common patterns.

### Breaking changes to accept in v5
1. Remove global `JGO.BOARD` mutation model from ESM path.
2. Replace `sgf.load()` union return with typed parse/load result.
3. Replace direct `record.jboard` reliance with explicit projection APIs.

### Suggested rollout
1. `5.0.0-alpha`
- New core, sgf, renderer, presets
- Legacy adapter package

2. `5.0.0-beta`
- Player component + scoring demo + analysis-basic
- API freeze

3. `5.0.0`
- Documentation refresh, migration docs, deprecation notes

## Practical First Slice (2-4 weeks)
1. Create new `core` and `sgf` module boundaries in current repo.
2. Add subpath exports and remove ESM global side effect.
3. Move presets from `medium/` and `large/` into module exports.
4. Build `PlayerController` without UI first; then add default UI shell.
5. Implement scoring demo and minimal territory overlay.

## Final Recommendation
Proceed with Option B (layered modules in one package) for v5. It gives a meaningful architecture upgrade without overloading release complexity, and directly supports your goals: embeddable variation player, cleaner SGF/game record model, easier board configuration, and genuinely optional AI + tree-shakeable consumption.
