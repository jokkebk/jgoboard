import { COORDINATE_LETTERS, STONE, formatVertex, normalizePoint, normalizeViewport } from '../core/index.js';
import { resolveTheme } from '../presets/themes.js';
import { deepMerge } from '../shared/deep-merge.js';
import { LayerRegistry } from './layer-registry.js';
import { StonePainter } from './stone-painter.js';

/**
 * @typedef {import('../core/board.js').BoardState} BoardState
 * @typedef {import('../presets/themes.js').DeepPartial<import('../presets/themes.js').Theme>} ThemePatch
 * @typedef {import('../presets/themes.js').Theme} Theme
 * @typedef {import('../presets/themes.js').ThemeInput} ThemeInput
 */

/**
 * @typedef {object} Point
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {object} ViewportEdge
 * @property {boolean} top
 * @property {boolean} right
 * @property {boolean} bottom
 * @property {boolean} left
 */

/**
 * @typedef {object} RenderViewport
 * @property {number} xOffset
 * @property {number} yOffset
 * @property {number} width
 * @property {number} height
 * @property {ViewportEdge} edge
 */

/**
 * @typedef {object} RenderGeometry
 * @property {number} padLeft
 * @property {number} padRight
 * @property {number} padTop
 * @property {number} padBottom
 * @property {number} marginLeft
 * @property {number} marginRight
 * @property {number} marginTop
 * @property {number} marginBottom
 * @property {number} boardWidth
 * @property {number} boardHeight
 * @property {number} canvasWidth
 * @property {number} canvasHeight
 * @property {number} gridLeft
 * @property {number} gridTop
 */

/**
 * @typedef {object} StarMeta
 * @property {number} points
 * @property {number} offset
 */

/**
 * @typedef {object} RendererAssets
 * @property {HTMLImageElement | ImageBitmap | null} black
 * @property {HTMLImageElement | ImageBitmap | null} white
 * @property {HTMLImageElement | ImageBitmap | null} shadow
 * @property {HTMLImageElement | ImageBitmap | null} board
 */

/**
 * @typedef {object} RenderFrame
 * @property {BoardState} board
 * @property {Theme} theme
 * @property {RenderViewport} viewport
 * @property {RenderGeometry} geometry
 * @property {RendererAssets} assets
 * @property {StarMeta} stars
 */

/**
 * @typedef {object} RendererLayer
 * @property {string} [name]
 * @property {number} [zIndex]
 * @property {boolean} [enabled]
 * @property {(this: BoardRenderer, ctx: Canvas2DContext, frame: RenderFrame) => void} draw
 */

/**
 * @typedef {'click' | 'mousemove' | 'mouseout'} RendererEvent
 */

/**
 * @typedef {object} InteractionOptions
 * @property {boolean} [enabled]
 */

/**
 * @typedef {object} PointerPayload
 * @property {MouseEvent} event
 * @property {Point | null} [point]
 * @property {string | null} [vertex]
 */

/**
 * @typedef {object} GhostStoneOptions
 * @property {boolean} [onlyWhenClear]
 * @property {boolean} [replaceExisting]
 */

/**
 * @typedef {object} GhostStoneState
 * @property {Point} point
 * @property {number} stone
 * @property {boolean} onlyWhenClear
 * @property {boolean} replaceExisting
 */

/**
 * @typedef {object} HoverPreviewConfig
 * @property {(point: Point) => number | null | undefined} stone
 * @property {boolean} [onlyWhenClear]
 * @property {boolean} [replaceExisting]
 */

/**
 * @typedef {object} BoardRendererOptions
 * @property {BoardState} [board]
 * @property {ThemeInput} [theme]
 * @property {ThemePatch} [layout]
 * @property {object | null} [viewport]
 * @property {InteractionOptions} [interactions]
 * @property {number} [pixelRatio]
 * @property {string | null} [assetBaseUrl]
 * @property {RendererLayer[]} [layers]
 */

/**
 * @typedef {object} RenderTargetOptions
 * @property {number} [scale]
 */

/**
 * @typedef {object} ExportOptions
 * @property {'png' | 'jpeg' | 'jpg'} [format]
 * @property {number} [quality]
 * @property {number} [scale]
 */

/**
 * @typedef {HTMLCanvasElement | OffscreenCanvas} CanvasLike
 */

/**
 * @typedef {CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D} Canvas2DContext
 */

/**
 * @typedef {Omit<BoardRendererOptions, 'board'> & ExportOptions & { as?: 'blob' | 'data-url' | 'canvas' }} RenderBoardImageOptions
 */

const IMAGE_KEYS = ['black', 'white', 'shadow', 'board'];
const LABEL_MARK_PATTERN = /^[a-zA-Z1-9]/;
const IMAGE_CACHE = new Map();
const ABSOLUTE_URL_PATTERN = /^(?:[a-zA-Z][a-zA-Z\d+\-.]*:|\/\/|\/)/;
const INITIAL_MODULE_ASSET_BASE_URL = (() => {
  if (typeof import.meta?.url !== 'string' || import.meta.url.length === 0) {
    return null;
  }

  try {
    const moduleUrl = import.meta.url;
    return new URL('../', moduleUrl).href;
  } catch {
    return null;
  }
})();
const INITIAL_SCRIPT_SRC =
  typeof document !== 'undefined' &&
  document.currentScript &&
  typeof document.currentScript.getAttribute === 'function' &&
  typeof document.currentScript.getAttribute('src') === 'string' &&
  document.currentScript.getAttribute('src').length > 0 &&
  typeof document.currentScript.src === 'string' &&
  document.currentScript.src.length > 0
    ? document.currentScript.src
    : null;
