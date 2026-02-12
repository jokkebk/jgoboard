/**
 * Server-side rendering demo for jGoBoard v5
 *
 * This script demonstrates headless rendering in Node.js using the canvas package.
 * It loads an SGF file, navigates to move 127, and exports an image.
 *
 * Requirements:
 *   npm install canvas
 *
 * Usage:
 *   node demoV5ServerRender.js
 */

import { readFile, writeFile } from 'fs/promises';
import canvas from 'canvas';
const { createCanvas, Image, Canvas } = canvas;
import { gameTreeFromSgf } from './src/sgf/index.js';
import { createCursor } from './src/core/index.js';
import { createRenderer } from './src/renderer/index.js';
import { kayaMedium } from './src/presets/index.js';
import { MARK } from './src/core/index.js';

// Register node-canvas globally for jGoBoard renderer
global.Image = Image;
global.HTMLCanvasElement = Canvas;
global.document = {
  createElement: (tag) => {
    if (tag === 'canvas') {
      return createCanvas(800, 800);
    }
    throw new Error(`createElement not implemented for ${tag}`);
  },
};

async function main() {
  // Load and parse the SGF file
  console.log('Loading examples/shusaku.sgf...');
  const sgfContent = await readFile('./examples/shusaku.sgf', 'utf-8');

  console.log('Creating game tree...');
  const tree = gameTreeFromSgf(sgfContent);
  const cursor = createCursor(tree);

  // Navigate to move 127
  console.log('Navigating to move 127...');
  const targetMove = 127;
  let moveCount = 0;

  // The tree starts at the root (move 0), so we need to step forward
  while (moveCount < targetMove) {
    const result = cursor.next();
    if (!result.ok) {
      console.log(`Stopped at move ${moveCount} (${result.message})`);
      break;
    }
    moveCount++;
  }

  console.log(`At move ${moveCount}`);

  // Get the board state
  const board = cursor.board;

  // Get the position of move 126 (the last move played)
  const node = cursor.getCurrentNode();
  let move126Position = null;

  if (node?.action?.type === 'play' && node?.action?.vertex) {
    move126Position = node.action.vertex;
    console.log(`Move 127 was played at ${move126Position}`);

    // Add a circle marker at move 127
    board.setMark(move126Position, MARK.CIRCLE);
  }

  // Create renderer with kaya-medium preset (pass null to let it create canvas)
  console.log('Rendering with kaya-medium theme...');
  const renderer = createRenderer(null, {
    board,
    theme: kayaMedium,
    interactions: { enabled: false }, // Disable interactions for server-side rendering
  });

  // Wait for assets to load
  await renderer.whenReady();

  // Create a node-canvas for export
  console.log('Creating export canvas...');
  const exportCanvas = createCanvas(800, 800);

  // Render to our node-canvas
  renderer.renderToCanvas(exportCanvas, { scale: 1 });

  // Export to JPEG
  console.log('Exporting to ear-reddening.jpg...');
  const buffer = exportCanvas.toBuffer('image/jpeg', { quality: 0.95 });
  await writeFile('./ear-reddening.jpg', buffer);

  console.log('✓ Successfully rendered to ear-reddening.jpg');
  console.log(`  Move 127 at ${move126Position || 'unknown'} marked with circle`);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
