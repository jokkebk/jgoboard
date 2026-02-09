import assert from 'node:assert/strict';
import test from 'node:test';

import { createGameTree, createCursor, STONE } from '../src/core.js';

// ============================================================
// GameTree
// ============================================================

test('GameTree: construction creates root node', () => {
  const tree = createGameTree({ size: 9 });
  assert.equal(tree.getNodeCount(), 1);
  assert.equal(tree.hasNode(tree.rootId), true);
  const root = tree.getNode();
  assert.equal(root.parentId, null);
});

test('GameTree: appendNode adds a child', () => {
  const tree = createGameTree({ size: 9 });
  const child = tree.appendNode(tree.rootId, {
    action: { type: 'play', vertex: 'D4' },
    info: { player: STONE.BLACK },
  });
  assert.equal(tree.getNodeCount(), 2);
  assert.equal(child.parentId, tree.rootId);
  assert.equal(child.action.type, 'play');
  assert.equal(child.action.vertex, 'D4');
});

test('GameTree: appendChild adds a child', () => {
  const tree = createGameTree({ size: 9 });
  const child = tree.appendChild(tree.rootId, { type: 'play', vertex: 'E5' }, { player: STONE.BLACK });
  assert.equal(tree.getNodeCount(), 2);
  assert.equal(child.action.vertex, 'E5');
});

test('GameTree: getNode returns cloned node', () => {
  const tree = createGameTree({ size: 9 });
  const a = tree.getNode(tree.rootId);
  const b = tree.getNode(tree.rootId);
  assert.notEqual(a, b);
  assert.deepEqual(a.id, b.id);
});

test('GameTree: getChildren returns children', () => {
  const tree = createGameTree({ size: 9 });
  tree.appendChild(tree.rootId, { type: 'play', vertex: 'D4' }, { player: STONE.BLACK });
  tree.appendChild(tree.rootId, { type: 'play', vertex: 'Q16' }, { player: STONE.BLACK });
  const children = tree.getChildren(tree.rootId);
  assert.equal(children.length, 2);
});

test('GameTree: getParent returns parent node', () => {
  const tree = createGameTree({ size: 9 });
  const child = tree.appendChild(tree.rootId, { type: 'play', vertex: 'D4' }, { player: STONE.BLACK });
  const parent = tree.getParent(child.id);
  assert.equal(parent.id, tree.rootId);
});

test('GameTree: getParent of root is null', () => {
  const tree = createGameTree({ size: 9 });
  assert.equal(tree.getParent(tree.rootId), null);
});

test('GameTree: getPath returns root-to-node path', () => {
  const tree = createGameTree({ size: 9 });
  const n1 = tree.appendChild(tree.rootId, { type: 'play', vertex: 'D4' }, { player: STONE.BLACK });
  const n2 = tree.appendChild(n1.id, { type: 'play', vertex: 'Q16' }, { player: STONE.WHITE });
  const path = tree.getPath(n2.id);
  assert.deepEqual(path, [tree.rootId, n1.id, n2.id]);
});

test('GameTree: findChildByAction matches play action', () => {
  const tree = createGameTree({ size: 9 });
  tree.appendChild(tree.rootId, { type: 'play', vertex: 'D4' }, { player: STONE.BLACK });
  tree.appendChild(tree.rootId, { type: 'play', vertex: 'Q16' }, { player: STONE.BLACK });
  const found = tree.findChildByAction(tree.rootId, { type: 'play', vertex: 'Q16' });
  assert.notEqual(found, null);
  assert.equal(found.action.vertex, 'Q16');
});

test('GameTree: findChildByAction matches pass action', () => {
  const tree = createGameTree({ size: 9 });
  tree.appendChild(tree.rootId, { type: 'pass' }, { player: STONE.BLACK });
  const found = tree.findChildByAction(tree.rootId, { type: 'pass' });
  assert.notEqual(found, null);
  assert.equal(found.action.type, 'pass');
});

