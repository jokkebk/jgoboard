import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createCursor, STONE } from '../src/core.js';
import { SgfParseError, gameTreeFromSgf, parseSgf, sgfFromGameTree } from '../src/sgf/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test('parseSgf parses a basic SGF collection', () => {
  const ast = parseSgf('(;GM[1]FF[4]SZ[9];B[aa](;W[bb])(;W[cc]))');

  assert.equal(ast.type, 'collection');
  assert.equal(ast.trees.length, 1);
  assert.equal(ast.trees[0].sequence.length, 2);
  assert.equal(ast.trees[0].variations.length, 2);
  assert.deepEqual(ast.trees[0].sequence[0].properties.SZ, ['9']);
});

test('parseSgf strict mode rejects lowercase property identifiers', () => {
  assert.throws(() => parseSgf('(;sz[9];b[aa])'), SgfParseError);

  const permissive = parseSgf('(;sz[9];b[aa])', { mode: 'permissive' });
  assert.deepEqual(permissive.trees[0].sequence[0].properties.SZ, ['9']);
  assert.deepEqual(permissive.trees[0].sequence[1].properties.B, ['aa']);
});

test('gameTreeFromSgf applies handicap setup from the SGF root', async () => {
  const sgf = await readFile(resolve(__dirname, '../demo.sgf'), 'utf8');
  const tree = gameTreeFromSgf(sgf);
  const cursor = createCursor(tree);

  assert.equal(cursor.board.getStone({ x: 3, y: 3 }), STONE.BLACK);
  assert.equal(cursor.board.getStone({ x: 15, y: 3 }), STONE.BLACK);
  assert.equal(cursor.board.getStone({ x: 3, y: 15 }), STONE.BLACK);
  assert.equal(cursor.board.getStone({ x: 15, y: 15 }), STONE.BLACK);

  const next = cursor.next();
  assert.equal(next.ok, true);
  assert.equal(cursor.getPath().length > 1, true);
});

test('setup nodes are applied during cursor navigation', () => {
  const tree = gameTreeFromSgf('(;SZ[5];AB[aa][bb];B[cc])');
  const cursor = createCursor(tree);

  assert.equal(cursor.board.getStone({ x: 0, y: 0 }), STONE.CLEAR);

  assert.equal(cursor.next().ok, true);
  assert.equal(cursor.board.getStone({ x: 0, y: 0 }), STONE.BLACK);
  assert.equal(cursor.board.getStone({ x: 1, y: 1 }), STONE.BLACK);

  assert.equal(cursor.prev().ok, true);
  assert.equal(cursor.board.getStone({ x: 0, y: 0 }), STONE.CLEAR);

  assert.equal(cursor.next().ok, true);
  assert.equal(cursor.next().ok, true);
  assert.equal(cursor.board.getStone({ x: 2, y: 2 }), STONE.BLACK);
});

test('sgfFromGameTree round-trips deterministically', () => {
  const input = '(;GM[1]FF[4]SZ[9]C[root];B[cc]C[first](;W[dd])(;W[ee]C[var]))';

  const tree = gameTreeFromSgf(input);
  const sgfA = sgfFromGameTree(tree);
  const tree2 = gameTreeFromSgf(sgfA);
  const sgfB = sgfFromGameTree(tree2);

  assert.equal(sgfA, sgfB);
});
