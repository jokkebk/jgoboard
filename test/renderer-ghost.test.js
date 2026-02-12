import assert from 'node:assert/strict';
import { describe, test, before, after } from 'node:test';

import { STONE } from '../src/core/index.js';
import { BoardRenderer } from '../src/renderer/board-renderer.js';

// --- Mock helpers ---

function createMockCtx() {
  return new Proxy(
    { globalAlpha: 1, lineWidth: 1 },
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        return () => {};
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      },
    }
  );
}

class FakeOffscreenCanvas {
  constructor() {
    this.width = 0;
    this.height = 0;
  }
  getContext() {
    return createMockCtx();
  }
}

function createMockBoard(width = 9, height = 9) {
  const stones = new Map();
  const listeners = new Set();

  return {
    width,
    height,
    getStone(point) {
      return stones.get(`${point.x},${point.y}`) || STONE.CLEAR;
    },
    setStone(point, stone) {
      stones.set(`${point.x},${point.y}`, stone);
      for (const fn of listeners) fn();
    },
    getMark() {
      return null;
    },
    each(fn, bounds) {
      const x1 = bounds ? bounds.x1 : 0;
      const y1 = bounds ? bounds.y1 : 0;
      const x2 = bounds ? bounds.x2 : width - 1;
      const y2 = bounds ? bounds.y2 : height - 1;
      for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) {
          const stone = stones.get(`${x},${y}`) || STONE.CLEAR;
          fn({ x, y }, { stone, mark: null });
        }
      }
    },
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

function createTestRenderer(board) {
  const canvas = new FakeOffscreenCanvas();
  return new BoardRenderer(canvas, { board, theme: 'bw-medium' });
}

// --- Setup ---

let savedOffscreenCanvas;

before(() => {
  savedOffscreenCanvas = globalThis.OffscreenCanvas;
  globalThis.OffscreenCanvas = FakeOffscreenCanvas;
});

after(() => {
  if (savedOffscreenCanvas === undefined) {
    delete globalThis.OffscreenCanvas;
  } else {
    globalThis.OffscreenCanvas = savedOffscreenCanvas;
  }
});

// --- Tests ---

describe('setGhostStone / clearGhostStone', () => {
  test('setGhostStone stores state', () => {
    const board = createMockBoard();
    const renderer = createTestRenderer(board);

    renderer.setGhostStone({ x: 3, y: 4 }, STONE.BLACK);

    assert.deepEqual(renderer._ghostStone, {
      point: { x: 3, y: 4 },
      stone: STONE.GHOST_BLACK,
      onlyWhenClear: true,
      replaceExisting: false,
    });

    renderer.destroy();
  });

  test('clearGhostStone clears state', () => {
    const board = createMockBoard();
    const renderer = createTestRenderer(board);

    renderer.setGhostStone({ x: 0, y: 0 }, STONE.WHITE);
    assert.notEqual(renderer._ghostStone, null);

    renderer.clearGhostStone();
    assert.equal(renderer._ghostStone, null);

    renderer.destroy();
  });

  test('equality short-circuit skips re-render', () => {
    const board = createMockBoard();
    const renderer = createTestRenderer(board);
    let renderCount = 0;
    const origRender = renderer.render.bind(renderer);
    renderer.render = () => {
      renderCount++;
      return origRender();
    };

    renderer.setGhostStone({ x: 2, y: 2 }, STONE.BLACK);
    const countAfterFirst = renderCount;

    // Same args should short-circuit
    renderer.setGhostStone({ x: 2, y: 2 }, STONE.BLACK);
    assert.equal(renderCount, countAfterFirst, 'should not re-render for identical ghost');

    renderer.destroy();
  });

  test('bounds validation throws for out-of-range point', () => {
    const board = createMockBoard(9, 9);
    const renderer = createTestRenderer(board);

    assert.throws(() => renderer.setGhostStone({ x: 9, y: 0 }, STONE.BLACK), /out of board bounds/);
    assert.throws(
      () => renderer.setGhostStone({ x: 0, y: -1 }, STONE.BLACK),
      /out of board bounds/
    );

    renderer.destroy();
  });

  test('clearGhostStone when already clear is a no-op', () => {
    const board = createMockBoard();
    const renderer = createTestRenderer(board);
    let renderCount = 0;
    const origRender = renderer.render.bind(renderer);
    renderer.render = () => {
      renderCount++;
      return origRender();
    };

    // No ghost set — clearGhostStone should not render
    renderer.clearGhostStone();
    assert.equal(renderCount, 0);

    renderer.destroy();
  });

  test('setGhostStone with null point calls clearGhostStone', () => {
    const board = createMockBoard();
    const renderer = createTestRenderer(board);

    renderer.setGhostStone({ x: 0, y: 0 }, STONE.BLACK);
    assert.notEqual(renderer._ghostStone, null);

    renderer.setGhostStone(null, STONE.BLACK);
    assert.equal(renderer._ghostStone, null);

    renderer.destroy();
  });

  test('setGhostStone with STONE.CLEAR calls clearGhostStone', () => {
    const board = createMockBoard();
    const renderer = createTestRenderer(board);

    renderer.setGhostStone({ x: 0, y: 0 }, STONE.BLACK);
    renderer.setGhostStone({ x: 0, y: 0 }, STONE.CLEAR);
    assert.equal(renderer._ghostStone, null);

    renderer.destroy();
  });

  test('setGhostStone normalizes STONE.BLACK to GHOST_BLACK', () => {
    const board = createMockBoard();
    const renderer = createTestRenderer(board);

    renderer.setGhostStone({ x: 0, y: 0 }, STONE.BLACK);
    assert.equal(renderer._ghostStone.stone, STONE.GHOST_BLACK);

    renderer.destroy();
  });

  test('setGhostStone normalizes STONE.WHITE to GHOST_WHITE', () => {
    const board = createMockBoard();
    const renderer = createTestRenderer(board);

    renderer.setGhostStone({ x: 0, y: 0 }, STONE.WHITE);
    assert.equal(renderer._ghostStone.stone, STONE.GHOST_WHITE);

    renderer.destroy();
  });
});

