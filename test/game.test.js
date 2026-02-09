import assert from 'node:assert/strict';
import test from 'node:test';

import { createGame, STONE } from '../src/core.js';

// --- Basic play ---

test('black plays first, turns alternate', () => {
  const game = createGame({ size: 9 });
  assert.equal(game.currentPlayer, STONE.BLACK);
  game.play({ x: 0, y: 0 });
  assert.equal(game.currentPlayer, STONE.WHITE);
  game.play({ x: 1, y: 0 });
  assert.equal(game.currentPlayer, STONE.BLACK);
});

test('play returns ok with correct fields', () => {
  const game = createGame({ size: 9 });
  const result = game.play({ x: 2, y: 2 });
  assert.equal(result.ok, true);
  assert.equal(result.moveNumber, 1);
  assert.equal(result.player, STONE.BLACK);
  assert.equal(typeof result.vertex, 'string');
});

test('rejects occupied intersection', () => {
  const game = createGame({ size: 9 });
  game.play({ x: 0, y: 0 });
  const result = game.play({ x: 0, y: 0 });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'occupied');
});

test('rejects out-of-bounds move', () => {
  const game = createGame({ size: 9 });
  const result = game.play({ x: 9, y: 0 });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'out_of_bounds');
});

test('rejects invalid point', () => {
  const game = createGame({ size: 9 });
  const result = game.play('ZZ99');
  assert.equal(result.ok, false);
  assert.equal(result.code, 'invalid_point');
});

test('accepts vertex strings', () => {
  const game = createGame({ size: 9 });
  const result = game.play('D4');
  assert.equal(result.ok, true);
});

// --- Captures ---

test('single stone capture', () => {
  // White at (1,1), Black surrounds from all four sides
  const g = createGame({ size: 9 });
  g.play({ x: 0, y: 1 }); // B
  g.play({ x: 1, y: 1 }); // W — target
  g.play({ x: 2, y: 1 }); // B
  g.play({ x: 4, y: 4 }); // W tenuki
  g.play({ x: 1, y: 0 }); // B
  g.play({ x: 4, y: 5 }); // W tenuki
  const capture = g.play({ x: 1, y: 2 }); // B — captures W at (1,1)
  assert.equal(capture.ok, true);
  assert.equal(capture.captures.length, 1);
  assert.equal(g.board.getStone({ x: 1, y: 1 }), STONE.CLEAR);
});

test('multi-stone group capture', () => {
  // W at (1,0) and (2,0) on top edge, B surrounds: (0,0),(3,0),(1,1),(2,1)
  const g = createGame({ size: 9 });
  g.play({ x: 0, y: 0 }); // B
  g.play({ x: 1, y: 0 }); // W
  g.play({ x: 3, y: 0 }); // B
  g.play({ x: 2, y: 0 }); // W
  g.play({ x: 1, y: 1 }); // B
  g.play({ x: 5, y: 5 }); // W tenuki
  const result = g.play({ x: 2, y: 1 }); // B captures W group
  assert.equal(result.ok, true);
  assert.equal(result.captures.length, 2);
  assert.equal(g.board.getStone({ x: 1, y: 0 }), STONE.CLEAR);
  assert.equal(g.board.getStone({ x: 2, y: 0 }), STONE.CLEAR);
});

test('capture increments captures count', () => {
  const g = createGame({ size: 9 });
  g.play({ x: 0, y: 1 }); // B
  g.play({ x: 0, y: 0 }); // W — corner
  g.play({ x: 1, y: 0 }); // B — captures W at (0,0)
  assert.equal(g.captures.black, 1);
  assert.equal(g.captures.white, 0);
});

test('corner capture works with fewer liberties', () => {
  const g = createGame({ size: 9 });
  g.play({ x: 1, y: 0 }); // B
  g.play({ x: 0, y: 0 }); // W — corner, only liberty is (0,1)
  const result = g.play({ x: 0, y: 1 }); // B captures
  assert.equal(result.ok, true);
  assert.equal(result.captures.length, 1);
  assert.equal(g.board.getStone({ x: 0, y: 0 }), STONE.CLEAR);
});

// --- Ko ---

// Helper: creates a standard ko position on a 9×9 board.
// After setup, Black can capture W(3,4) by playing (4,4), creating ko.
//
//   y=3: . . . B W . . . .
//   y=4: . . B W . W . . .
//   y=5: . . . B W . . . .
//
// W(3,4) has one liberty at (4,4). After B captures it, B(4,4) has one
// liberty at (3,4), setting the ko point there.
function createKoGame(options = {}) {
  const g = createGame({ size: 9, ...options });
  g.applySetup({
    black: [
      { x: 3, y: 3 },
      { x: 2, y: 4 },
      { x: 3, y: 5 },
    ],
    white: [
      { x: 4, y: 3 },
      { x: 3, y: 4 },
      { x: 5, y: 4 },
      { x: 4, y: 5 },
    ],
  });
  return g;
}

test('simple ko: cannot retake immediately', () => {
  const g = createKoGame();

  const cap = g.play({ x: 4, y: 4 }); // B captures W(3,4)
  assert.equal(cap.ok, true);
  assert.equal(cap.captures.length, 1);
  assert.equal(g.board.getStone({ x: 3, y: 4 }), STONE.CLEAR);
  assert.notEqual(g.koPoint, null);

  const retake = g.play({ x: 3, y: 4 }); // W tries to retake — ko!
  assert.equal(retake.ok, false);
  assert.equal(retake.code, 'ko');
});

