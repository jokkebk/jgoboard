import { formatVertex, parseVertex } from '../core/coordinates.js';
import { STONE } from '../core/constants.js';
import { createGameTree } from '../core/game-tree.js';
import { rules } from '../core/game.js';

const SGF_CHAR_CODE_A = 'a'.charCodeAt(0);
const SGF_MOVE_KEYS = new Set(['B', 'W']);
const ROOT_PROPERTY_DEFAULTS = Object.freeze({
  GM: ['1'],
  FF: ['4'],
});

function makeWarning(warnings, onWarning, warning) {
  warnings.push(warning);

  if (typeof onWarning === 'function') {
    onWarning(warning);
  }
}

function cloneProperties(properties) {
  const cloned = {};

  if (!properties || typeof properties !== 'object') {
    return cloned;
  }

  for (const key of Object.keys(properties)) {
    const values = properties[key];
    cloned[key] = Array.isArray(values) ? [...values] : [];
  }

  return cloned;
}

function normalizeMode(options = {}) {
  if (options.mode === 'permissive' || options.strict === false) {
    return 'permissive';
  }

  return 'strict';
}

function locationFromIndex(text, index) {
  const bounded = Math.max(0, Math.min(index, text.length));
  const slice = text.slice(0, bounded);
  const lines = slice.split(/\n/);
  return {
    index: bounded,
    line: lines.length,
    column: (lines[lines.length - 1] || '').length + 1,
  };
}

export class SgfParseError extends Error {
  constructor(message, code, location) {
    super(message);
    this.name = 'SgfParseError';
    this.code = code;
    this.location = location;
  }
}

class SgfParser {
  constructor(text, options = {}) {
    this.text = text;
    this.mode = normalizeMode(options);
    this.onWarning = options.onWarning;
    this.warnings = [];
    this.index = 0;
  }

  _warn(code, message, index = this.index) {
    makeWarning(this.warnings, this.onWarning, {
      code,
      message,
      ...locationFromIndex(this.text, index),
    });
  }

  _error(code, message, index = this.index) {
    throw new SgfParseError(message, code, locationFromIndex(this.text, index));
  }

  _peek() {
    return this.text[this.index] || '';
  }

  _next() {
    const char = this.text[this.index] || '';
    this.index += 1;
    return char;
  }

  _skipWhitespace() {
    while (this.index < this.text.length) {
      const char = this._peek();
      if (!/\s/.test(char)) {
        break;
      }
      this.index += 1;
    }
  }

  _readPropertyIdentifier() {
    const start = this.index;

    while (this.index < this.text.length && /[A-Za-z]/.test(this._peek())) {
      this.index += 1;
    }

    if (this.index === start) {
      this._error('identifier', 'Expected SGF property identifier');
    }

    const raw = this.text.slice(start, this.index);
    if (!/^[A-Z]+$/.test(raw)) {
      if (this.mode === 'strict') {
        this._error('identifier_case', `Property identifier must be uppercase: ${raw}`, start);
      }

      this._warn('identifier_case', `Normalized property identifier to uppercase: ${raw}`, start);
    }

    return raw.toUpperCase();
  }

  _readPropertyValue() {
    if (this._next() !== '[') {
      this._error('value_open', 'Expected "[" for property value');
    }

    let value = '';

    while (this.index < this.text.length) {
      const char = this._next();

      if (char === ']') {
        return value;
      }

      if (char === '\\') {
        if (this.index >= this.text.length) {
          return value;
        }

        const escaped = this._next();

        if (escaped === '\r') {
          if (this._peek() === '\n') {
            this.index += 1;
          }
          continue;
        }

        if (escaped === '\n') {
          continue;
        }

        value += escaped;
        continue;
      }

      value += char;
    }

    this._error('value_close', 'Missing closing bracket for property value');
  }

  _readPropertyValues() {
    const values = [];

    while (true) {
      this._skipWhitespace();
      if (this._peek() !== '[') {
        break;
      }

      values.push(this._readPropertyValue());
    }

    if (values.length === 0) {
      this._error('value_missing', 'Expected at least one property value');
    }

    return values;
  }