describe('board onChange auto-clears ghost', () => {
  test('ghost is cleared when board changes', () => {
    const board = createMockBoard();
    const renderer = createTestRenderer(board);

    renderer.setGhostStone({ x: 3, y: 3 }, STONE.BLACK);
    assert.notEqual(renderer._ghostStone, null);

    // Mutate the board — triggers onChange
    board.setStone({ x: 0, y: 0 }, STONE.BLACK);
    assert.equal(renderer._ghostStone, null);

    renderer.destroy();
  });
});

describe('enableHoverPreview / disableHoverPreview', () => {
  test('enableHoverPreview stores preview state', () => {
    const board = createMockBoard();
    const renderer = createTestRenderer(board);

    renderer.enableHoverPreview({ stone: () => STONE.BLACK });
    assert.notEqual(renderer._hoverPreview, null);
    assert.equal(typeof renderer._hoverPreview.unsubscribe, 'function');

    renderer.destroy();
  });

  test('disableHoverPreview clears preview state', () => {
    const board = createMockBoard();
    const renderer = createTestRenderer(board);

    renderer.enableHoverPreview({ stone: () => STONE.BLACK });
    renderer.disableHoverPreview();
    assert.equal(renderer._hoverPreview, null);

    renderer.destroy();
  });

  test('enableHoverPreview auto-disables previous preview', () => {
    const board = createMockBoard();
    const renderer = createTestRenderer(board);

    renderer.enableHoverPreview({ stone: () => STONE.BLACK });
    const first = renderer._hoverPreview;

    renderer.enableHoverPreview({ stone: () => STONE.WHITE });
    assert.notEqual(renderer._hoverPreview, first, 'should be a new preview instance');

    renderer.destroy();
  });

  test('disableHoverPreview is a no-op when not active', () => {
    const board = createMockBoard();
    const renderer = createTestRenderer(board);

    // Should not throw
    renderer.disableHoverPreview();
    assert.equal(renderer._hoverPreview, null);

    renderer.destroy();
  });

  test('destroy cleans up hover preview', () => {
    const board = createMockBoard();
    const renderer = createTestRenderer(board);

    renderer.enableHoverPreview({ stone: () => STONE.BLACK });
    renderer.destroy();

    assert.equal(renderer._hoverPreview, null);
  });

  test('methods return renderer for chaining', () => {
    const board = createMockBoard();
    const renderer = createTestRenderer(board);

    const result1 = renderer.enableHoverPreview({ stone: () => STONE.BLACK });
    assert.equal(result1, renderer);

    const result2 = renderer.disableHoverPreview();
    assert.equal(result2, renderer);

    renderer.destroy();
  });
});
