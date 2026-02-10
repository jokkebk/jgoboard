# jGoBoard v5 Renderer API

This document describes the current v5 renderer implementation in `src/`.

## Modules

```js
import { createBoard, STONE, MARK } from 'jgoboard/core';
import {
  createRenderer,
  createSelectionLayer,
  createHeatmapLayer,
  createPaletteHeatmapLayer,
  createRawHeatmapLayer,
  heatmapPalettes,
  createGradientPalette,
} from 'jgoboard/renderer';
import { kayaMedium } from 'jgoboard/presets';
```

In this repo, local demos import directly from `./src/index.js`.

## Quick Start

```js
import { createBoard, STONE } from './src/core.js';
import { createRenderer } from './src/renderer.js';

const board = createBoard({ size: 19 });
board.setStone('D4', STONE.BLACK);

const renderer = createRenderer('#board', {
  board,
  theme: 'kaya-medium',
});

await renderer.whenReady();
renderer.render();
```

## Core Concepts

- `BoardState` (`createBoard`) stores stones and marks.
- `BoardRenderer` draws the board to canvas and follows board changes.
- `LayerRegistry` controls render order and custom overlays.

Built-in layers:

1. `grid`
2. `stars`
3. `stones`
4. `markers`
5. `labels`
6. `ghost`
7. `overlay`

Custom layers can use higher `zIndex` values to render above all built-ins.

## `createRenderer(target, options)`

- `target`: CSS selector, DOM element, canvas, `OffscreenCanvas`, or omitted.
- `options.board` (required): board instance from `createBoard`.
- `options.theme`: theme name (`kaya-medium`, `walnut-medium`, etc.) or theme object.
- `options.layout`: deep partial override for theme/layout tokens.
- `options.viewport`: either `{ from, to }` vertices or `{ xOffset, yOffset, width, height }`.
- `options.interactions.enabled`: set `false` to disable pointer events.
- `options.pixelRatio`: override DPR scaling.
- `options.assetBaseUrl`: optional base URL used to resolve relative texture paths.

### Instance methods

- `renderer.render()`
- `renderer.whenReady()`
- `renderer.setViewport(viewport)`
- `renderer.setTheme(theme)`
- `renderer.setAssetBaseUrl(assetBaseUrl)`
- `renderer.setLayout(layout)`
- `renderer.setBoard(board)`
- `renderer.setGhostStone(pointOrVertex, stone, { onlyWhenClear, replaceExisting })`
- `renderer.clearGhostStone()`
- `renderer.enableHoverPreview({ stone, onlyWhenClear, replaceExisting })`
- `renderer.disableHoverPreview()`
- `renderer.on('click'|'mousemove'|'mouseout', handler)`
- `renderer.toDataURL({ format, scale, quality })`
- `renderer.toBlob({ format, scale, quality })`
- `renderer.renderToCanvas(canvas, { scale })`
- `renderer.destroy()`

Global helpers:

- `setAssetBaseUrl(assetBaseUrl)` sets a default base URL for all subsequent renderers.
- `getAssetBaseUrl()` reads the current global base URL.

## Layers API

### Manual custom layer

```js
renderer.layers.add('ownership', {
  zIndex: 70,
  draw(ctx, frame) {
    // draw on top of default layers
  },
});
```

Layer controls:

- `renderer.layers.add(name, layer)`
- `renderer.layers.remove(name)`
- `renderer.layers.enable(name, true|false)`

## Ghost Stone Preview

Use `enableHoverPreview` for one-line hover preview setup. The `stone` callback
receives the hovered point and returns the stone color to show (or `null` to
hide the ghost). The ghost auto-clears whenever the board changes.

```js
// Game-play preview: show the current player's stone on empty points
renderer.enableHoverPreview({
  stone: () => game.currentPlayer,
});

// Editor preview: show next cycling color, replacing existing stones visually
renderer.enableHoverPreview({
  stone: (point) => board.getStone(point) === STONE.CLEAR ? STONE.BLACK : STONE.WHITE,
  onlyWhenClear: false,
  replaceExisting: true,
});

// Disable and clean up
renderer.disableHoverPreview();
```

