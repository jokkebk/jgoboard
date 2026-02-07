import { COORDINATE_LETTERS } from './constants.js';

function assertPositiveInteger(name, value) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
}

export function parseVertex(vertex, boardHeight) {
  assertPositiveInteger('boardHeight', boardHeight);

  if (typeof vertex !== 'string') {
    throw new Error('vertex must be a string like "K10"');
  }

  const trimmed = vertex.trim().toUpperCase();
  const match = /^([A-Z])(\d+)$/.exec(trimmed);

  if (!match) {
    throw new Error(`invalid vertex: ${vertex}`);
  }

  const [, letter, rowText] = match;
  const x = COORDINATE_LETTERS.indexOf(letter);

  if (x === -1) {
    throw new Error(`invalid column in vertex: ${vertex}`);
  }

  const row = Number.parseInt(rowText, 10);
  const y = boardHeight - row;

  if (!Number.isInteger(row) || row < 1 || y < 0 || y >= boardHeight) {
    throw new Error(`vertex ${vertex} is out of range for board height ${boardHeight}`);
  }

  return { x, y };
}

export function formatVertex(point, boardHeight) {
  assertPositiveInteger('boardHeight', boardHeight);

  if (!point || !Number.isInteger(point.x) || !Number.isInteger(point.y)) {
    throw new Error('point must be an object with integer x and y');
  }

  if (point.x < 0 || point.x >= COORDINATE_LETTERS.length) {
    throw new Error(`x=${point.x} is out of supported range`);
  }

  if (point.y < 0 || point.y >= boardHeight) {
    throw new Error(`y=${point.y} is out of range for board height ${boardHeight}`);
  }

  return `${COORDINATE_LETTERS[point.x]}${boardHeight - point.y}`;
}

export function normalizePoint(pointOrVertex, boardHeight) {
  if (typeof pointOrVertex === 'string') {
    return parseVertex(pointOrVertex, boardHeight);
  }

  if (
    !pointOrVertex ||
    !Number.isInteger(pointOrVertex.x) ||
    !Number.isInteger(pointOrVertex.y)
  ) {
    throw new Error('point must be a {x, y} object or a vertex string');
  }

  return { x: pointOrVertex.x, y: pointOrVertex.y };
}

export function normalizeViewport(viewport, boardWidth, boardHeight) {
  if (!viewport) {
    return {
      xOffset: 0,
      yOffset: 0,
      width: boardWidth,
      height: boardHeight,
      edge: { top: true, right: true, bottom: true, left: true },
    };
  }

  let x1;
  let y1;
  let x2;
  let y2;

  if (viewport.from && viewport.to) {
    const from = normalizePoint(viewport.from, boardHeight);
    const to = normalizePoint(viewport.to, boardHeight);

    x1 = Math.min(from.x, to.x);
    y1 = Math.min(from.y, to.y);
    x2 = Math.max(from.x, to.x);
    y2 = Math.max(from.y, to.y);
  } else {
    x1 = Number.isInteger(viewport.xOffset) ? viewport.xOffset : 0;
    y1 = Number.isInteger(viewport.yOffset) ? viewport.yOffset : 0;

    const width = Number.isInteger(viewport.width) ? viewport.width : boardWidth;
    const height = Number.isInteger(viewport.height) ? viewport.height : boardHeight;

    x2 = x1 + width - 1;
    y2 = y1 + height - 1;
  }

  if (x1 < 0 || y1 < 0 || x2 >= boardWidth || y2 >= boardHeight) {
    throw new Error('viewport is out of board bounds');
  }

  return {
    xOffset: x1,
    yOffset: y1,
    width: x2 - x1 + 1,
    height: y2 - y1 + 1,
    edge: {
      top: y1 === 0,
      right: x2 === boardWidth - 1,
      bottom: y2 === boardHeight - 1,
      left: x1 === 0,
    },
  };
}