  _readNode() {
    if (this._next() !== ';') {
      this._error('node_open', 'Expected ";" to start SGF node');
    }

    const properties = {};

    while (true) {
      this._skipWhitespace();
      const char = this._peek();

      if (!char || char === ';' || char === '(' || char === ')') {
        break;
      }

      const identifier = this._readPropertyIdentifier();
      const values = this._readPropertyValues();

      if (!properties[identifier]) {
        properties[identifier] = [];
      }

      properties[identifier].push(...values);
    }

    return { properties };
  }

  _readTree() {
    this._skipWhitespace();

    if (this._next() !== '(') {
      this._error('tree_open', 'Expected "(" to start game tree');
    }

    this._skipWhitespace();
    const sequence = [];

    while (this._peek() === ';') {
      sequence.push(this._readNode());
      this._skipWhitespace();
    }

    if (sequence.length === 0) {
      this._error('sequence_empty', 'SGF tree must contain at least one node');
    }

    const variations = [];

    while (this._peek() === '(') {
      variations.push(this._readTree());
      this._skipWhitespace();
    }

    if (this._next() !== ')') {
      this._error('tree_close', 'Expected ")" to close game tree');
    }

    return {
      type: 'tree',
      sequence,
      variations,
    };
  }

  parse() {
    this._skipWhitespace();

    if (this.mode === 'permissive' && this._peek() !== '(') {
      this._warn(
        'missing_root_parentheses',
        'Wrapped input in a root game tree for permissive parsing'
      );
      this.text = `(${this.text})`;
      this.index = 0;
      this._skipWhitespace();
    }

    const trees = [];

    while (this.index < this.text.length) {
      this._skipWhitespace();

      if (this.index >= this.text.length) {
        break;
      }

      const char = this._peek();
      if (char !== '(') {
        if (this.mode === 'strict') {
          this._error('unexpected_token', `Unexpected token "${char}" outside game tree`);
        }

        this._warn('unexpected_token', `Skipped unexpected token "${char}" outside game tree`);
        this.index += 1;
        continue;
      }

      trees.push(this._readTree());
      this._skipWhitespace();
    }

    if (trees.length === 0) {
      this._error('empty', 'SGF content did not contain any game trees', 0);
    }

    return {
      type: 'collection',
      trees,
      warnings: this.warnings,
    };
  }
}

function ensureAst(input, options = {}) {
  if (typeof input === 'string') {
    return parseSgf(input, options);
  }

  if (!input || input.type !== 'collection' || !Array.isArray(input.trees)) {
    throw new Error('Expected SGF text or AST returned by parseSgf');
  }

  return input;
}

function parseSize(rootProperties, warnings, onWarning) {
  const values = rootProperties.SZ;
  if (!Array.isArray(values) || values.length === 0) {
    return { width: 19, height: 19 };
  }

  const raw = String(values[0]).trim();

  if (/^\d+$/.test(raw)) {
    const size = Number.parseInt(raw, 10);
    if (size > 0) {
      return { width: size, height: size };
    }
  }

  const rect = /^(\d+):(\d+)$/.exec(raw);
  if (rect) {
    const width = Number.parseInt(rect[1], 10);
    const height = Number.parseInt(rect[2], 10);

    if (width > 0 && height > 0) {
      return { width, height };
    }
  }

  makeWarning(warnings, onWarning, {
    code: 'invalid_size',
    message: `Invalid SZ value "${raw}", defaulted to 19x19`,
  });

  return { width: 19, height: 19 };
}

function parseRules(rootProperties) {
  const rawRules = String(rootProperties.RU?.[0] || '')
    .trim()
    .toLowerCase();

  if (rawRules.includes('chinese')) {
    return rules.chinese();
  }

  if (rawRules.includes('aga')) {
    return rules.aga();
  }

  return rules.japanese();
}

