import { STONE } from './constants.js';
import { createGame } from './game.js';

const ROOT_NODE_ID = 'root';

function resolveBoardSize(options = {}) {
  const width = Number.isInteger(options.width)
    ? options.width
    : Number.isInteger(options.size)
      ? options.size
      : undefined;
  const height = Number.isInteger(options.height)
    ? options.height
    : Number.isInteger(options.size)
      ? options.size
      : undefined;

  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error('createGameTree requires positive integer size or width/height');
  }

  return { width, height };
}

function defaultStartingPlayer(player) {
  return player === STONE.WHITE ? STONE.WHITE : STONE.BLACK;
}

function cloneAction(action) {
  if (!action) {
    return null;
  }

  if (action.type === 'pass') {
    return { type: 'pass' };
  }

  return {
    type: 'play',
    vertex: action.vertex,
  };
}

function cloneInfo(info) {
  if (!info) {
    return {
      player: null,
      moveNumber: 0,
      captures: [],
      ko: null,
    };
  }

  return {
    player: info.player ?? null,
    moveNumber: info.moveNumber ?? 0,
    captures: Array.isArray(info.captures) ? [...info.captures] : [],
    ko: info.ko ?? null,
  };
}

function cloneNode(node) {
  return {
    id: node.id,
    parentId: node.parentId,
    children: [...node.children],
    action: cloneAction(node.action),
    info: cloneInfo(node.info),
  };
}

function actionsEqual(a, b) {
  if (!a || !b || a.type !== b.type) {
    return false;
  }

  if (a.type === 'pass') {
    return true;
  }

  return a.vertex === b.vertex;
}

export class GameTree {
  constructor(options = {}) {
    const { width, height } = resolveBoardSize(options);

    this.width = width;
    this.height = height;
    this.rules = options.rules || null;
    this.startingPlayer = defaultStartingPlayer(options.startingPlayer);
    this.rootId = ROOT_NODE_ID;

    this._nextNodeIndex = 1;
    this._nodes = new Map();
    this._listeners = new Set();

    this._nodes.set(this.rootId, {
      id: this.rootId,
      parentId: null,
      children: [],
      action: null,
      info: {
        player: null,
        moveNumber: 0,
        captures: [],
        ko: null,
      },
    });
  }

  onChange(listener) {
    this._listeners.add(listener);

    return () => {
      this._listeners.delete(listener);
    };
  }

  _emit(change) {
    for (const listener of this._listeners) {
      listener(change);
    }
  }

  _getNode(nodeId) {
    const node = this._nodes.get(nodeId);

    if (!node) {
      throw new Error(`node not found: ${nodeId}`);
    }

    return node;
  }

  _createNodeId() {
    const id = `n${this._nextNodeIndex}`;
    this._nextNodeIndex += 1;
    return id;
  }

  hasNode(nodeId) {
    return this._nodes.has(nodeId);
  }

  getNode(nodeId = this.rootId) {
    return cloneNode(this._getNode(nodeId));
  }

  getChildren(nodeId = this.rootId) {
    const node = this._getNode(nodeId);
    return node.children.map((childId) => cloneNode(this._getNode(childId)));
  }

  getParent(nodeId) {
    const node = this._getNode(nodeId);
    return node.parentId ? cloneNode(this._getNode(node.parentId)) : null;
  }

  getNodeCount() {
    return this._nodes.size;
  }

  getPath(nodeId) {
    let cursor = this._getNode(nodeId);
    const path = [cursor.id];

    while (cursor.parentId) {
      cursor = this._getNode(cursor.parentId);
      path.push(cursor.id);
    }

    path.reverse();
    return path;
  }

  findChildByAction(parentId, action, player = null) {
    const parent = this._getNode(parentId);

    for (const childId of parent.children) {
      const child = this._getNode(childId);

      if (!actionsEqual(child.action, action)) {
        continue;
      }

      if (player !== null && child.info.player !== player) {
        continue;
      }

      return cloneNode(child);
    }

    return null;
  }