test('ko point clears after intervening move', () => {
  const g = createKoGame();
  g.play({ x: 4, y: 4 }); // B captures, ko set
  assert.notEqual(g.koPoint, null);

  g.play({ x: 8, y: 8 }); // W plays elsewhere (ko threat)
  assert.equal(g.koPoint, null);
});

test('ko point clears after pass', () => {
  const g = createKoGame();
  g.play({ x: 4, y: 4 }); // B captures, ko set
  g.pass(); // W passes
  assert.equal(g.koPoint, null);
});

test('ko = none disables ko check', () => {
  const g = createKoGame({ rules: { ko: 'none' } });
  g.play({ x: 4, y: 4 }); // B captures
  const retake = g.play({ x: 3, y: 4 }); // W retakes — allowed!
  assert.equal(retake.ok, true);
});

// --- Suicide ---

test('default rules forbid suicide', () => {
  const g = createGame({ size: 9 });
  g.applySetup({
    white: [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ],
  });
  // B plays (0,0) — corner, surrounded by W → suicide
  const result = g.play({ x: 0, y: 0 });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'suicide');
});

test('suicide = allowed permits self-capture', () => {
  const g = createGame({ size: 9, rules: { suicide: 'allowed' } });
  g.applySetup({
    white: [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ],
  });
  const result = g.play({ x: 0, y: 0 });
  assert.equal(result.ok, true);
  // Stone is placed (game records the suicide move); stone remains on board
  assert.equal(g.board.getStone({ x: 0, y: 0 }), STONE.BLACK);
});

test('move that captures opponent first is not suicide', () => {
  // W at (0,0) in corner with only liberty at (0,1).
  // B at (1,0) already occupies one neighbor.
  // B plays (0,1) — captures W(0,0) first, so B(0,1) gains a liberty. Not suicide.
  const g = createGame({ size: 9 });
  g.play({ x: 1, y: 0 }); // B
  g.play({ x: 0, y: 0 }); // W in corner
  const result = g.play({ x: 0, y: 1 }); // B captures W(0,0)
  assert.equal(result.ok, true);
  assert.equal(result.captures.length, 1);
});

// --- Pass ---

test('pass returns ok with pass flag', () => {
  const g = createGame({ size: 9 });
  const result = g.pass();
  assert.equal(result.ok, true);
  assert.equal(result.pass, true);
});

test('pass alternates player', () => {
  const g = createGame({ size: 9 });
  assert.equal(g.currentPlayer, STONE.BLACK);
  g.pass();
  assert.equal(g.currentPlayer, STONE.WHITE);
});

test('pass clears ko point', () => {
  const g = createKoGame();
  g.play({ x: 4, y: 4 }); // creates ko
  assert.notEqual(g.koPoint, null);
  g.pass();
  assert.equal(g.koPoint, null);
});

// --- Undo / Redo ---

test('undo restores board state and captures', () => {
  const g = createGame({ size: 9 });
  g.play({ x: 1, y: 0 }); // B
  g.play({ x: 0, y: 0 }); // W corner
  g.play({ x: 0, y: 1 }); // B captures W(0,0)
  assert.equal(g.captures.black, 1);
  assert.equal(g.board.getStone({ x: 0, y: 0 }), STONE.CLEAR);

  const result = g.undo();
  assert.equal(result.ok, true);
  assert.equal(g.captures.black, 0);
  assert.equal(g.board.getStone({ x: 0, y: 0 }), STONE.WHITE);
  assert.equal(g.board.getStone({ x: 0, y: 1 }), STONE.CLEAR);
});

test('undo at start returns no_history', () => {
  const g = createGame({ size: 9 });
  const result = g.undo();
  assert.equal(result.ok, false);
  assert.equal(result.code, 'no_history');
});

test('redo replays move', () => {
  const g = createGame({ size: 9 });
  g.play({ x: 3, y: 3 });
  g.undo();
  assert.equal(g.board.getStone({ x: 3, y: 3 }), STONE.CLEAR);
  const result = g.redo();
  assert.equal(result.ok, true);
  assert.equal(g.board.getStone({ x: 3, y: 3 }), STONE.BLACK);
});

test('redo with no future returns no_future', () => {
  const g = createGame({ size: 9 });
  const result = g.redo();
  assert.equal(result.ok, false);
  assert.equal(result.code, 'no_future');
});

test('new move after undo clears redo history', () => {
  const g = createGame({ size: 9 });
  g.play({ x: 3, y: 3 });
  g.undo();
  g.play({ x: 4, y: 4 }); // different move
  const result = g.redo();
  assert.equal(result.ok, false);
  assert.equal(result.code, 'no_future');
});

// --- Setup & Reset ---

test('applySetup places black and white stones', () => {
  const g = createGame({ size: 9 });
  g.applySetup({
    black: [{ x: 3, y: 3 }],
    white: [{ x: 5, y: 5 }],
  });
  assert.equal(g.board.getStone({ x: 3, y: 3 }), STONE.BLACK);
  assert.equal(g.board.getStone({ x: 5, y: 5 }), STONE.WHITE);
});

test('reset clears everything', () => {
  const g = createGame({ size: 9 });
  g.play({ x: 3, y: 3 });
  g.play({ x: 4, y: 4 });
  g.reset();
  assert.equal(g.board.getStone({ x: 3, y: 3 }), STONE.CLEAR);
  assert.equal(g.moveNumber, 0);
  assert.equal(g.captures.black, 0);
  assert.equal(g.captures.white, 0);
  assert.equal(g.currentPlayer, STONE.BLACK);
});