function parseStartingPlayer(rootProperties) {
  const player = String(rootProperties.PL?.[0] || '')
    .trim()
    .toUpperCase();

  if (player === 'W') {
    return STONE.WHITE;
  }

  if (player === 'B') {
    return STONE.BLACK;
  }

  const handicap = Number.parseInt(rootProperties.HA?.[0] || '', 10);
  if (Number.isInteger(handicap) && handicap > 1) {
    return STONE.WHITE;
  }

  return STONE.BLACK;
}

function sgfCharToIndex(char) {
  const normalized = String(char || '').toLowerCase();
  if (!/^[a-z]$/.test(normalized)) {
    return -1;
  }

  return normalized.charCodeAt(0) - SGF_CHAR_CODE_A;
}

function sgfCoordToPoint(coord, width, height) {
  if (typeof coord !== 'string' || coord.length < 2) {
    return null;
  }

  const x = sgfCharToIndex(coord[0]);
  const y = sgfCharToIndex(coord[1]);

  if (x < 0 || y < 0 || x >= width || y >= height) {
    return null;
  }

  return { x, y };
}

function pointToSgfCoord(point, width, height) {
  const vertexPoint = parseVertex(point, height);

  if (vertexPoint.x < 0 || vertexPoint.y < 0 || vertexPoint.x >= width || vertexPoint.y >= height) {
    throw new Error('Point is out of SGF board bounds');
  }

  return `${String.fromCharCode(SGF_CHAR_CODE_A + vertexPoint.x)}${String.fromCharCode(
    SGF_CHAR_CODE_A + vertexPoint.y
  )}`;
}

function expandSgfPointList(values, width, height, warnings, onWarning, contextCode) {
  const points = [];

  for (const rawValue of values || []) {
    const value = String(rawValue || '').trim();

    if (!value) {
      continue;
    }

    if (value.includes(':')) {
      const tuple = value.split(':');
      if (tuple.length !== 2) {
        makeWarning(warnings, onWarning, {
          code: `${contextCode}_range`,
          message: `Ignored invalid SGF range "${value}"`,
        });
        continue;
      }

      const from = sgfCoordToPoint(tuple[0], width, height);
      const to = sgfCoordToPoint(tuple[1], width, height);

      if (!from || !to) {
        makeWarning(warnings, onWarning, {
          code: `${contextCode}_range`,
          message: `Ignored out-of-bounds SGF range "${value}"`,
        });
        continue;
      }

      const x1 = Math.min(from.x, to.x);
      const y1 = Math.min(from.y, to.y);
      const x2 = Math.max(from.x, to.x);
      const y2 = Math.max(from.y, to.y);

      for (let y = y1; y <= y2; y += 1) {
        for (let x = x1; x <= x2; x += 1) {
          points.push({ x, y });
        }
      }

      continue;
    }

    const point = sgfCoordToPoint(value, width, height);
    if (!point) {
      makeWarning(warnings, onWarning, {
        code: `${contextCode}_point`,
        message: `Ignored out-of-bounds SGF coordinate "${value}"`,
      });
      continue;
    }

    points.push(point);
  }

  return points;
}