  appendChild(parentId, action, info = {}) {
    const parent = this._getNode(parentId);

    if (!action || (action.type !== 'play' && action.type !== 'pass')) {
      throw new Error('appendChild requires action.type to be "play" or "pass"');
    }

    if (action.type === 'play' && !action.vertex) {
      throw new Error('appendChild play action requires a vertex');
    }

    const id = this._createNodeId();
    const node = {
      id,
      parentId,
      children: [],
      action: cloneAction(action),
      info: cloneInfo(info),
    };

    this._nodes.set(id, node);
    parent.children.push(id);

    this._emit({
      type: 'nodeAdded',
      nodeId: id,
      parentId,
      action: cloneAction(node.action),
      info: cloneInfo(node.info),
    });

    return cloneNode(node);
  }
}

export class GameCursor {
  constructor(tree, options = {}) {
    if (!(tree instanceof GameTree)) {
      throw new Error('createCursor requires a GameTree instance');
    }

    this.tree = tree;
    this.game = createGame({
      width: tree.width,
      height: tree.height,
      rules: tree.rules,
      startingPlayer: tree.startingPlayer,
      ...(options.board ? { board: options.board } : {}),
    });
    this.board = this.game.board;

    this.currentNodeId = tree.rootId;
    this._path = [tree.rootId];
    this._listeners = new Set();

    if (options.nodeId) {
      const moved = this.gotoNode(options.nodeId);
      if (!moved.ok) {
        throw new Error(`Unable to initialize cursor at node ${options.nodeId}: ${moved.code}`);
      }
    }
  }

  onChange(listener) {
    this._listeners.add(listener);

    return () => {
      this._listeners.delete(listener);
    };
  }

  _emit(change) {
    for (const listener of this._listeners) {
      listener(change, this.getState());
    }
  }

  _error(code, message) {
    return {
      ok: false,
      code,
      message,
    };
  }

  _variationIndexOf(nodeId) {
    const node = this.tree._getNode(nodeId);

    if (!node.parentId) {
      return -1;
    }

    const parent = this.tree._getNode(node.parentId);
    return parent.children.indexOf(nodeId);
  }

  _applyNode(node) {
    if (!node.action) {
      return this._error('invalid_node', `Node ${node.id} has no action`);
    }

    const result =
      node.action.type === 'pass' ? this.game.pass() : this.game.play(node.action.vertex);

    if (!result.ok) {
      return this._error(
        'tree_desync',
        `Failed to apply node ${node.id} (${node.action.type}): ${result.code}`
      );
    }

    if (node.info.player !== null && result.player !== node.info.player) {
      return this._error('tree_desync', `Player mismatch while applying node ${node.id}`);
    }

    return result;
  }

  _stepToNode(nodeId) {
    const node = this.tree._getNode(nodeId);
    const applied = this._applyNode(node);

    if (!applied.ok) {
      return applied;
    }

    this.currentNodeId = node.id;
    this._path.push(node.id);
    return applied;
  }

  getCurrentNode() {
    return this.tree.getNode(this.currentNodeId);
  }

  getPath() {
    return [...this._path];
  }

  getVariations(nodeId = this.currentNodeId) {
    const node = this.tree._getNode(nodeId);

    return node.children.map((childId, index) => {
      const child = this.tree._getNode(childId);

      return {
        index,
        nodeId: child.id,
        type: child.action.type,
        vertex: child.action.type === 'play' ? child.action.vertex : null,
        player: child.info.player,
        moveNumber: child.info.moveNumber,
      };
    });
  }

  getState() {
    return {
      currentNodeId: this.currentNodeId,
      ply: this._path.length - 1,
      path: [...this._path],
      variationIndex: this._variationIndexOf(this.currentNodeId),
      nodeCount: this.tree.getNodeCount(),
      variations: this.getVariations(),
      game: this.game.getState(),
    };
  }

  play(pointOrVertex) {
    const result = this.game.play(pointOrVertex);

    if (!result.ok) {
      return result;
    }

    const parentId = this.currentNodeId;
    const action = {
      type: 'play',
      vertex: result.vertex,
    };

    let child = this.tree.findChildByAction(parentId, action, result.player);
    let created = false;

    if (!child) {
      child = this.tree.appendChild(parentId, action, {
        player: result.player,
        moveNumber: result.moveNumber,
        captures: result.captures,
        ko: result.ko,
      });
      created = true;
    }

    this.currentNodeId = child.id;
    this._path.push(child.id);

    const variationIndex = this._variationIndexOf(child.id);
    const payload = {
      ...result,
      nodeId: child.id,
      created,
      variationIndex,
    };

    this._emit({ type: 'play', result: payload });

    return payload;
  }

