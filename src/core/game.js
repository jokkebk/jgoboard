import { createBoard } from './board.js';
import { formatVertex, normalizePoint } from './coordinates.js';
import { STONE } from './constants.js';

const DEFAULT_RULES = Object.freeze({
  ko: 'simple',
  suicide: 'forbidden',
});

function oppositeStone(stone) {
  return stone === STONE.BLACK ? STONE.WHITE : STONE.BLACK;
}

function pointKey(point) {
  return `${point.x},${point.y}`;
}

function clonePoint(point) {
  return point ? { x: point.x, y: point.y } : null;
}

function clonePoints(points) {
  return points.map((point) => ({ x: point.x, y: point.y }));
}

function pointEquals(a, b) {
  return Boolean(a && b && a.x === b.x && a.y === b.y);
}

function inBounds(point, board) {
  return point.x >= 0 && point.y >= 0 && point.x < board.width && point.y < board.height;
}

function getNeighbors(point, board) {
  const neighbors = [];

  if (point.x > 0) {
    neighbors.push({ x: point.x - 1, y: point.y });
  }
  if (point.x + 1 < board.width) {
    neighbors.push({ x: point.x + 1, y: point.y });
  }
  if (point.y > 0) {
    neighbors.push({ x: point.x, y: point.y - 1 });
  }
  if (point.y + 1 < board.height) {
    neighbors.push({ x: point.x, y: point.y + 1 });
  }

  return neighbors;
}

function collectGroup(board, start, stone) {
  const queue = [start];
  const seen = new Set([pointKey(start)]);
  const stones = [];
  const liberties = new Set();

  while (queue.length > 0) {
    const point = queue.shift();
    stones.push(point);

    for (const next of getNeighbors(point, board)) {
      const nextStone = board.getStone(next);

      if (nextStone === STONE.CLEAR) {
        liberties.add(pointKey(next));
        continue;
      }

      if (nextStone !== stone) {
        continue;
      }

      const key = pointKey(next);
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      queue.push(next);
    }
  }

  return {
    stones,
    liberties,
  };
}

function normalizeRuleSet(input) {
  if (!input) {
    return { ...DEFAULT_RULES };
  }

  const rules = {
    ko: input.ko ?? DEFAULT_RULES.ko,
    suicide: input.suicide ?? DEFAULT_RULES.suicide,
  };

  if (!['simple', 'none'].includes(rules.ko)) {
    throw new Error(`unsupported ko rule: ${rules.ko}`);
  }

  if (!['forbidden', 'allowed'].includes(rules.suicide)) {
    throw new Error(`unsupported suicide rule: ${rules.suicide}`);
  }

  return rules;
}

function defaultStartingPlayer(stone) {
  if (stone === STONE.WHITE) {
    return STONE.WHITE;
  }

  return STONE.BLACK;
}

function formatMaybeVertex(point, boardHeight) {
  return point ? formatVertex(point, boardHeight) : null;
}