const INITIAL_SCRIPT_ASSET_BASE_URL =
  INITIAL_SCRIPT_SRC
    ? new URL('../', INITIAL_SCRIPT_SRC).href
    : null;
let globalAssetBaseUrl = null;

/**
 * Clear the shared image cache used by all BoardRenderer instances.
 * Useful in long-running applications to free memory.
 */
export function clearImageCache() {
  IMAGE_CACHE.clear();
}

/**
 * Set a global base URL for relative texture assets.
 * @param {string | null | undefined} assetBaseUrl
 */
export function setAssetBaseUrl(assetBaseUrl) {
  globalAssetBaseUrl =
    typeof assetBaseUrl === 'string' && assetBaseUrl.trim().length > 0 ? assetBaseUrl : null;
}

/**
 * @returns {string | null}
 */
export function getAssetBaseUrl() {
  return globalAssetBaseUrl;
}

function hasDocument() {
  return typeof document !== 'undefined';
}

function resolveUrlAgainstBase(path, baseUrl) {
  try {
    return new URL(path, baseUrl).href;
  } catch {
    return null;
  }
}

function resolveTextureCandidates(path, assetBaseUrl) {
  if (typeof path !== 'string' || path.length === 0) {
    return [];
  }

  if (ABSOLUTE_URL_PATTERN.test(path)) {
    return [path];
  }

  const candidates = [];
  const seen = new Set();

  const add = (value) => {
    if (typeof value !== 'string' || value.length === 0 || seen.has(value)) {
      return;
    }

    seen.add(value);
    candidates.push(value);
  };

  if (assetBaseUrl) {
    add(resolveUrlAgainstBase(path, assetBaseUrl));
  }

  if (INITIAL_MODULE_ASSET_BASE_URL) {
    add(resolveUrlAgainstBase(path, INITIAL_MODULE_ASSET_BASE_URL));
  }

  if (INITIAL_SCRIPT_ASSET_BASE_URL) {
    add(resolveUrlAgainstBase(path, INITIAL_SCRIPT_ASSET_BASE_URL));
  }

  add(path);
  return candidates;
}

async function loadImageFromCandidates(candidates) {
  for (const src of candidates) {
    const image = await loadImage(src);
    if (image) {
      return image;
    }
  }

  return null;
}

/**
 * @param {unknown} value
 * @returns {value is HTMLCanvasElement}
 */
function isHtmlCanvas(value) {
  return typeof HTMLCanvasElement !== 'undefined' && value instanceof HTMLCanvasElement;
}

/**
 * @param {unknown} value
 * @returns {value is HTMLElement}
 */
function isHtmlElement(value) {
  return typeof HTMLElement !== 'undefined' && value instanceof HTMLElement;
}

/**
 * @returns {CanvasLike}
 */
function createCanvasElement() {
  if (hasDocument()) {
    return document.createElement('canvas');
  }

  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(1, 1);
  }

  throw new Error('No canvas implementation is available in this environment');
}

function loadImage(src) {
  if (!src) {
    return Promise.resolve(null);
  }

  if (IMAGE_CACHE.has(src)) {
    return IMAGE_CACHE.get(src);
  }

  const promise = new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(null);
      return;
    }

    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });

  IMAGE_CACHE.set(src, promise);
  return promise;
}

function normalizeExportFormat(format) {
  if (!format || format === 'png') {
    return 'image/png';
  }

  if (format === 'jpeg' || format === 'jpg') {
    return 'image/jpeg';
  }

  throw new Error(`unsupported export format: ${format}`);
}

function resolveStarMeta(boardWidth, boardHeight, stars) {
  if (boardWidth !== boardHeight) {
    return { points: 0, offset: 0 };
  }

  let points = stars.points;
  let offset = stars.offset;

  if (points === 'auto') {
    if (boardWidth === 9) {
      points = 5;
    } else if (boardWidth === 13 || boardWidth === 19) {
      points = 9;
    } else {
      points = 0;
    }
  }

  if (offset === 'auto') {
    offset = boardWidth <= 9 ? 2 : 3;
  }

  if (!Number.isFinite(points) || points <= 0) {
    return { points: 0, offset: 0 };
  }

  return { points, offset };
}

/**
 * @param {Theme} theme
 * @param {number | string} stone
 * @returns {string}
 */
function resolveMarkColor(theme, stone) {
  if (stone === STONE.BLACK || stone === STONE.GHOST_BLACK) {
    return theme.mark.blackColor;
  }

  if (stone === STONE.WHITE || stone === STONE.GHOST_WHITE) {
    return theme.mark.whiteColor;
  }

  return theme.mark.clearColor;
}

function isLabelMark(mark) {
  return typeof mark === 'string' && LABEL_MARK_PATTERN.test(mark);
}

function resolveInteractionOptions(interactions) {
  if (!interactions) {
    return { enabled: true };
  }

  return {
    enabled: interactions.enabled !== false,
  };
}

function normalizeGhostStone(stone) {
  if (stone === STONE.BLACK || stone === STONE.GHOST_BLACK) {
    return STONE.GHOST_BLACK;
  }

  if (stone === STONE.WHITE || stone === STONE.GHOST_WHITE) {
    return STONE.GHOST_WHITE;
  }

  return null;
}