  pass() {
    const result = this.game.pass();

    if (!result.ok) {
      return result;
    }

    const parentId = this.currentNodeId;
    const action = { type: 'pass' };

    let child = this.tree.findChildByAction(parentId, action, result.player);
    let created = false;

    if (!child) {
      child = this.tree.appendChild(parentId, action, {
        player: result.player,
        moveNumber: result.moveNumber,
        captures: [],
        ko: null,
      });
      created = true;
    }

    this.currentNodeId = child.id;
    this._path.push(child.id);

    const variationIndex = this._variationIndexOf(child.id);
    const payload = {
      ...result,
      nodeId: child.id,
      created,
      variationIndex,
    };

    this._emit({ type: 'pass', result: payload });

    return payload;
  }

  prev() {
    if (this.currentNodeId === this.tree.rootId) {
      return this._error('no_prev', 'Already at root node');
    }

    const leavingId = this.currentNodeId;
    const parentId = this.tree._getNode(leavingId).parentId;
    const undone = this.game.undo();

    if (!undone.ok) {
      return this._error('cursor_undo_failed', undone.message || 'Undo failed');
    }

    this.currentNodeId = parentId;
    this._path.pop();

    const payload = {
      ok: true,
      nodeId: this.currentNodeId,
      fromNodeId: leavingId,
      moveNumber: undone.moveNumber,
    };

    this._emit({ type: 'prev', result: payload });

    return payload;
  }

  next(options = {}) {
    const variationIndex = Number.isInteger(options.variationIndex) ? options.variationIndex : 0;
    const node = this.tree._getNode(this.currentNodeId);

    if (node.children.length === 0) {
      return this._error('no_next', 'No next moves from current node');
    }

    if (variationIndex < 0 || variationIndex >= node.children.length) {
      return this._error('variation_index', 'Variation index is out of range');
    }

    const targetId = node.children[variationIndex];
    const applied = this._stepToNode(targetId);

    if (!applied.ok) {
      return applied;
    }

    const payload = {
      ok: true,
      nodeId: targetId,
      variationIndex,
      moveNumber: this.game.moveNumber,
    };

    this._emit({ type: 'next', result: payload });

    return payload;
  }

  gotoNode(nodeId) {
    if (!this.tree.hasNode(nodeId)) {
      return this._error('node_not_found', `Node does not exist: ${nodeId}`);
    }

    const path = this.tree.getPath(nodeId);

    this.game.reset();
    this.currentNodeId = this.tree.rootId;
    this._path = [this.tree.rootId];

    for (const stepId of path.slice(1)) {
      const applied = this._stepToNode(stepId);

      if (!applied.ok) {
        return applied;
      }
    }

    const payload = {
      ok: true,
      nodeId: this.currentNodeId,
      ply: this._path.length - 1,
    };

    this._emit({ type: 'gotoNode', result: payload });

    return payload;
  }

  setVariation(level, variationIndex) {
    if (!Number.isInteger(level) || level < 0) {
      return this._error('level', 'Level must be a non-negative integer');
    }

    if (!Number.isInteger(variationIndex) || variationIndex < 0) {
      return this._error('variation_index', 'Variation index must be a non-negative integer');
    }

    if (level >= this._path.length) {
      return this._error('level', 'Level is out of current path range');
    }

    const parentId = this._path[level];
    const parent = this.tree._getNode(parentId);

    if (variationIndex >= parent.children.length) {
      return this._error('variation_index', 'Variation index is out of range for the level');
    }

    const chosenId = parent.children[variationIndex];
    const targetPath = this._path.slice(0, level + 1);
    targetPath.push(chosenId);

    let currentId = chosenId;
    let oldIndex = level + 2;

    while (true) {
      const current = this.tree._getNode(currentId);
      if (current.children.length === 0) {
        break;
      }

      const previousCandidate = this._path[oldIndex];
      if (previousCandidate && current.children.includes(previousCandidate)) {
        currentId = previousCandidate;
      } else {
        currentId = current.children[0];
      }

      targetPath.push(currentId);
      oldIndex += 1;
    }

    const targetId = targetPath[targetPath.length - 1];
    return this.gotoNode(targetId);
  }
}

export function createGameTree(options) {
  return new GameTree(options);
}

export function createCursor(tree, options) {
  return new GameCursor(tree, options);
}