test('GameTree: findChildByAction returns null when no match', () => {
  const tree = createGameTree({ size: 9 });
  tree.appendChild(tree.rootId, { type: 'play', vertex: 'D4' }, { player: STONE.BLACK });
  const found = tree.findChildByAction(tree.rootId, { type: 'play', vertex: 'E5' });
  assert.equal(found, null);
});

test('GameTree: hasNode returns true/false', () => {
  const tree = createGameTree({ size: 9 });
  assert.equal(tree.hasNode(tree.rootId), true);
  assert.equal(tree.hasNode('nonexistent'), false);
});

test('GameTree: getNodeCount is accurate after adds', () => {
  const tree = createGameTree({ size: 9 });
  assert.equal(tree.getNodeCount(), 1);
  tree.appendChild(tree.rootId, { type: 'play', vertex: 'D4' }, { player: STONE.BLACK });
  assert.equal(tree.getNodeCount(), 2);
  tree.appendChild(tree.rootId, { type: 'play', vertex: 'Q16' }, { player: STONE.BLACK });
  assert.equal(tree.getNodeCount(), 3);
});

test('GameTree: rejects invalid action type', () => {
  const tree = createGameTree({ size: 9 });
  assert.throws(() => {
    tree.appendNode(tree.rootId, { action: { type: 'invalid' } });
  });
});

test('GameTree: rejects play action without vertex', () => {
  const tree = createGameTree({ size: 9 });
  assert.throws(() => {
    tree.appendNode(tree.rootId, { action: { type: 'play' } });
  });
});

// ============================================================
// GameCursor
// ============================================================

test('GameCursor: next advances to first child', () => {
  const tree = createGameTree({ size: 9 });
  tree.appendChild(tree.rootId, { type: 'play', vertex: 'D4' }, { player: STONE.BLACK, moveNumber: 1 });
  const cursor = createCursor(tree);
  const result = cursor.next();
  assert.equal(result.ok, true);
  assert.equal(cursor.board.getStone({ x: 3, y: 5 }), STONE.BLACK); // D4 on 9×9
});

test('GameCursor: prev goes back to parent', () => {
  const tree = createGameTree({ size: 9 });
  tree.appendChild(tree.rootId, { type: 'play', vertex: 'D4' }, { player: STONE.BLACK, moveNumber: 1 });
  const cursor = createCursor(tree);
  cursor.next();
  assert.equal(cursor.board.getStone({ x: 3, y: 5 }), STONE.BLACK);
  const result = cursor.prev();
  assert.equal(result.ok, true);
  assert.equal(cursor.board.getStone({ x: 3, y: 5 }), STONE.CLEAR);
});

test('GameCursor: next at leaf returns no_next', () => {
  const tree = createGameTree({ size: 9 });
  const cursor = createCursor(tree);
  const result = cursor.next();
  assert.equal(result.ok, false);
  assert.equal(result.code, 'no_next');
});

test('GameCursor: prev at root returns no_prev', () => {
  const tree = createGameTree({ size: 9 });
  const cursor = createCursor(tree);
  const result = cursor.prev();
  assert.equal(result.ok, false);
  assert.equal(result.code, 'no_prev');
});

test('GameCursor: play creates new tree node and advances', () => {
  const tree = createGameTree({ size: 9 });
  const cursor = createCursor(tree);
  const result = cursor.play('E5');
  assert.equal(result.ok, true);
  assert.equal(result.created, true);
  assert.equal(tree.getNodeCount(), 2);
  assert.equal(cursor.board.getStone({ x: 4, y: 4 }), STONE.BLACK); // E5 on 9×9
});

test('GameCursor: play reuses existing child if action matches', () => {
  const tree = createGameTree({ size: 9 });
  tree.appendChild(tree.rootId, { type: 'play', vertex: 'E5' }, { player: STONE.BLACK, moveNumber: 1 });
  const cursor = createCursor(tree);
  const result = cursor.play('E5');
  assert.equal(result.ok, true);
  assert.equal(result.created, false);
  assert.equal(tree.getNodeCount(), 2); // no new node
});