export class BoardRenderer {
  /**
   * @param {string | HTMLElement | HTMLCanvasElement | OffscreenCanvas | null | undefined} target
   * @param {BoardRendererOptions} [options]
   */
  constructor(target, options = {}) {
    if (!options.board) {
      throw new Error('createRenderer requires a board instance in options.board');
    }

    const { canvas, container, createdCanvas } = this._resolveTarget(target);

    this.canvas = canvas;
    this.container = container;
    this._createdCanvas = createdCanvas;
    this.ctx = this.canvas.getContext('2d');

    if (!this.ctx) {
      throw new Error('Unable to initialize a 2D rendering context');
    }

    this.board = options.board;
    this.theme = resolveTheme(options.theme);
    this.layout = deepMerge({}, options.layout || {});
    this.viewportInput = options.viewport || null;
    this.assetBaseUrl =
      typeof options.assetBaseUrl === 'string' && options.assetBaseUrl.trim().length > 0
        ? options.assetBaseUrl
        : globalAssetBaseUrl;
    this.interactions = resolveInteractionOptions(options.interactions);
    this.pixelRatio =
      Number.isFinite(options.pixelRatio) && options.pixelRatio > 0
        ? options.pixelRatio
        : typeof window !== 'undefined'
          ? window.devicePixelRatio || 1
          : 1;

    this.layers = new LayerRegistry();
    this.stones = new StonePainter(this.theme);
    this._assets = {
      black: null,
      white: null,
      shadow: null,
      board: null,
    };
    this._assetsReady = Promise.resolve(this._assets);
    this._boardUnsubscribe = null;
    this._pointerListeners = [];
    this._listeners = {
      click: new Set(),
      mousemove: new Set(),
      mouseout: new Set(),
    };
    /** @type {GhostStoneState | null} */
    this._ghostStone = null;
    /** @type {{ unsubscribe: () => void } | null} */
    this._hoverPreview = null;

    this._installDefaultLayers();

    if (Array.isArray(options.layers)) {
      for (const layer of options.layers) {
        this.layers.add(layer.name, layer);
      }
    }

    this._bindBoard(this.board);
    this._bindPointerEvents();
    this._loadThemeAssets();
  }

  /**
   * @param {string | HTMLElement | HTMLCanvasElement | OffscreenCanvas | null | undefined} target
   * @returns {{ canvas: CanvasLike, container: HTMLElement | null, createdCanvas: boolean }}
   */
  _resolveTarget(target) {
    if (typeof target === 'string') {
      if (!hasDocument()) {
        throw new Error('String targets are only supported in browser environments');
      }

      const found = document.querySelector(target);
      if (!found) {
        throw new Error(`target not found for selector: ${target}`);
      }

      target = found;
    }

    if (!target) {
      const canvas = createCanvasElement();
      return { canvas, container: null, createdCanvas: true };
    }

    if (isHtmlCanvas(target)) {
      return { canvas: target, container: target.parentElement || null, createdCanvas: false };
    }

    if (isHtmlElement(target)) {
      const canvas = createCanvasElement();
      target.appendChild(canvas);
      return { canvas, container: target, createdCanvas: true };
    }

    if (typeof OffscreenCanvas !== 'undefined' && target instanceof OffscreenCanvas) {
      return { canvas: target, container: null, createdCanvas: false };
    }

    throw new Error('target must be a selector, DOM element, canvas, or omitted');
  }

  /**
   * @param {BoardState} board
   * @returns {void}
   */
  _bindBoard(board) {
    if (this._boardUnsubscribe) {
      this._boardUnsubscribe();
      this._boardUnsubscribe = null;
    }

    if (board && typeof board.onChange === 'function') {
      this._boardUnsubscribe = board.onChange(() => {
        this._ghostStone = null;
        this.render();
      });
    }
  }

  /**
   * @returns {void}
   */
  _bindPointerEvents() {
    if (!this.interactions.enabled || !isHtmlCanvas(this.canvas)) {
      return;
    }

    const clickHandler = (event) => {
      this._emitPointerEvent('click', event);
    };

    const moveHandler = (event) => {
      this._emitPointerEvent('mousemove', event);
    };

    const outHandler = (event) => {
      for (const listener of this._listeners.mouseout) {
        listener({ event });
      }
    };

    this.canvas.addEventListener('click', clickHandler);
    this.canvas.addEventListener('mousemove', moveHandler);
    this.canvas.addEventListener('mouseout', outHandler);

    this._pointerListeners.push(['click', clickHandler]);
    this._pointerListeners.push(['mousemove', moveHandler]);
    this._pointerListeners.push(['mouseout', outHandler]);
  }

  /**
   * @param {RendererEvent} type
   * @param {MouseEvent} event
   * @returns {void}
   */
  _emitPointerEvent(type, event) {
    const point = this._getPointFromPointer(event.clientX, event.clientY);

    for (const listener of this._listeners[type]) {
      listener({
        event,
        point,
        vertex: point ? formatVertex(point, this.board.height) : null,
      });
    }
  }

  /**
   * @param {Point | string} pointOrVertex
   * @returns {Point}
   */
  _resolveBoardPoint(pointOrVertex) {
    const point = normalizePoint(pointOrVertex, this.board.height);

    if (point.x < 0 || point.y < 0 || point.x >= this.board.width || point.y >= this.board.height) {
      throw new Error(`ghost stone point (${point.x}, ${point.y}) is out of board bounds`);
    }

    return point;
  }

