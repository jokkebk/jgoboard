import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseVertex,
  formatVertex,
  normalizePoint,
  normalizeViewport,
  COORDINATE_LETTERS,
} from '../src/core.js';

// --- parseVertex ---

test('parseVertex: A1 on 19×19 is bottom-left (0, 18)', () => {
  assert.deepEqual(parseVertex('A1', 19), { x: 0, y: 18 });
});

test('parseVertex: T19 on 19×19 is top-right (18, 0)', () => {
  assert.deepEqual(parseVertex('T19', 19), { x: 18, y: 0 });
});

test('parseVertex: skips I column — J is index 8', () => {
  // COORDINATE_LETTERS = ABCDEFGHJKLMNOPQRSTUVWXYZ (no I)
  assert.equal(COORDINATE_LETTERS.includes('I'), false);
  assert.equal(COORDINATE_LETTERS[8], 'J');
  assert.deepEqual(parseVertex('J1', 19), { x: 8, y: 18 });
});

test('parseVertex: case-insensitive', () => {
  assert.deepEqual(parseVertex('a1', 19), parseVertex('A1', 19));
  assert.deepEqual(parseVertex('t19', 19), parseVertex('T19', 19));
});

test('parseVertex: throws on invalid vertex format', () => {
  assert.throws(() => parseVertex('', 19));
  assert.throws(() => parseVertex('ZZ99', 19));
  assert.throws(() => parseVertex(42, 19));
});

test('parseVertex: throws on out-of-range row', () => {
  assert.throws(() => parseVertex('A0', 19));
  assert.throws(() => parseVertex('A20', 19));
});

// --- formatVertex ---

test('formatVertex: round-trips with parseVertex', () => {
  for (const vertex of ['A1', 'T19', 'D4', 'Q16']) {
    const point = parseVertex(vertex, 19);
    assert.equal(formatVertex(point, 19), vertex);
  }
});

test('formatVertex: rejects out-of-bounds coordinates', () => {
  assert.throws(() => formatVertex({ x: -1, y: 0 }, 19));
  assert.throws(() => formatVertex({ x: 0, y: 19 }, 19));
  assert.throws(() => formatVertex({ x: 25, y: 0 }, 19));
});

// --- normalizePoint ---

test('normalizePoint: accepts vertex string', () => {
  assert.deepEqual(normalizePoint('D4', 19), parseVertex('D4', 19));
});

test('normalizePoint: accepts {x, y} object', () => {
  assert.deepEqual(normalizePoint({ x: 3, y: 15 }, 19), { x: 3, y: 15 });
});

test('normalizePoint: throws on invalid input', () => {
  assert.throws(() => normalizePoint(42, 19));
  assert.throws(() => normalizePoint(null, 19));
  assert.throws(() => normalizePoint({ x: 'a', y: 0 }, 19));
});

// --- normalizeViewport ---

test('normalizeViewport: returns full board when no viewport given', () => {
  const vp = normalizeViewport(null, 19, 19);
  assert.deepEqual(vp, {
    xOffset: 0,
    yOffset: 0,
    width: 19,
    height: 19,
    edge: { top: true, right: true, bottom: true, left: true },
  });
});

test('normalizeViewport: from/to form', () => {
  const vp = normalizeViewport({ from: { x: 0, y: 0 }, to: { x: 8, y: 8 } }, 19, 19);
  assert.equal(vp.xOffset, 0);
  assert.equal(vp.yOffset, 0);
  assert.equal(vp.width, 9);
  assert.equal(vp.height, 9);
  assert.equal(vp.edge.top, true);
  assert.equal(vp.edge.left, true);
  assert.equal(vp.edge.right, false);
  assert.equal(vp.edge.bottom, false);
});

test('normalizeViewport: xOffset/width form', () => {
  const vp = normalizeViewport({ xOffset: 5, yOffset: 5, width: 9, height: 9 }, 19, 19);
  assert.equal(vp.xOffset, 5);
  assert.equal(vp.yOffset, 5);
  assert.equal(vp.width, 9);
  assert.equal(vp.height, 9);
  assert.equal(vp.edge.top, false);
  assert.equal(vp.edge.left, false);
});

test('normalizeViewport: edge flags detect board edges', () => {
  const vp = normalizeViewport({ xOffset: 10, yOffset: 10, width: 9, height: 9 }, 19, 19);
  assert.equal(vp.edge.top, false);
  assert.equal(vp.edge.left, false);
  assert.equal(vp.edge.right, true);
  assert.equal(vp.edge.bottom, true);
});

test('normalizeViewport: throws on out-of-bounds viewport', () => {
  assert.throws(() => normalizeViewport({ xOffset: 15, width: 10 }, 19, 19));
});