test('GameCursor: pass works', () => {
  const tree = createGameTree({ size: 9 });
  const cursor = createCursor(tree);
  const result = cursor.pass();
  assert.equal(result.ok, true);
  assert.equal(result.pass, true);
  assert.equal(result.created, true);
  assert.equal(tree.getNodeCount(), 2);
});

test('GameCursor: gotoNode jumps to arbitrary node', () => {
  const tree = createGameTree({ size: 9 });
  const n1 = tree.appendChild(tree.rootId, { type: 'play', vertex: 'D4' }, { player: STONE.BLACK, moveNumber: 1 });
  const n2 = tree.appendChild(n1.id, { type: 'play', vertex: 'F6' }, { player: STONE.WHITE, moveNumber: 2 });
  const cursor = createCursor(tree);

  const result = cursor.gotoNode(n2.id);
  assert.equal(result.ok, true);
  assert.equal(cursor.currentNodeId, n2.id);
  assert.equal(cursor.board.getStone({ x: 3, y: 5 }), STONE.BLACK); // D4
  assert.equal(cursor.board.getStone({ x: 5, y: 3 }), STONE.WHITE); // F6
});

test('GameCursor: gotoNode replays from root correctly', () => {
  const tree = createGameTree({ size: 9 });
  const n1 = tree.appendChild(tree.rootId, { type: 'play', vertex: 'D4' }, { player: STONE.BLACK, moveNumber: 1 });
  const n2 = tree.appendChild(n1.id, { type: 'play', vertex: 'F6' }, { player: STONE.WHITE, moveNumber: 2 });
  const cursor = createCursor(tree);

  cursor.gotoNode(n2.id);
  assert.equal(cursor.board.getStone({ x: 3, y: 5 }), STONE.BLACK); // D4 on 9×9
  assert.equal(cursor.board.getStone({ x: 5, y: 3 }), STONE.WHITE); // F6 on 9×9
  assert.equal(cursor.getPath().length, 3); // root → n1 → n2
});

test('GameCursor: setVariation switches branch', () => {
  const tree = createGameTree({ size: 9 });
  // Two variations from root
  tree.appendChild(tree.rootId, { type: 'play', vertex: 'D4' }, { player: STONE.BLACK, moveNumber: 1 });
  tree.appendChild(tree.rootId, { type: 'play', vertex: 'E5' }, { player: STONE.BLACK, moveNumber: 1 });

  const cursor = createCursor(tree);
  cursor.next(); // goes to D4 (variation 0)
  assert.equal(cursor.board.getStone({ x: 3, y: 5 }), STONE.BLACK); // D4

  // Switch to variation 1 at level 0 (root's children)
  const result = cursor.setVariation(0, 1);
  assert.equal(result.ok, true);
  assert.equal(cursor.board.getStone({ x: 4, y: 4 }), STONE.BLACK); // E5
  assert.equal(cursor.board.getStone({ x: 3, y: 5 }), STONE.CLEAR); // D4 cleared
});

test('GameCursor: getState returns correct ply and path', () => {
  const tree = createGameTree({ size: 9 });
  tree.appendChild(tree.rootId, { type: 'play', vertex: 'D4' }, { player: STONE.BLACK, moveNumber: 1 });
  const cursor = createCursor(tree);

  let state = cursor.getState();
  assert.equal(state.ply, 0);
  assert.equal(state.path.length, 1);

  cursor.next();
  state = cursor.getState();
  assert.equal(state.ply, 1);
  assert.equal(state.path.length, 2);
});

test('GameCursor: getVariations lists child actions', () => {
  const tree = createGameTree({ size: 9 });
  tree.appendChild(tree.rootId, { type: 'play', vertex: 'D4' }, { player: STONE.BLACK, moveNumber: 1 });
  tree.appendChild(tree.rootId, { type: 'pass' }, { player: STONE.BLACK, moveNumber: 1 });
  const cursor = createCursor(tree);

  const vars = cursor.getVariations();
  assert.equal(vars.length, 2);
  assert.equal(vars[0].type, 'play');
  assert.equal(vars[0].vertex, 'D4');
  assert.equal(vars[1].type, 'pass');
  assert.equal(vars[1].vertex, null);
});