  /**
   * @param {number} clientX
   * @param {number} clientY
   * @returns {Point | null}
   */
  _getPointFromPointer(clientX, clientY) {
    if (!isHtmlCanvas(this.canvas) || !this._lastFrame) {
      return null;
    }

    const bounds = this.canvas.getBoundingClientRect();
    const x = ((clientX - bounds.left) * this._lastFrame.geometry.canvasWidth) / bounds.width;
    const y = ((clientY - bounds.top) * this._lastFrame.geometry.canvasHeight) / bounds.height;

    const { geometry, viewport, theme } = this._lastFrame;
    const minX = geometry.gridLeft - theme.grid.x / 2;
    const maxX = geometry.gridLeft + theme.grid.x * (viewport.width - 1) + theme.grid.x / 2;
    const minY = geometry.gridTop - theme.grid.y / 2;
    const maxY = geometry.gridTop + theme.grid.y * (viewport.height - 1) + theme.grid.y / 2;

    if (x < minX || x > maxX || y < minY || y > maxY) {
      return null;
    }

    const localX = Math.floor((x - geometry.gridLeft + theme.grid.x / 2) / theme.grid.x);
    const localY = Math.floor((y - geometry.gridTop + theme.grid.y / 2) / theme.grid.y);

    const boardX = localX + viewport.xOffset;
    const boardY = localY + viewport.yOffset;

    if (
      boardX < viewport.xOffset ||
      boardX >= viewport.xOffset + viewport.width ||
      boardY < viewport.yOffset ||
      boardY >= viewport.yOffset + viewport.height
    ) {
      return null;
    }

    return { x: boardX, y: boardY };
  }

  /**
   * @returns {void}
   */
  _loadThemeAssets() {
    const textures = this.theme.textures;

    if (!textures) {
      this._assets = {
        black: null,
        white: null,
        shadow: null,
        board: null,
      };
      this._assetsReady = Promise.resolve(this._assets);
      return;
    }

    this._assetsReady = Promise.all(
      IMAGE_KEYS.map(async (key) => {
        const sources = resolveTextureCandidates(textures[key], this.assetBaseUrl);
        const image = await loadImageFromCandidates(sources);
        return [key, image];
      })
    ).then((entries) => {
      this._assets = Object.fromEntries(entries);
      return this._assets;
    });

    this._assetsReady.then(() => {
      this.render();
    });
  }

  /**
   * @returns {Promise<RendererAssets>}
   */
  whenReady() {
    return this._assetsReady;
  }

  /**
   * @param {RendererEvent} event
   * @param {(payload: PointerPayload) => void} listener
   * @returns {() => void}
   */
  on(event, listener) {
    if (!this._listeners[event]) {
      throw new Error(`unsupported event: ${event}`);
    }

    this._listeners[event].add(listener);

    return () => {
      this._listeners[event].delete(listener);
    };
  }

  /**
   * @param {object | null} viewport
   * @returns {BoardRenderer}
   */
  setViewport(viewport) {
    this.viewportInput = viewport;
    this.render();
    return this;
  }

  /**
   * @param {ThemeInput} theme
   * @returns {BoardRenderer}
   */
  setTheme(theme) {
    this.theme = resolveTheme(theme);
    this.stones.setTheme(this.theme);
    this._loadThemeAssets();
    this.render();
    return this;
  }

  /**
   * @param {string | null | undefined} assetBaseUrl
   * @returns {BoardRenderer}
   */
  setAssetBaseUrl(assetBaseUrl) {
    this.assetBaseUrl =
      typeof assetBaseUrl === 'string' && assetBaseUrl.trim().length > 0 ? assetBaseUrl : null;
    this._loadThemeAssets();
    this.render();
    return this;
  }

  /**
   * @param {ThemePatch} layout
   * @returns {BoardRenderer}
   */
  setLayout(layout) {
    this.layout = deepMerge({}, layout || {});
    this.render();
    return this;
  }

  /**
   * @param {BoardState} board
   * @returns {BoardRenderer}
   */
  setBoard(board) {
    if (!board || typeof board.each !== 'function') {
      throw new Error('setBoard requires a BoardState instance');
    }

    this.board = board;
    if (this._ghostStone) {
      const { point } = this._ghostStone;
      if (point.x >= board.width || point.y >= board.height) {
        this._ghostStone = null;
      }
    }

    this._bindBoard(board);
    this.render();
    return this;
  }

  /**
   * @param {Point | string | null | undefined} pointOrVertex
   * @param {number | string | null | undefined} stone
   * @param {GhostStoneOptions} [options]
   * @returns {BoardRenderer}
   */
  setGhostStone(pointOrVertex, stone, options = {}) {
    if (pointOrVertex == null || stone == null || stone === STONE.CLEAR) {
      return this.clearGhostStone();
    }

    const normalizedStone = normalizeGhostStone(stone);
    if (normalizedStone === null) {
      throw new Error('setGhostStone requires a black or white stone variant');
    }

    const point = this._resolveBoardPoint(pointOrVertex);
    const onlyWhenClear = options.onlyWhenClear !== false;
    const replaceExisting = options.replaceExisting === true;
    if (
      this._ghostStone &&
      this._ghostStone.point.x === point.x &&
      this._ghostStone.point.y === point.y &&
      this._ghostStone.stone === normalizedStone &&
      this._ghostStone.onlyWhenClear === onlyWhenClear &&
      this._ghostStone.replaceExisting === replaceExisting
    ) {
      return this;
    }

    this._ghostStone = {
      point,
      stone: normalizedStone,
      onlyWhenClear,
      replaceExisting,
    };
    this.render();
    return this;
  }