export class GameState {
  constructor(options = {}) {
    this.board = options.board || createBoard(options);
    this.rules = normalizeRuleSet(options.rules);
    this._startingPlayer = defaultStartingPlayer(options.startingPlayer);
    this.currentPlayer = this._startingPlayer;
    this.koPoint = null;
    this.moveNumber = 0;
    this.lastMove = null;
    this.captures = {
      black: 0,
      white: 0,
    };

    this._history = [];
    this._future = [];
    this._listeners = new Set();
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

  _resultError(code, message) {
    return {
      ok: false,
      code,
      message,
    };
  }

  _resultSuccess(entry, extra = {}) {
    return {
      ok: true,
      moveNumber: this.moveNumber,
      player: entry.player,
      vertex: formatMaybeVertex(entry.point, this.board.height),
      captures: entry.captures.map((point) => formatVertex(point, this.board.height)),
      ko: formatMaybeVertex(this.koPoint, this.board.height),
      nextPlayer: this.currentPlayer,
      ...extra,
    };
  }

  _record(entry) {
    this._history.push(entry);
    this._future = [];
    this.moveNumber += 1;
    this.lastMove = entry.point ? clonePoint(entry.point) : null;
  }

  _applyEntry(entry) {
    if (entry.type === 'pass') {
      this.currentPlayer = entry.nextPlayer;
      this.koPoint = clonePoint(entry.nextKo);
      return;
    }

    this.board.setStone(entry.point, entry.player);

    for (const capture of entry.captures) {
      this.board.setStone(capture, STONE.CLEAR);
    }

    if (entry.player === STONE.BLACK) {
      this.captures.black += entry.captures.length;
    } else {
      this.captures.white += entry.captures.length;
    }

    this.currentPlayer = entry.nextPlayer;
    this.koPoint = clonePoint(entry.nextKo);
  }

  _revertEntry(entry) {
    this.currentPlayer = entry.player;
    this.koPoint = clonePoint(entry.prevKo);

    if (entry.type === 'pass') {
      return;
    }

    this.board.setStone(entry.point, STONE.CLEAR);

    const opponent = oppositeStone(entry.player);
    for (const capture of entry.captures) {
      this.board.setStone(capture, opponent);
    }

    if (entry.player === STONE.BLACK) {
      this.captures.black -= entry.captures.length;
    } else {
      this.captures.white -= entry.captures.length;
    }
  }

  play(pointOrVertex) {
    let point;
    try {
      point = normalizePoint(pointOrVertex, this.board.height);
    } catch (_error) {
      return this._resultError('invalid_point', 'Move must be a valid board point or vertex');
    }

    if (!inBounds(point, this.board)) {
      return this._resultError('out_of_bounds', 'Move is out of board bounds');
    }

    if (this.board.getStone(point) !== STONE.CLEAR) {
      return this._resultError('occupied', 'Intersection is already occupied');
    }

    if (this.rules.ko === 'simple' && pointEquals(point, this.koPoint)) {
      return this._resultError('ko', 'Cannot retake ko immediately');
    }

    const player = this.currentPlayer;
    const opponent = oppositeStone(player);
    const previousKo = clonePoint(this.koPoint);

    this.board.setStone(point, player);

    const captures = [];
    const capturedKeys = new Set();

    for (const neighbor of getNeighbors(point, this.board)) {
      if (this.board.getStone(neighbor) !== opponent) {
        continue;
      }

      const group = collectGroup(this.board, neighbor, opponent);
      if (group.liberties.size > 0) {
        continue;
      }

      for (const stone of group.stones) {
        const key = pointKey(stone);
        if (capturedKeys.has(key)) {
          continue;
        }

        capturedKeys.add(key);
        captures.push(stone);
      }
    }

    for (const capture of captures) {
      this.board.setStone(capture, STONE.CLEAR);
    }

    const ownGroup = collectGroup(this.board, point, player);
    const hasLiberty = ownGroup.liberties.size > 0;

    if (!hasLiberty && this.rules.suicide !== 'allowed') {
      this.board.setStone(point, STONE.CLEAR);
      for (const capture of captures) {
        this.board.setStone(capture, opponent);
      }

      return this._resultError('suicide', 'Move has no liberties (suicide is forbidden)');
    }

    let nextKo = null;

    if (this.rules.ko === 'simple' && captures.length === 1 && ownGroup.stones.length === 1) {
      if (ownGroup.liberties.size === 1) {
        nextKo = clonePoint(captures[0]);
      }
    }

    const entry = {
      type: 'move',
      player,
      point,
      captures: clonePoints(captures),
      prevKo: previousKo,
      nextKo,
      nextPlayer: opponent,
    };

    this._record(entry);
    this._applyEntry(entry);

    this._emit({ type: 'play', entry: this._serializeEntry(entry) });

    return this._resultSuccess(entry);
  }

  pass() {
    const player = this.currentPlayer;
    const opponent = oppositeStone(player);

    const entry = {
      type: 'pass',
      player,
      point: null,
      captures: [],
      prevKo: clonePoint(this.koPoint),
      nextKo: null,
      nextPlayer: opponent,
    };

    this._record(entry);
    this._applyEntry(entry);

    this._emit({ type: 'pass', entry: this._serializeEntry(entry) });

    return this._resultSuccess(entry, { pass: true });
  }

  undo() {
    if (this._history.length === 0) {
      return this._resultError('no_history', 'Nothing to undo');
    }

    const entry = this._history.pop();
    this.moveNumber -= 1;
    this._future.push(entry);

    this._revertEntry(entry);

    const previous = this._history[this._history.length - 1] || null;
    this.lastMove = previous && previous.point ? clonePoint(previous.point) : null;

    this._emit({ type: 'undo', entry: this._serializeEntry(entry) });

    return {
      ok: true,
      moveNumber: this.moveNumber,
      restoredPlayer: this.currentPlayer,
      canRedo: this._future.length > 0,
    };
  }

  redo() {
    if (this._future.length === 0) {
      return this._resultError('no_future', 'Nothing to redo');
    }

    const entry = this._future.pop();

    this._history.push(entry);
    this.moveNumber += 1;
    this.lastMove = entry.point ? clonePoint(entry.point) : null;

    this._applyEntry(entry);

    this._emit({ type: 'redo', entry: this._serializeEntry(entry) });

    return this._resultSuccess(entry, { redone: true });
  }

  reset() {
    this.board.clear();
    this.currentPlayer = this._startingPlayer;
    this.koPoint = null;
    this.moveNumber = 0;
    this.lastMove = null;
    this.captures.black = 0;
    this.captures.white = 0;
    this._history = [];
    this._future = [];

    this._emit({ type: 'reset' });
  }

  getState() {
    return {
      width: this.board.width,
      height: this.board.height,
      moveNumber: this.moveNumber,
      currentPlayer: this.currentPlayer,
      captures: {
        black: this.captures.black,
        white: this.captures.white,
      },
      ko: formatMaybeVertex(this.koPoint, this.board.height),
      lastMove: formatMaybeVertex(this.lastMove, this.board.height),
      canUndo: this._history.length > 0,
      canRedo: this._future.length > 0,
      rules: {
        ko: this.rules.ko,
        suicide: this.rules.suicide,
      },
    };
  }

  _serializeEntry(entry) {
    return {
      type: entry.type,
      player: entry.player,
      vertex: formatMaybeVertex(entry.point, this.board.height),
      captures: entry.captures.map((point) => formatVertex(point, this.board.height)),
      prevKo: formatMaybeVertex(entry.prevKo, this.board.height),
      nextKo: formatMaybeVertex(entry.nextKo, this.board.height),
      nextPlayer: entry.nextPlayer,
    };
  }
}

export function createGame(options) {
  return new GameState(options);
}

export const rules = {
  japanese(options = {}) {
    return normalizeRuleSet({
      ko: options.ko ?? 'simple',
      suicide: options.suicide ?? 'forbidden',
    });
  },
  chinese(options = {}) {
    return normalizeRuleSet({
      ko: options.ko ?? 'simple',
      suicide: options.suicide ?? 'forbidden',
    });
  },
  aga(options = {}) {
    return normalizeRuleSet({
      ko: options.ko ?? 'simple',
      suicide: options.suicide ?? 'forbidden',
    });
  },
};
