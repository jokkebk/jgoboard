import assert from 'node:assert/strict';
import test from 'node:test';

import { createBoard, STONE, MARK } from '../src/core.js';

// --- Construction ---

test('createBoard: creates board with size option', () => {
  const board = createBoard({ size: 9 });
  assert.equal(board.width, 9);
  assert.equal(board.height, 9);
});

test('createBoard: creates rectangular board with width/height', () => {
  const board = createBoard({ width: 13, height: 9 });
  assert.equal(board.width, 13);
  assert.equal(board.height, 9);
});

test('createBoard: rejects invalid sizes', () => {
  assert.throws(() => createBoard({}));
  assert.throws(() => createBoard({ size: 0 }));
  assert.throws(() => createBoard({ size: -1 }));
  assert.throws(() => createBoard({ size: 3.5 }));
});

// --- getStone / setStone ---

test('setStone: set and read back', () => {
  const board = createBoard({ size: 9 });
  board.setStone({ x: 0, y: 0 }, STONE.BLACK);
  assert.equal(board.getStone({ x: 0, y: 0 }), STONE.BLACK);
});

test('setStone: accepts ghost aliases', () => {
  const board = createBoard({ size: 9 });
  board.setStone({ x: 0, y: 0 }, STONE.GHOST_BLACK);
  assert.equal(board.getStone({ x: 0, y: 0 }), STONE.GHOST_BLACK);
});

test('setStone: returns false when value unchanged', () => {
  const board = createBoard({ size: 9 });
  board.setStone({ x: 0, y: 0 }, STONE.BLACK);
  assert.equal(board.setStone({ x: 0, y: 0 }, STONE.BLACK), false);
});

test('getStone: defaults to CLEAR', () => {
  const board = createBoard({ size: 9 });
  assert.equal(board.getStone({ x: 4, y: 4 }), STONE.CLEAR);
});

// --- getMark / setMark ---

test('setMark: set and read back', () => {
  const board = createBoard({ size: 9 });
  board.setMark({ x: 3, y: 3 }, MARK.TRIANGLE);
  assert.equal(board.getMark({ x: 3, y: 3 }), MARK.TRIANGLE);
});

test('setMark: returns false when unchanged', () => {
  const board = createBoard({ size: 9 });
  board.setMark({ x: 0, y: 0 }, MARK.CIRCLE);
  assert.equal(board.setMark({ x: 0, y: 0 }, MARK.CIRCLE), false);
});

// --- setIntersection ---

test('setIntersection: sets both stone and mark', () => {
  const board = createBoard({ size: 9 });
  board.setIntersection({ x: 2, y: 2 }, { stone: STONE.WHITE, mark: MARK.SQUARE });
  assert.equal(board.getStone({ x: 2, y: 2 }), STONE.WHITE);
  assert.equal(board.getMark({ x: 2, y: 2 }), MARK.SQUARE);
});

// --- clear ---

test('clear: resets all stones and marks', () => {
  const board = createBoard({ size: 9 });
  board.setStone({ x: 0, y: 0 }, STONE.BLACK);
  board.setMark({ x: 0, y: 0 }, MARK.TRIANGLE);
  board.clear();
  assert.equal(board.getStone({ x: 0, y: 0 }), STONE.CLEAR);
  assert.equal(board.getMark({ x: 0, y: 0 }), MARK.NONE);
});

// --- each ---

test('each: iterates all intersections', () => {
  const board = createBoard({ size: 5 });
  let count = 0;
  board.each(() => {
    count += 1;
  });
  assert.equal(count, 25);
});

test('each: respects bounds', () => {
  const board = createBoard({ size: 9 });
  const visited = [];
  board.each(
    (point) => {
      visited.push(point);
    },
    { x1: 1, y1: 1, x2: 3, y2: 3 }
  );
  assert.equal(visited.length, 9);
  assert.deepEqual(visited[0], { x: 1, y: 1 });
  assert.deepEqual(visited[visited.length - 1], { x: 3, y: 3 });
});

// --- onChange ---

test('onChange: fires stone event', () => {
  const board = createBoard({ size: 9 });
  const events = [];
  board.onChange((e) => events.push(e));
  board.setStone({ x: 0, y: 0 }, STONE.BLACK);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'stone');
  assert.equal(events[0].newValue, STONE.BLACK);
});

test('onChange: unsubscribe works', () => {
  const board = createBoard({ size: 9 });
  const events = [];
  const unsub = board.onChange((e) => events.push(e));
  unsub();
  board.setStone({ x: 0, y: 0 }, STONE.BLACK);
  assert.equal(events.length, 0);
});

// --- Out of bounds ---

test('out-of-bounds access throws', () => {
  const board = createBoard({ size: 9 });
  assert.throws(() => board.getStone({ x: -1, y: 0 }));
  assert.throws(() => board.getStone({ x: 9, y: 0 }));
  assert.throws(() => board.getStone({ x: 0, y: 9 }));
});