  /**
   * @returns {BoardRenderer}
   */
  clearGhostStone() {
    if (!this._ghostStone) {
      return this;
    }

    this._ghostStone = null;
    this.render();
    return this;
  }

  /**
   * @param {HoverPreviewConfig} config
   * @returns {BoardRenderer}
   */
  enableHoverPreview(config = {}) {
    this.disableHoverPreview();

    const stoneFn = config.stone;
    const onlyWhenClear = config.onlyWhenClear !== false;
    const replaceExisting = config.replaceExisting === true;

    const unsubMove = this.on('mousemove', ({ point }) => {
      if (!point) {
        this.clearGhostStone();
        return;
      }

      const stone = stoneFn(point);
      if (stone == null || stone === STONE.CLEAR) {
        this.clearGhostStone();
        return;
      }

      this.setGhostStone(point, stone, { onlyWhenClear, replaceExisting });
    });

    const unsubOut = this.on('mouseout', () => {
      this.clearGhostStone();
    });

    this._hoverPreview = {
      unsubscribe: () => {
        unsubMove();
        unsubOut();
      },
    };

    return this;
  }

  /**
   * @returns {BoardRenderer}
   */
  disableHoverPreview() {
    if (this._hoverPreview) {
      this._hoverPreview.unsubscribe();
      this._hoverPreview = null;
      this.clearGhostStone();
    }

    return this;
  }

  /**
   * @returns {RenderFrame}
   */
  _buildFrame() {
    const theme = deepMerge(this.theme, this.layout);
    const viewport = normalizeViewport(this.viewportInput, this.board.width, this.board.height);

    const padLeft = viewport.edge.left ? theme.padding.normal : theme.padding.clipped;
    const padRight = viewport.edge.right ? theme.padding.normal : theme.padding.clipped;
    const padTop = viewport.edge.top ? theme.padding.normal : theme.padding.clipped;
    const padBottom = viewport.edge.bottom ? theme.padding.normal : theme.padding.clipped;

    const marginLeft = viewport.edge.left ? theme.margin.normal : theme.margin.clipped;
    const marginRight = viewport.edge.right ? theme.margin.normal : theme.margin.clipped;
    const marginTop = viewport.edge.top ? theme.margin.normal : theme.margin.clipped;
    const marginBottom = viewport.edge.bottom ? theme.margin.normal : theme.margin.clipped;

    const boardWidth = padLeft + padRight + theme.grid.x * viewport.width;
    const boardHeight = padTop + padBottom + theme.grid.y * viewport.height;

    const geometry = {
      padLeft,
      padRight,
      padTop,
      padBottom,
      marginLeft,
      marginRight,
      marginTop,
      marginBottom,
      boardWidth,
      boardHeight,
      canvasWidth: marginLeft + marginRight + boardWidth,
      canvasHeight: marginTop + marginBottom + boardHeight,
      gridLeft: marginLeft + padLeft + theme.grid.x / 2,
      gridTop: marginTop + padTop + theme.grid.y / 2,
    };

    return {
      board: this.board,
      theme,
      viewport,
      geometry,
      assets: this._assets,
      stars: resolveStarMeta(this.board.width, this.board.height, theme.stars),
    };
  }

  /**
   * @param {CanvasLike} canvas
   * @param {number} width
   * @param {number} height
   * @param {number} pixelRatio
   * @param {boolean} updateStyle
   * @returns {Canvas2DContext}
   */
  _prepareCanvas(canvas, width, height, pixelRatio, updateStyle) {
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);

    if (updateStyle && canvas.style) {
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    const ctx = /** @type {Canvas2DContext | null} */ (canvas.getContext('2d'));
    if (!ctx) {
      throw new Error('Unable to initialize a 2D rendering context');
    }
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    return ctx;
  }

