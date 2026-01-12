# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

jGoBoard is a JavaScript library for rendering Go/Baduk/Weiqi game boards (goban). It provides canvas-based board rendering with support for stones, markers, SGF parsing, and game record navigation.

## Common Commands

```bash
npm run dev       # Start Vite dev server with hot reload (localhost:5173)
npm run build     # Production build - creates all formats in dist/
npm run lint      # Run ESLint on JGO/ and main.js
npm run format    # Format code with Prettier
```

Demo files can be viewed by running `npm run dev` and navigating to e.g. `http://localhost:5173/demoPlay.html`

## Architecture

### Entry Points
- `main.js` - Library entry point, exports JGO namespace for UMD and named exports for ESM
- `JGO/index.js` - Assembles all modules into the JGO namespace object

### Core Modules (JGO/)
- `board.js` - Board state management (stones, marks, listeners). Handles move validation with `playMove()` method
- `canvas.js` - Canvas rendering engine for drawing board, stones, and markers
- `setup.js` - Helper class for creating Canvas instances with board configuration (size, textures, coordinates)
- `constants.js` - Enums for intersection types (BLACK, WHITE, CLEAR, DIM_*) and marker types (TRIANGLE, CIRCLE, SQUARE, etc.)
- `coordinate.js` - Coordinate class for board positions (i, j notation)
- `sgf.js` - SGF (Smart Game Format) parser
- `record.js` - Game record with move history
- `node.js` - Game tree node for variations
- `notifier.js` - Observer pattern for board-to-canvas updates
- `stones.js` - Stone appearance configuration (BOARD.large, BOARD.medium, etc.)
- `util.js` - Utility functions (extend, loadImages)

### Build System
- Uses Vite for bundling
- `scripts/build.js` - Custom build script producing:
  - ESM (`jgoboard.js`) and CJS (`jgoboard.cjs`) - unminified for bundlers
  - UMD (`jgoboard.umd.min.js`) - minified for browsers/CDN
  - TypeScript definitions auto-generated from JSDoc

### Asset Directories
- `large/`, `medium/` - Stone and board texture images for different board sizes