Options:
- `stone(point)` — required callback returning `STONE.BLACK`, `STONE.WHITE`, or `null`
- `onlyWhenClear` — hide on occupied intersections (default `true`)
- `replaceExisting` — visually replace existing stones (default `false`)

### Low-level API

For advanced use cases, `setGhostStone` / `clearGhostStone` give direct
control. The ghost auto-clears on any board mutation.

```js
renderer.setGhostStone(point, STONE.BLACK, { onlyWhenClear: true });
renderer.clearGhostStone();
```

Stone variants:
- `STONE.GHOST_BLACK` / `STONE.GHOST_WHITE` are semi-transparent stone variants.

## Selection Layer Helper

```js
const selectionLayer = createSelectionLayer({
  name: 'selection-area',
  zIndex: 71,
  fillStyle: 'rgba(128,128,255,0.5)',
  strokeStyle: 'rgba(58,58,170,0.9)',
  lineWidth: 1,
  getSelection: () => ({ from: 'C3', to: 'F7' }),
});

renderer.layers.add(selectionLayer.name, selectionLayer);
```

`getSelection()` supports:

- `{ from: 'A1', to: 'D4' }`
- `{ x1, y1, x2, y2 }`

## Heatmap Layer Helper

`createHeatmapLayer` supports two data modes.

### 1) Palette/value mode (0..1 style)

Use numeric values and a palette function.

```js
const values = new Map();
values.set('3,3', 0.9);

const heatmap = createPaletteHeatmapLayer({
  name: 'heatmap',
  zIndex: 70,
  values: () => values,
  minValue: 0,
  maxValue: 1,
  palette: heatmapPalettes.greenYellowRed({ alpha: 0.45 }),
  renderMode: 'gradient',
  edgeFadeCells: 1.25,
});
```

### 2) Raw RGBA mode (base mode)

Provide direct colors per intersection.

```js
const colors = new Map();
colors.set('3,3', 'rgba(255,0,0,0.4)');
colors.set('4,3', { r: 255, g: 120, b: 0, a: 0.35 });

const rawHeatmap = createRawHeatmapLayer({
  name: 'raw-heatmap',
  zIndex: 70,
  colors: () => colors,
  renderMode: 'gradient',
  edgeFadeCells: 1.25,
});
```

### Common heatmap options

- `name`
- `zIndex`
- `renderMode`: `'cells'` or `'gradient'`
- `edgeFadeCells`: gradient edge fade distance in grid cells
- `defaultColor`: fallback RGBA for missing entries

Value-mode options:

- `values` / `getValue`
- `minValue`, `maxValue`
- `palette` (function or gradient stops)
- `defaultValue`
- `clampValues`

RGBA-mode options:

- `colors` / `getColor`

## Palettes

Built-ins:

- `heatmapPalettes.redAlpha({ maxAlpha, red, green, blue })`
- `heatmapPalettes.greenYellowRed({ alpha })`

Custom gradient palette:

```js
const palette = createGradientPalette([
  { at: 0, color: 'rgba(0,0,255,0.15)' },
  { at: 0.5, color: 'rgba(255,255,0,0.25)' },
  { at: 1, color: 'rgba(255,0,0,0.5)' },
]);
```

## Notes

### Texture caching

Theme texture images (stone, shadow, and board wood textures) are loaded once
and stored in a module-level `Map` keyed by URL. This means all
`BoardRenderer` instances on the same page share the same image cache, which
avoids redundant network requests. If you need isolated caching (e.g. running
multiple independent widgets that load textures from different base paths with
colliding filenames), be aware that the first load wins for a given URL.

By default, relative texture URLs are resolved against:
1) `options.assetBaseUrl` (if provided),
2) the jGoBoard script URL (when available),
3) the page URL (fallback).

If your deployment serves textures from a custom location, set
`options.assetBaseUrl` (or call `renderer.setAssetBaseUrl(...)`).

## Demos

- `demoV5Renderer.html`: base renderer and themes
- `demoV5Layers.html`: territory markers, selection layer, heatmap layer
- `demoV5Game.html`: gameplay rules (captures, ko, suicide checks, pass, undo/redo)
- `demoV5Tree.html`: GameTree + Cursor variations, node IDs, and navigation