  /**
   * @param {Canvas2DContext} ctx
   * @param {RenderFrame} frame
   * @returns {void}
   */
  _drawGridLayer(ctx, frame) {
    const { theme, geometry, viewport, assets, board } = frame;

    ctx.fillStyle = theme.margin.color;
    ctx.fillRect(0, 0, geometry.canvasWidth, geometry.canvasHeight);

    if (assets.board) {
      ctx.save();
      ctx.shadowColor = theme.boardShadow.color;
      ctx.shadowBlur = theme.boardShadow.blur;
      ctx.shadowOffsetX = theme.boardShadow.offX;
      ctx.shadowOffsetY = theme.boardShadow.offY;

      const clipTop = viewport.edge.top ? 0 : geometry.marginTop;
      const clipLeft = viewport.edge.left ? 0 : geometry.marginLeft;
      const clipBottom = viewport.edge.bottom ? 0 : geometry.marginBottom;
      const clipRight = viewport.edge.right ? 0 : geometry.marginRight;

      ctx.beginPath();
      ctx.rect(
        clipLeft,
        clipTop,
        geometry.canvasWidth - clipLeft - clipRight,
        geometry.canvasHeight - clipTop - clipBottom
      );
      ctx.clip();

      ctx.drawImage(
        assets.board,
        0,
        0,
        geometry.boardWidth,
        geometry.boardHeight,
        geometry.marginLeft,
        geometry.marginTop,
        geometry.boardWidth,
        geometry.boardHeight
      );

      ctx.strokeStyle = theme.border.color;
      ctx.lineWidth = theme.border.lineWidth;
      ctx.strokeRect(geometry.marginLeft, geometry.marginTop, geometry.boardWidth, geometry.boardHeight);

      ctx.restore();
    }

    ctx.strokeStyle = theme.grid.color;
    const smooth = theme.grid.smooth;

    for (let i = 0; i < viewport.width; i += 1) {
      const lineX = smooth + geometry.gridLeft + theme.grid.x * i;
      const topY =
        smooth +
        geometry.gridTop -
        (viewport.edge.top ? 0 : theme.grid.y / 2 + geometry.padTop / 2);
      const bottomY =
        smooth +
        geometry.gridTop +
        theme.grid.y * (viewport.height - 1) +
        (viewport.edge.bottom ? 0 : theme.grid.y / 2 + geometry.padBottom / 2);

      ctx.lineWidth =
        (i === 0 && viewport.edge.left) || (i + 1 === viewport.width && viewport.edge.right)
          ? theme.grid.borderWidth
          : theme.grid.lineWidth;

      ctx.beginPath();
      ctx.moveTo(lineX, topY);
      ctx.lineTo(lineX, bottomY);
      ctx.stroke();
    }

    for (let j = 0; j < viewport.height; j += 1) {
      const lineY = smooth + geometry.gridTop + theme.grid.y * j;
      const leftX =
        smooth +
        geometry.gridLeft -
        (viewport.edge.left ? 0 : theme.grid.x / 2 + geometry.padLeft / 2);
      const rightX =
        smooth +
        geometry.gridLeft +
        theme.grid.x * (viewport.width - 1) +
        (viewport.edge.right ? 0 : theme.grid.x / 2 + geometry.padRight / 2);

      ctx.lineWidth =
        (j === 0 && viewport.edge.top) || (j + 1 === viewport.height && viewport.edge.bottom)
          ? theme.grid.borderWidth
          : theme.grid.lineWidth;

      ctx.beginPath();
      ctx.moveTo(leftX, lineY);
      ctx.lineTo(rightX, lineY);
      ctx.stroke();
    }

    if (theme.coordinates) {
      ctx.font = theme.coordinates.font;
      ctx.fillStyle = theme.coordinates.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < viewport.width; i += 1) {
        const label = COORDINATE_LETTERS[i + viewport.xOffset];
        const labelX = geometry.gridLeft + theme.grid.x * i;

        if (theme.coordinates.top) {
          ctx.fillText(label, labelX, geometry.marginTop / 2);
        }

        if (theme.coordinates.bottom) {
          ctx.fillText(label, labelX, geometry.canvasHeight - geometry.marginBottom / 2);
        }
      }

      for (let j = 0; j < viewport.height; j += 1) {
        const label = `${board.height - viewport.yOffset - j}`;
        const labelY = geometry.gridTop + theme.grid.y * j;

        if (theme.coordinates.left) {
          ctx.fillText(label, geometry.marginLeft / 2, labelY);
        }

        if (theme.coordinates.right) {
          ctx.fillText(label, geometry.canvasWidth - geometry.marginRight / 2, labelY);
        }
      }
    }
  }

  /**
   * @param {Canvas2DContext} ctx
   * @param {RenderFrame} frame
   * @returns {void}
   */
  _drawStarsLayer(ctx, frame) {
    const { stars, viewport, theme, geometry } = frame;

    if (stars.points <= 0) {
      return;
    }

    const step = (frame.board.width - 1) / 2 - stars.offset;

    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        if (row === 1 && col === 1) {
          if (stars.points % 2 === 0) {
            continue;
          }
        } else if (row === 1 || col === 1) {
          if (stars.points < 8) {
            continue;
          }
        } else if (stars.points < 4) {
          continue;
        }

        const boardX = stars.offset + col * step;
        const boardY = stars.offset + row * step;

        if (
          boardX < viewport.xOffset ||
          boardX >= viewport.xOffset + viewport.width ||
          boardY < viewport.yOffset ||
          boardY >= viewport.yOffset + viewport.height
        ) {
          continue;
        }

        const localX = boardX - viewport.xOffset;
        const localY = boardY - viewport.yOffset;

        ctx.beginPath();
        ctx.arc(
          theme.grid.smooth + geometry.gridLeft + localX * theme.grid.x,
          theme.grid.smooth + geometry.gridTop + localY * theme.grid.y,
          theme.stars.radius,
          0,
          Math.PI * 2,
          false
        );
        ctx.fillStyle = theme.grid.color;
        ctx.fill();
      }
    }
  }

  /**
   * @param {Canvas2DContext} ctx
   * @param {RenderFrame} frame
   * @returns {void}
   */
  _drawStonesLayer(ctx, frame) {
    const ghostStone = this._ghostStone;
    const hasReplaceGhost = Boolean(
      ghostStone &&
        ghostStone.replaceExisting &&
        ghostStone.point &&
        (!ghostStone.onlyWhenClear || frame.board.getStone(ghostStone.point) === STONE.CLEAR)
    );

    const bounds = {
      x1: frame.viewport.xOffset,
      y1: frame.viewport.yOffset,
      x2: frame.viewport.xOffset + frame.viewport.width - 1,
      y2: frame.viewport.yOffset + frame.viewport.height - 1,
    };

    frame.board.each(
      (point, intersection) => {
        if (hasReplaceGhost && point.x === ghostStone.point.x && point.y === ghostStone.point.y) {
          return;
        }

        if (intersection.stone !== STONE.BLACK && intersection.stone !== STONE.WHITE) {
          return;
        }

        const x = frame.geometry.gridLeft + (point.x - frame.viewport.xOffset) * frame.theme.grid.x;
        const y = frame.geometry.gridTop + (point.y - frame.viewport.yOffset) * frame.theme.grid.y;

        this.stones.drawShadow(
          ctx,
          x + frame.theme.shadow.xOff,
          y + frame.theme.shadow.yOff,
          frame.assets
        );
      },
      bounds
    );

    frame.board.each(
      (point, intersection) => {
        if (hasReplaceGhost && point.x === ghostStone.point.x && point.y === ghostStone.point.y) {
          return;
        }

        if (
          intersection.stone !== STONE.BLACK &&
          intersection.stone !== STONE.WHITE &&
          intersection.stone !== STONE.GHOST_BLACK &&
          intersection.stone !== STONE.GHOST_WHITE
        ) {
          return;
        }

        const x = frame.geometry.gridLeft + (point.x - frame.viewport.xOffset) * frame.theme.grid.x;
        const y = frame.geometry.gridTop + (point.y - frame.viewport.yOffset) * frame.theme.grid.y;

        if (intersection.stone === STONE.GHOST_BLACK || intersection.stone === STONE.GHOST_WHITE) {
          ctx.globalAlpha = frame.theme.stone.dimAlpha;
        } else {
          ctx.globalAlpha = 1;
        }

        this.stones.drawStone(ctx, intersection.stone, x, y, frame.assets);
        ctx.globalAlpha = 1;
      },
      bounds
    );
  }

  /**
   * @param {Canvas2DContext} ctx
   * @param {RenderFrame} frame
   * @returns {void}
   */
  _drawGhostLayer(ctx, frame) {
    if (!this._ghostStone) {
      return;
    }

    const { point, stone, onlyWhenClear } = this._ghostStone;

    if (
      point.x < frame.viewport.xOffset ||
      point.x >= frame.viewport.xOffset + frame.viewport.width ||
      point.y < frame.viewport.yOffset ||
      point.y >= frame.viewport.yOffset + frame.viewport.height
    ) {
      return;
    }

    if (onlyWhenClear && frame.board.getStone(point) !== STONE.CLEAR) {
      return;
    }

    const x = frame.geometry.gridLeft + (point.x - frame.viewport.xOffset) * frame.theme.grid.x;
    const y = frame.geometry.gridTop + (point.y - frame.viewport.yOffset) * frame.theme.grid.y;

    this.stones.drawShadow(
      ctx,
      x + frame.theme.shadow.xOff,
      y + frame.theme.shadow.yOff,
      frame.assets
    );
    ctx.globalAlpha = frame.theme.stone.dimAlpha;
    this.stones.drawStone(ctx, stone, x, y, frame.assets);
    ctx.globalAlpha = 1;
  }

  /**
   * @param {Canvas2DContext} ctx
   * @param {RenderFrame} frame
   * @returns {void}
   */
  _drawMarkersLayer(ctx, frame) {
    const bounds = {
      x1: frame.viewport.xOffset,
      y1: frame.viewport.yOffset,
      x2: frame.viewport.xOffset + frame.viewport.width - 1,
      y2: frame.viewport.yOffset + frame.viewport.height - 1,
    };

    frame.board.each(
      (point, intersection) => {
        if (!intersection.mark || isLabelMark(intersection.mark)) {
          return;
        }

        const x = frame.geometry.gridLeft + (point.x - frame.viewport.xOffset) * frame.theme.grid.x;
        const y = frame.geometry.gridTop + (point.y - frame.viewport.yOffset) * frame.theme.grid.y;
        const markColor = resolveMarkColor(frame.theme, intersection.stone);

        this.stones.drawMark(ctx, intersection.mark, x, y, markColor, frame.assets);
      },
      bounds
    );
  }

  /**
   * @param {Canvas2DContext} ctx
   * @param {RenderFrame} frame
   * @returns {void}
   */
  _drawLabelsLayer(ctx, frame) {
    const bounds = {
      x1: frame.viewport.xOffset,
      y1: frame.viewport.yOffset,
      x2: frame.viewport.xOffset + frame.viewport.width - 1,
      y2: frame.viewport.yOffset + frame.viewport.height - 1,
    };

    const clearWidth = frame.theme.stone.radius * 1.5;
    const clearHeight = frame.theme.stone.radius * 1.2;

    frame.board.each(
      (point, intersection) => {
        if (!isLabelMark(intersection.mark) || intersection.stone !== STONE.CLEAR) {
          return;
        }

        const x = frame.geometry.gridLeft + (point.x - frame.viewport.xOffset) * frame.theme.grid.x;
        const y = frame.geometry.gridTop + (point.y - frame.viewport.yOffset) * frame.theme.grid.y;

        if (frame.assets.board) {
          ctx.drawImage(
            frame.assets.board,
            x - frame.geometry.marginLeft - clearWidth / 2,
            y - frame.geometry.marginTop - clearHeight / 2,
            clearWidth,
            clearHeight,
            x - clearWidth / 2,
            y - clearHeight / 2,
            clearWidth,
            clearHeight
          );
          return;
        }

        ctx.fillStyle = frame.theme.margin.color;
        ctx.fillRect(x - clearWidth / 2, y - clearHeight / 2, clearWidth, clearHeight);
      },
      bounds
    );

    frame.board.each(
      (point, intersection) => {
        if (!isLabelMark(intersection.mark)) {
          return;
        }

        const x = frame.geometry.gridLeft + (point.x - frame.viewport.xOffset) * frame.theme.grid.x;
        const y = frame.geometry.gridTop + (point.y - frame.viewport.yOffset) * frame.theme.grid.y;
        const markColor = resolveMarkColor(frame.theme, intersection.stone);

        this.stones.drawMark(ctx, intersection.mark, x, y, markColor, frame.assets);
      },
      bounds
    );
  }

  /**
   * @param {Canvas2DContext} ctx
   * @param {RenderFrame} frame
   * @returns {void}
   */
  _drawLayers(ctx, frame) {
    for (const layer of this.layers.getOrdered()) {
      layer.draw.call(this, ctx, frame);
    }
  }

  _installDefaultLayers() {
    this.layers.add('grid', {
      zIndex: 10,
      draw: this._drawGridLayer,
    });

    this.layers.add('stars', {
      zIndex: 20,
      draw: this._drawStarsLayer,
    });

    this.layers.add('stones', {
      zIndex: 30,
      draw: this._drawStonesLayer,
    });

    this.layers.add('markers', {
      zIndex: 40,
      draw: this._drawMarkersLayer,
    });

    this.layers.add('labels', {
      zIndex: 50,
      draw: this._drawLabelsLayer,
    });

    this.layers.add('ghost', {
      zIndex: 55,
      draw: this._drawGhostLayer,
    });

    this.layers.add('overlay', {
      zIndex: 60,
      draw: () => {},
    });
  }

  /**
   * @returns {BoardRenderer}
   */
  render() {
    const frame = this._buildFrame();
    this._lastFrame = frame;
    this.ctx = this._prepareCanvas(
      this.canvas,
      frame.geometry.canvasWidth,
      frame.geometry.canvasHeight,
      this.pixelRatio,
      true
    );

    this._drawLayers(this.ctx, frame);
    return this;
  }

  /**
   * @param {CanvasLike} canvas
   * @param {RenderTargetOptions} [options]
   * @returns {CanvasLike}
   */
  renderToCanvas(canvas, options = {}) {
    const scale = Number.isFinite(options.scale) && options.scale > 0 ? options.scale : 1;
    const frame = this._buildFrame();
    const ctx = this._prepareCanvas(
      canvas,
      frame.geometry.canvasWidth * scale,
      frame.geometry.canvasHeight * scale,
      1,
      false
    );

    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    this._drawLayers(ctx, frame);
    return canvas;
  }

  /**
   * @param {ExportOptions} [options]
   * @returns {string}
   */
  toDataURL(options = {}) {
    const canvas = createCanvasElement();
    this.renderToCanvas(canvas, { scale: options.scale });

    if (!('toDataURL' in canvas) || typeof canvas.toDataURL !== 'function') {
      throw new Error('toDataURL is not available for the active canvas implementation');
    }

    return canvas.toDataURL(normalizeExportFormat(options.format), options.quality);
  }

  /**
   * @param {ExportOptions} [options]
   * @returns {Promise<Blob>}
   */
  async toBlob(options = {}) {
    const canvas = createCanvasElement();
    this.renderToCanvas(canvas, { scale: options.scale });

    const type = normalizeExportFormat(options.format);
    const quality = options.quality;

    if ('convertToBlob' in canvas && typeof canvas.convertToBlob === 'function') {
      return canvas.convertToBlob({ type, quality });
    }

    if ('toBlob' in canvas && typeof canvas.toBlob === 'function') {
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
              return;
            }

            reject(new Error('Failed to export canvas to blob'));
          },
          type,
          quality
        );
      });
    }

    throw new Error('toBlob is not available for the active canvas implementation');
  }

  /**
   * @returns {void}
   */
  destroy() {
    if (this._hoverPreview) {
      this._hoverPreview.unsubscribe();
      this._hoverPreview = null;
    }

    if (this._boardUnsubscribe) {
      this._boardUnsubscribe();
      this._boardUnsubscribe = null;
    }

    if (isHtmlCanvas(this.canvas)) {
      for (const [type, handler] of this._pointerListeners) {
        this.canvas.removeEventListener(type, handler);
      }
    }

    this._pointerListeners = [];

    if (this._createdCanvas && this.container && isHtmlCanvas(this.canvas)) {
      this.container.removeChild(this.canvas);
    }
  }
}

/**
 * @param {string | HTMLElement | HTMLCanvasElement | OffscreenCanvas | null | undefined} target
 * @param {BoardRendererOptions & { board: BoardState }} options
 * @returns {BoardRenderer}
 */
export function createRenderer(target, options) {
  return new BoardRenderer(target, options);
}

/**
 * @param {BoardState} board
 * @param {RenderBoardImageOptions} [options]
 * @returns {Promise<Blob | string | CanvasLike>}
 */
export async function renderBoardImage(board, options = {}) {
  const canvas = createCanvasElement();
  const renderer = new BoardRenderer(canvas, {
    ...options,
    board,
  });

  await renderer.whenReady();
  renderer.render();

  if (options.as === 'canvas') {
    return canvas;
  }

  if (options.as === 'data-url') {
    return renderer.toDataURL(options);
  }

  return renderer.toBlob(options);
}
