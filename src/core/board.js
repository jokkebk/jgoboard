import { MARK, STONE } from './constants.js';
import { normalizePoint } from './coordinates.js';

function create2D(width, height, value) {
  return Array.from({ length: width }, () => Array.from({ length: height }, () => value));
}

export class BoardState {
  constructor(options = {}) {
    const size = options.size;
    const width = Number.isInteger(options.width) ? options.width : size;
    const height = Number.isInteger(options.height) ? options.height : size;

    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
      throw new Error('createBoard requires positive integer size or width/height');
    }

    this.width = width;
    this.height = height;
    this._stones = create2D(width, height, STONE.CLEAR);
    this._marks = create2D(width, height, MARK.NONE);
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
      listener(change);
    }
  }

  _resolvePoint(pointOrVertex) {
    const point = normalizePoint(pointOrVertex, this.height);

    if (point.x < 0 || point.y < 0 || point.x >= this.width || point.y >= this.height) {
      throw new Error(`point (${point.x}, ${point.y}) is out of board bounds`);
    }

    return point;
  }

  getStone(pointOrVertex) {
    const point = this._resolvePoint(pointOrVertex);
    return this._stones[point.x][point.y];
  }

  getMark(pointOrVertex) {
    const point = this._resolvePoint(pointOrVertex);
    return this._marks[point.x][point.y];
  }

  setStone(pointOrVertex, stone) {
    const point = this._resolvePoint(pointOrVertex);
    const oldStone = this._stones[point.x][point.y];

    if (oldStone === stone) {
      return false;
    }

    this._stones[point.x][point.y] = stone;
    this._emit({ type: 'stone', point, oldValue: oldStone, newValue: stone });
    return true;
  }

  setMark(pointOrVertex, mark) {
    const point = this._resolvePoint(pointOrVertex);
    const oldMark = this._marks[point.x][point.y];

    if (oldMark === mark) {
      return false;
    }

    this._marks[point.x][point.y] = mark;
    this._emit({ type: 'mark', point, oldValue: oldMark, newValue: mark });
    return true;
  }

  setIntersection(pointOrVertex, value = {}) {
    let changed = false;

    if (value.stone !== undefined) {
      changed = this.setStone(pointOrVertex, value.stone) || changed;
    }

    if (value.mark !== undefined) {
      changed = this.setMark(pointOrVertex, value.mark) || changed;
    }

    return changed;
  }

  clear() {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        this._stones[x][y] = STONE.CLEAR;
        this._marks[x][y] = MARK.NONE;
      }
    }

    this._emit({ type: 'clear' });
  }

  each(callback, bounds) {
    const xStart = bounds ? Math.max(0, bounds.x1) : 0;
    const yStart = bounds ? Math.max(0, bounds.y1) : 0;
    const xEnd = bounds ? Math.min(this.width - 1, bounds.x2) : this.width - 1;
    const yEnd = bounds ? Math.min(this.height - 1, bounds.y2) : this.height - 1;

    for (let y = yStart; y <= yEnd; y += 1) {
      for (let x = xStart; x <= xEnd; x += 1) {
        callback(
          { x, y },
          {
            stone: this._stones[x][y],
            mark: this._marks[x][y],
          }
        );
      }
    }
  }
}

export function createBoard(options) {
  return new BoardState(options);
}
