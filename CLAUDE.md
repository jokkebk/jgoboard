# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

jGoBoard v5 — a modular JavaScript toolkit for the board game Go (Baduk/Weiqi). Provides board state management, rules engine, SGF parsing, canvas rendering, and an embeddable player component. Zero runtime dependencies.

## Commands

- `npm test` — run all tests (Node.js native test runner)
- `node --test test/board.test.js` — run a single test file
- `npm run build` — production build (ESM, CJS, UMD outputs to `dist/`)
- `npm run lint` — ESLint check
- `npm run format` — Prettier auto-format
- `npm run dev` — Vite dev server for demos (visit `http://localhost:5173/demoV5*.html`)

## Architecture

The codebase is plain JavaScript with JSDoc type annotations (not TypeScript). Type declarations are generated at build time from JSDoc.

### Module layers (each is a separate subpath export):

- **`core`** (`src/core/`) — Headless game logic with no DOM dependencies
  - `BoardState` — stone/mark grid management with `onChange()` observer
  - `GameState` — rules engine (ko, suicide, captures) wrapping BoardState
  - `GameTree` + `GameCursor` — variation tree navigation with undo/redo
  - `coordinates.js` — vertex string ↔ numeric conversion
  - `constants.js` — `STONE`, `MARK` enums
- **`sgf`** (`src/sgf/`) — SGF parser/serializer with strict/permissive modes, round-trips through AST
- **`renderer`** (`src/renderer/`) — Canvas-based board rendering with composable layer system
- **`player`** (`src/player/`) — Embeddable player component with navigation controls
- **`presets`** (`src/presets/`) — Pre-configured themes (kaya, walnut, b&w) with size variants

### Key conventions

- Factory functions: `createBoard()`, `createGame()`, `createRenderer()`, `createGameTree()`, `createCursor()`, `createPlayer()`
- Structured results: game actions return `{ ok: true, captures: [...] }` or `{ ok: false, code: 'ko', message: '...' }` — no throwing in game logic
- Tests use `node:assert/strict` with the native Node.js test runner
- Code style: single quotes, semicolons, trailing commas (ES5), 100 char width (see `.prettierrc.json`)

## Build

Custom build script (`scripts/build.js`) using Vite produces:
- `jgoboard.js` / `jgoboard.cjs` — unminified ESM/CJS full bundles
- `jgoboard.umd.min.js` — minified UMD for CDN
- Per-module bundles: `core`, `renderer`, `presets`, `sgf`, `player`
- `.d.ts` type definitions generated via `vite-plugin-dts`