function deriveNodeAction(nodeProperties, width, height, warnings, onWarning) {
  let moveKey = null;

  for (const key of Object.keys(nodeProperties)) {
    if (SGF_MOVE_KEYS.has(key)) {
      if (moveKey) {
        makeWarning(warnings, onWarning, {
          code: 'multiple_move_properties',
          message: `Node contains both B and W properties, keeping ${moveKey}`,
        });
        break;
      }

      moveKey = key;
    }
  }

  if (moveKey) {
    const values = nodeProperties[moveKey] || [];
    const value = values.length > 0 ? String(values[0] || '') : '';

    if (!value) {
      return {
        action: { type: 'pass' },
        player: moveKey === 'B' ? STONE.BLACK : STONE.WHITE,
        moveDelta: 1,
      };
    }

    const point = sgfCoordToPoint(value, width, height);
    if (!point) {
      makeWarning(warnings, onWarning, {
        code: 'invalid_move_coordinate',
        message: `Ignored invalid move coordinate "${value}"`,
      });
      return {
        action: null,
        player: null,
        moveDelta: 0,
      };
    }

    return {
      action: {
        type: 'play',
        vertex: formatVertex(point, height),
      },
      player: moveKey === 'B' ? STONE.BLACK : STONE.WHITE,
      moveDelta: 1,
    };
  }

  const black = expandSgfPointList(
    nodeProperties.AB,
    width,
    height,
    warnings,
    onWarning,
    'setup_ab'
  );
  const white = expandSgfPointList(
    nodeProperties.AW,
    width,
    height,
    warnings,
    onWarning,
    'setup_aw'
  );
  const empty = expandSgfPointList(
    nodeProperties.AE,
    width,
    height,
    warnings,
    onWarning,
    'setup_ae'
  );

  if (black.length > 0 || white.length > 0 || empty.length > 0) {
    return {
      action: {
        type: 'setup',
        setup: {
          black,
          white,
          empty,
        },
      },
      player: null,
      moveDelta: 0,
    };
  }

  return {
    action: null,
    player: null,
    moveDelta: 0,
  };
}

function appendSequence(tree, parentId, sequence, width, height, moveNumber, warnings, onWarning) {
  let currentParentId = parentId;
  let currentMoveNumber = moveNumber;

  for (const astNode of sequence) {
    const properties = cloneProperties(astNode.properties);
    const derived = deriveNodeAction(properties, width, height, warnings, onWarning);

    currentMoveNumber += derived.moveDelta;

    const node = tree.appendNode(currentParentId, {
      action: derived.action,
      info: {
        player: derived.player,
        moveNumber: currentMoveNumber,
        captures: [],
        ko: null,
      },
      properties,
    });

    currentParentId = node.id;
  }

  return { parentId: currentParentId, moveNumber: currentMoveNumber };
}

function applyTree(tree, parentId, astTree, width, height, moveNumber, warnings, onWarning) {
  const appended = appendSequence(
    tree,
    parentId,
    astTree.sequence,
    width,
    height,
    moveNumber,
    warnings,
    onWarning
  );

  for (const variation of astTree.variations) {
    applyTree(
      tree,
      appended.parentId,
      variation,
      width,
      height,
      appended.moveNumber,
      warnings,
      onWarning
    );
  }
}

function escapePropertyValue(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/\]/g, '\\]');
}

function serializeProperties(properties, isRootNode, width, height) {
  const merged = cloneProperties(properties);

  if (isRootNode) {
    for (const key of Object.keys(ROOT_PROPERTY_DEFAULTS)) {
      if (!merged[key] || merged[key].length === 0) {
        merged[key] = [...ROOT_PROPERTY_DEFAULTS[key]];
      }
    }

    if (!merged.SZ || merged.SZ.length === 0) {
      merged.SZ = [width === height ? String(width) : `${width}:${height}`];
    }
  }

  const keys = Object.keys(merged).sort();
  let output = '';

  for (const key of keys) {
    const values = merged[key] || [];
    if (values.length === 0) {
      output += `${key}[]`;
      continue;
    }

    output += key;
    for (const value of values) {
      output += `[${escapePropertyValue(value)}]`;
    }
  }

  return output;
}

function actionToProperties(node, width, height) {
  const properties = cloneProperties(node.properties);

  delete properties.B;
  delete properties.W;
  delete properties.AB;
  delete properties.AW;
  delete properties.AE;

  if (!node.action) {
    return properties;
  }

  if (node.action.type === 'setup') {
    const setup = node.action.setup || {};

    const toList = (points) =>
      (points || []).map((point) => pointToSgfCoord(point, width, height)).sort();

    const black = toList(setup.black);
    const white = toList(setup.white);
    const empty = toList(setup.empty);

    if (black.length > 0) {
      properties.AB = black;
    }
    if (white.length > 0) {
      properties.AW = white;
    }
    if (empty.length > 0) {
      properties.AE = empty;
    }

    return properties;
  }

  const color = node.info.player === STONE.WHITE ? 'W' : 'B';

  if (node.action.type === 'pass') {
    properties[color] = [''];
    return properties;
  }

  properties[color] = [pointToSgfCoord(node.action.vertex, width, height)];
  return properties;
}

