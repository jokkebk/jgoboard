jGoBoard
========

JavaScript-based library for rendering goban (go board).

This work is licensed under the Creative Commons Attribution-NonCommercial 4.0 International License. To view a copy of this license, visit http://creativecommons.org/licenses/by-nc/4.0/deed.en_US

**Homepage:** http://jgoboard.com
**GitHub:** http://github.com/jokkebk/jgoboard

You can find simple demo applications in the root folder and API documentation in doc/ subfolder. More information about the library and its usage in the above address.

## Installation

```bash
npm install jgoboard
```

Or include the UMD build directly in your HTML:

```html
<script src="https://unpkg.com/jgoboard@latest/dist/jgoboard.umd.min.js"></script>
```

## Usage

### Browser (UMD)

The UMD build exposes a global `JGO` object:

```html
<script src="dist/jgoboard.umd.min.js"></script>
<script>
  var jboard = new JGO.Board(19);
  var jsetup = new JGO.Setup(jboard, JGO.BOARD.large);
  jsetup.create('boardContainer');
</script>
```

### ES Modules

```javascript
import JGO from 'jgoboard';
// or import specific modules for better tree-shaking
import { Board, Setup } from 'jgoboard';

const jboard = new Board(19);
const jsetup = new Setup(jboard, JGO.BOARD.large);
jsetup.create('boardContainer');
```

### CommonJS (Node.js)

```javascript
const JGO = require('jgoboard');

const jboard = new JGO.Board(19);
const jsetup = new JGO.Setup(jboard, JGO.BOARD.large);
```

## Development

### Prerequisites

- Node.js 14+ and npm

### Setup

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Build for production (creates both regular and minified versions)
npm run build

# Build development version only (unminified)
npm run build:dev

# Build minified version only
npm run build:min

# Lint code
npm run lint

# Format code
npm run format
```

### Build Outputs

The build process generates multiple formats in the `dist/` directory:

#### Regular builds (unminified):
- `jgoboard.js` (43 KB) - ES module format
- `jgoboard.cjs` (43 KB) - CommonJS format
- `jgoboard.umd.js` (46 KB) - UMD format (browser global)

#### Minified builds:
- `jgoboard.min.js` (27 KB) - ES module format, minified
- `jgoboard.min.cjs` (27 KB) - CommonJS format, minified
- `jgoboard.umd.min.js` (27 KB) - UMD format, minified (~8.4 KB gzipped)

All builds include source maps (`.map` files) for debugging.

#### TypeScript support:
- `index.d.ts` - TypeScript definitions (auto-generated)

### Build System

The project uses [Vite](https://vitejs.dev/) for building:

- **Fast development** - Hot module replacement (HMR)
- **Modern output** - ES modules, CommonJS, and UMD formats
- **Tree-shaking** - Import only what you need
- **Source maps** - Easy debugging
- **TypeScript definitions** - Auto-generated from JSDoc comments

### Project Structure

```
jgoboard/
├── JGO/                  # Source code (ES modules)
│   ├── board.js         # Board logic
│   ├── canvas.js        # Canvas rendering
│   ├── sgf.js           # SGF parser
│   └── ...              # Other modules
├── dist/                # Built files (generated)
├── main.js              # Entry point
├── vite.config.js       # Build configuration
├── package.json         # Package metadata
└── README.md           # This file
```

## Demos

Open any of the demo HTML files in a browser:

- `demoPlay.html` - Interactive board for playing
- `demoSGF.html` - SGF viewer
- `demoTree.html` - Game tree navigation
- `demoSelect.html` - Board region selection
- `demoRandom.html` - Random stone placement
- `demoBlog.html` - Blog-style board embedding

Or run the development server to view them with hot reload:

```bash
npm run dev
# Open http://localhost:5173/demoPlay.html
```

## API Documentation

See the `doc/` folder for complete API documentation, or visit http://jgoboard.com for more details.