function buildSgfTreeFromGameTree(tree, startNodeId, options = {}) {
  const includeVariations = options.variations !== 'mainline';

  const sequence = [];
  let currentId = startNodeId;

  while (currentId) {
    const node = tree.getNode(currentId);
    sequence.push({
      properties: actionToProperties(node, tree.width, tree.height),
    });

    const children = tree.getChildren(currentId);

    if (children.length === 0) {
      return {
        type: 'tree',
        sequence,
        variations: [],
      };
    }

    if (children.length === 1 || !includeVariations) {
      currentId = children[0].id;
      continue;
    }

    return {
      type: 'tree',
      sequence,
      variations: children.map((child) => buildSgfTreeFromGameTree(tree, child.id, options)),
    };
  }

  return {
    type: 'tree',
    sequence,
    variations: [],
  };
}

function stringifyTree(treeAst, width, height) {
  let output = '(';

  for (let i = 0; i < treeAst.sequence.length; i += 1) {
    const node = treeAst.sequence[i];
    output += ';';
    output += serializeProperties(node.properties, i === 0, width, height);
  }

  for (const variation of treeAst.variations) {
    output += stringifyTree(variation, width, height);
  }

  output += ')';
  return output;
}

export function parseSgf(text, options = {}) {
  if (typeof text !== 'string') {
    throw new Error('parseSgf expects SGF content as a string');
  }

  const parser = new SgfParser(text, options);
  return parser.parse();
}

export function gameTreeFromSgf(input, options = {}) {
  const ast = ensureAst(input, options);
  const warnings = Array.isArray(ast.warnings) ? [...ast.warnings] : [];
  const onWarning = options.onWarning;

  if (warnings.length > 0 && typeof onWarning === 'function') {
    for (const warning of warnings) {
      onWarning(warning);
    }
  }

  if (ast.trees.length === 0) {
    throw new Error('SGF AST does not contain any game trees');
  }

  const gameIndex = Number.isInteger(options.gameIndex) ? options.gameIndex : 0;
  const selectedTree = ast.trees[gameIndex];

  if (!selectedTree) {
    throw new Error(`Requested game index ${gameIndex} does not exist`);
  }

  const rootNode = selectedTree.sequence[0];
  const rootProperties = cloneProperties(rootNode?.properties || {});
  const { width, height } = parseSize(rootProperties, warnings, onWarning);

  const rootDerived = deriveNodeAction(rootProperties, width, height, warnings, onWarning);

  const tree = createGameTree({
    width,
    height,
    rules: parseRules(rootProperties),
    startingPlayer: parseStartingPlayer(rootProperties),
    rootAction: rootDerived.action,
    rootInfo: {
      player: rootDerived.player,
      moveNumber: rootDerived.moveDelta > 0 ? 1 : 0,
      captures: [],
      ko: null,
    },
    rootProperties,
  });

  const remainingSequence = selectedTree.sequence.slice(1);
  const appended = appendSequence(
    tree,
    tree.rootId,
    remainingSequence,
    width,
    height,
    rootDerived.moveDelta,
    warnings,
    onWarning
  );

  for (const variation of selectedTree.variations) {
    applyTree(
      tree,
      appended.parentId,
      variation,
      width,
      height,
      appended.moveNumber,
      warnings,
      onWarning
    );
  }

  if (warnings.length > 0) {
    tree.sgfWarnings = warnings;
  }

  return tree;
}

export function sgfFromGameTree(tree, options = {}) {
  if (!tree || typeof tree.getNode !== 'function' || typeof tree.getChildren !== 'function') {
    throw new Error('sgfFromGameTree expects a GameTree instance');
  }

  const sgfTree = buildSgfTreeFromGameTree(tree, tree.rootId, options);
  return stringifyTree(sgfTree, tree.width, tree.height);
}
