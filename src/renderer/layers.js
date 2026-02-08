import { normalizePoint } from '../core/index.js';

/**
 * @typedef {import('./board-renderer.js').Point} Point
 * @typedef {import('./board-renderer.js').RenderFrame} RenderFrame
 * @typedef {import('./board-renderer.js').RendererLayer} RendererLayer
 * @typedef {import('./board-renderer.js').Canvas2DContext} Canvas2DContext
 * @typedef {import('./board-renderer.js').CanvasLike} CanvasLike
 */

/**
 * @typedef {{ r: number, g: number, b: number, a: number }} ParsedColor
 */

/**
 * @typedef {{ at: number, color: string }} GradientStop
 */

/**
 * @typedef {(normalizedValue: number, rawValue?: number, point?: Point, frame?: RenderFrame) => string} PaletteFunction
 */

/**
 * @typedef {object} SelectionRect
 * @property {number} x1
 * @property {number} y1
 * @property {number} x2
 * @property {number} y2
 */

/**
 * @typedef {object} SelectionInput
 * @property {Point | string} [from]
 * @property {Point | string} [to]
 * @property {number} [x1]
 * @property {number} [y1]
 * @property {number} [x2]
 * @property {number} [y2]
 */

/**
 * @typedef {Map<string, number> | Record<string, number> | number[][]} NumericValueContainer
 */

/**
 * @typedef {Map<string, ParsedColor | string> | Record<string, ParsedColor | string> | (ParsedColor | string)[][]} ColorValueContainer
 */

/**
 * @typedef {object} SelectionLayerOptions
 * @property {string} [name]
 * @property {number} [zIndex]
 * @property {string} [fillStyle]
 * @property {string} [strokeStyle]
 * @property {number} [lineWidth]
 * @property {boolean} [drawStroke]
 * @property {(frame: RenderFrame) => SelectionInput | null} [getSelection]
 */

/**
 * @typedef {object} HeatmapLayerOptions
 * @property {string} [name]
 * @property {number} [zIndex]
 * @property {'values' | 'rgba'} [dataMode]
 * @property {number} [minValue]
 * @property {number} [maxValue]
 * @property {number} [inset]
 * @property {boolean} [clampValues]
 * @property {'cells' | 'gradient'} [renderMode]
 * @property {number} [defaultValue]
 * @property {ParsedColor | string} [defaultColor]
 * @property {number} [edgeFadeCells]
 * @property {PaletteFunction | GradientStop[]} [palette]
 * @property {NumericValueContainer | ((frame: RenderFrame) => NumericValueContainer | null)} [values]
 * @property {ColorValueContainer | ((frame: RenderFrame) => ColorValueContainer | null)} [colors]
 * @property {(point: Point, frame: RenderFrame, values: NumericValueContainer | null) => number} [getValue]
 * @property {(point: Point, frame: RenderFrame, values: ColorValueContainer | null) => ParsedColor | string} [getColor]
 */

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

/**
 * @param {string} text
 * @returns {ParsedColor | null}
 */
function parseHexColor(text) {
  if (!text || typeof text !== 'string' || text[0] !== '#') {
    return null;
  }

  if (text.length === 4) {
    const r = Number.parseInt(text[1] + text[1], 16);
    const g = Number.parseInt(text[2] + text[2], 16);
    const b = Number.parseInt(text[3] + text[3], 16);
    return { r, g, b, a: 1 };
  }

  if (text.length === 7) {
    const r = Number.parseInt(text.slice(1, 3), 16);
    const g = Number.parseInt(text.slice(3, 5), 16);
    const b = Number.parseInt(text.slice(5, 7), 16);
    return { r, g, b, a: 1 };
  }

  return null;
}

/**
 * @param {string} text
 * @returns {ParsedColor | null}
 */
function parseRgbColor(text) {
  if (typeof text !== 'string') {
    return null;
  }

  const match = /^rgba?\(([^)]+)\)$/i.exec(text.trim());
  if (!match) {
    return null;
  }

  const parts = match[1].split(',').map((part) => part.trim());
  if (parts.length < 3) {
    return null;
  }

  const r = Number.parseFloat(parts[0]);
  const g = Number.parseFloat(parts[1]);
  const b = Number.parseFloat(parts[2]);
  const a = parts.length > 3 ? Number.parseFloat(parts[3]) : 1;

  if (![r, g, b, a].every((value) => Number.isFinite(value))) {
    return null;
  }

  return { r, g, b, a };
}

/**
 * @param {string} text
 * @returns {ParsedColor | null}
 */
function parseColor(text) {
  return parseHexColor(text) || parseRgbColor(text);
}

/**
 * @param {ParsedColor | string | null | undefined} value
 * @param {ParsedColor} fallbackColor
 * @returns {ParsedColor}
 */
function toParsedColor(value, fallbackColor) {
  if (!value) {
    return fallbackColor;
  }

  if (typeof value === 'string') {
    return parseColor(value) || fallbackColor;
  }

  if (
    typeof value === 'object' &&
    Number.isFinite(value.r) &&
    Number.isFinite(value.g) &&
    Number.isFinite(value.b)
  ) {
    return {
      r: value.r,
      g: value.g,
      b: value.b,
      a: Number.isFinite(value.a) ? value.a : 1,
    };
  }

  return fallbackColor;
}

/**
 * @param {ParsedColor} color
 * @returns {string}
 */
function toRgbaString(color) {
  const r = Math.round(Math.max(0, Math.min(255, color.r)));
  const g = Math.round(Math.max(0, Math.min(255, color.g)));
  const b = Math.round(Math.max(0, Math.min(255, color.b)));
  const a = clamp01(color.a);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * @param {ParsedColor} from
 * @param {ParsedColor} to
 * @param {number} t
 * @returns {ParsedColor}
 */
function interpolateColor(from, to, t) {
  return {
    r: from.r + (to.r - from.r) * t,
    g: from.g + (to.g - from.g) * t,
    b: from.b + (to.b - from.b) * t,
    a: from.a + (to.a - from.a) * t,
  };
}

/**
 * @param {GradientStop[]} stops
 * @returns {{ at: number, color: ParsedColor }[]}
 */
function normalizeStops(stops) {
  if (!Array.isArray(stops) || stops.length < 2) {
    throw new Error('palette stops must contain at least two color stops');
  }

  const normalized = stops
    .map((stop) => {
      if (!Number.isFinite(stop.at)) {
        throw new Error('palette stop "at" must be a finite number');
      }

      const parsedColor = parseColor(stop.color);
      if (!parsedColor) {
        throw new Error(`unsupported palette color format: ${stop.color}`);
      }

      return {
        at: stop.at,
        color: parsedColor,
      };
    })
    .sort((a, b) => a.at - b.at);

  return normalized;
}

/**
 * @param {GradientStop[]} stops
 * @returns {PaletteFunction}
 */
export function createGradientPalette(stops) {
  const normalizedStops = normalizeStops(stops);

  return (normalizedValue) => {
    const t = clamp01(normalizedValue);

    if (t <= normalizedStops[0].at) {
      return toRgbaString(normalizedStops[0].color);
    }

    for (let i = 0; i < normalizedStops.length - 1; i += 1) {
      const a = normalizedStops[i];
      const b = normalizedStops[i + 1];

      if (t >= a.at && t <= b.at) {
        const span = b.at - a.at || 1;
        const localT = (t - a.at) / span;
        return toRgbaString(interpolateColor(a.color, b.color, localT));
      }
    }

    return toRgbaString(normalizedStops[normalizedStops.length - 1].color);
  };
}

/**
 * @type {Readonly<{
 *   redAlpha: (options?: { maxAlpha?: number, red?: number, green?: number, blue?: number }) => PaletteFunction,
 *   greenYellowRed: (options?: { alpha?: number }) => PaletteFunction
 * }>}
 */
export const heatmapPalettes = Object.freeze({
  redAlpha(options = {}) {
    const maxAlpha = Number.isFinite(options.maxAlpha) ? clamp01(options.maxAlpha) : 0.5;
    const red = Number.isFinite(options.red) ? options.red : 220;
    const green = Number.isFinite(options.green) ? options.green : 32;
    const blue = Number.isFinite(options.blue) ? options.blue : 32;

    return (normalizedValue) => {
      const t = clamp01(normalizedValue);
      return `rgba(${red}, ${green}, ${blue}, ${(t * maxAlpha).toFixed(3)})`;
    };
  },

  greenYellowRed(options = {}) {
    const alpha = Number.isFinite(options.alpha) ? clamp01(options.alpha) : 0.45;
    return createGradientPalette([
      { at: 0, color: `rgba(0, 160, 80, ${alpha})` },
      { at: 0.5, color: `rgba(255, 210, 0, ${alpha})` },
      { at: 1, color: `rgba(215, 50, 45, ${alpha})` },
    ]);
  },
});

function keyForPoint(point) {
  return `${point.x},${point.y}`;
}

function normalizeValueContainer(valuesOrFactory, frame) {
  return typeof valuesOrFactory === 'function' ? valuesOrFactory(frame) : valuesOrFactory;
}

function readValue(values, point) {
  if (!values) {
    return undefined;
  }

  if (typeof values.get === 'function') {
    const comma = values.get(keyForPoint(point));
    if (comma !== undefined) {
      return comma;
    }

    const colon = values.get(`${point.x}:${point.y}`);
    if (colon !== undefined) {
      return colon;
    }
  }

  if (Array.isArray(values)) {
    if (Array.isArray(values[point.x])) {
      return values[point.x][point.y];
    }

    if (Array.isArray(values[point.y])) {
      return values[point.y][point.x];
    }

    return undefined;
  }

  if (typeof values === 'object') {
    if (values[keyForPoint(point)] !== undefined) {
      return values[keyForPoint(point)];
    }

    if (values[`${point.x}:${point.y}`] !== undefined) {
      return values[`${point.x}:${point.y}`];
    }

    if (typeof values[point.x] === 'object' && values[point.x] !== null) {
      return values[point.x][point.y];
    }
  }

  return undefined;
}

function normalizeSelectionRect(selection, frame) {
  if (!selection) {
    return null;
  }

  let x1;
  let y1;
  let x2;
  let y2;

  if (selection.from && selection.to) {
    const from = normalizePoint(selection.from, frame.board.height);
    const to = normalizePoint(selection.to, frame.board.height);
    x1 = Math.min(from.x, to.x);
    y1 = Math.min(from.y, to.y);
    x2 = Math.max(from.x, to.x);
    y2 = Math.max(from.y, to.y);
  } else {
    x1 = selection.x1;
    y1 = selection.y1;
    x2 = selection.x2;
    y2 = selection.y2;
  }

  if (![x1, y1, x2, y2].every((value) => Number.isInteger(value))) {
    return null;
  }

  x1 = Math.max(frame.viewport.xOffset, x1);
  y1 = Math.max(frame.viewport.yOffset, y1);
  x2 = Math.min(frame.viewport.xOffset + frame.viewport.width - 1, x2);
  y2 = Math.min(frame.viewport.yOffset + frame.viewport.height - 1, y2);

  if (x2 < x1 || y2 < y1) {
    return null;
  }

  return { x1, y1, x2, y2 };
}

function cellRect(frame, point) {
  const x = frame.geometry.gridLeft + (point.x - frame.viewport.xOffset) * frame.theme.grid.x;
  const y = frame.geometry.gridTop + (point.y - frame.viewport.yOffset) * frame.theme.grid.y;

  return {
    left: x - frame.theme.grid.x / 2,
    top: y - frame.theme.grid.y / 2,
    width: frame.theme.grid.x,
    height: frame.theme.grid.y,
  };
}

function clampIndex(value, max) {
  if (value < 0) {
    return 0;
  }
  if (value > max) {
    return max;
  }
  return value;
}

/**
 * @param {number} width
 * @param {number} height
 * @returns {CanvasLike | null}
 */
function createWorkingCanvas(width, height) {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  return null;
}

/**
 * @param {Canvas2DContext} ctx
 * @param {RenderFrame} frame
 * @param {{
 *   edgeFadePixels: number,
 *   resolveColor: (point: Point, frame: RenderFrame, runtime: { valueContainer: NumericValueContainer | null, colorContainer: ColorValueContainer | null }) => ParsedColor,
 *   runtime: { valueContainer: NumericValueContainer | null, colorContainer: ColorValueContainer | null }
 * }} options
 * @returns {boolean}
 */
function drawGradientHeatmap(ctx, frame, options) {
  const overlayLeft = frame.geometry.gridLeft - frame.theme.grid.x / 2;
  const overlayTop = frame.geometry.gridTop - frame.theme.grid.y / 2;
  const overlayWidth = Math.max(1, Math.round(frame.theme.grid.x * frame.viewport.width));
  const overlayHeight = Math.max(1, Math.round(frame.theme.grid.y * frame.viewport.height));

  const workCanvas = createWorkingCanvas(overlayWidth, overlayHeight);
  if (!workCanvas) {
    return false;
  }

  const workCtx = /** @type {Canvas2DContext | null} */ (
    workCanvas.getContext('2d', { willReadFrequently: true })
  );
  if (!workCtx) {
    return false;
  }

  const image = workCtx.createImageData(overlayWidth, overlayHeight);
  const pixels = image.data;
  const colors = Array.from({ length: frame.viewport.height }, () => Array(frame.viewport.width).fill(null));

  for (let localY = 0; localY < frame.viewport.height; localY += 1) {
    for (let localX = 0; localX < frame.viewport.width; localX += 1) {
      const point = {
        x: frame.viewport.xOffset + localX,
        y: frame.viewport.yOffset + localY,
      };
      colors[localY][localX] = options.resolveColor(point, frame, options.runtime);
    }
  }

  for (let py = 0; py < overlayHeight; py += 1) {
    const gridY = (py + 0.5) / frame.theme.grid.y - 0.5;
    const y0 = Math.floor(gridY);
    const y1 = y0 + 1;
    const ty = gridY - y0;
    const sy0 = clampIndex(y0, frame.viewport.height - 1);
    const sy1 = clampIndex(y1, frame.viewport.height - 1);

    for (let px = 0; px < overlayWidth; px += 1) {
      const gridX = (px + 0.5) / frame.theme.grid.x - 0.5;
      const x0 = Math.floor(gridX);
      const x1 = x0 + 1;
      const tx = gridX - x0;
      const sx0 = clampIndex(x0, frame.viewport.width - 1);
      const sx1 = clampIndex(x1, frame.viewport.width - 1);

      const c00 = colors[sy0][sx0];
      const c10 = colors[sy0][sx1];
      const c01 = colors[sy1][sx0];
      const c11 = colors[sy1][sx1];

      const topR = c00.r * (1 - tx) + c10.r * tx;
      const topG = c00.g * (1 - tx) + c10.g * tx;
      const topB = c00.b * (1 - tx) + c10.b * tx;
      const topA = c00.a * (1 - tx) + c10.a * tx;

      const bottomR = c01.r * (1 - tx) + c11.r * tx;
      const bottomG = c01.g * (1 - tx) + c11.g * tx;
      const bottomB = c01.b * (1 - tx) + c11.b * tx;
      const bottomA = c01.a * (1 - tx) + c11.a * tx;

      const r = topR * (1 - ty) + bottomR * ty;
      const g = topG * (1 - ty) + bottomG * ty;
      const b = topB * (1 - ty) + bottomB * ty;
      let a = topA * (1 - ty) + bottomA * ty;

      if (options.edgeFadePixels > 0) {
        const dx = Math.min(px + 0.5, overlayWidth - (px + 0.5));
        const dy = Math.min(py + 0.5, overlayHeight - (py + 0.5));
        const edgeDistance = Math.min(dx, dy);
        const fade = clamp01(edgeDistance / options.edgeFadePixels);
        a *= fade;
      }

      const dst = (py * overlayWidth + px) * 4;
      pixels[dst] = Math.round(Math.max(0, Math.min(255, r)));
      pixels[dst + 1] = Math.round(Math.max(0, Math.min(255, g)));
      pixels[dst + 2] = Math.round(Math.max(0, Math.min(255, b)));
      pixels[dst + 3] = Math.round(clamp01(a) * 255);
    }
  }

  workCtx.putImageData(image, 0, 0);

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(workCanvas, overlayLeft, overlayTop, overlayWidth, overlayHeight);
  ctx.restore();

  return true;
}

/**
 * @param {SelectionLayerOptions} [options]
 * @returns {RendererLayer}
 */
export function createSelectionLayer(options = {}) {
  const getSelection = options.getSelection || (() => null);
  const zIndex = Number.isFinite(options.zIndex) ? options.zIndex : 66;
  const fillStyle = options.fillStyle || 'rgba(128, 128, 255, 0.5)';
  const strokeStyle = options.strokeStyle || 'rgba(65, 65, 170, 0.85)';
  const lineWidth = Number.isFinite(options.lineWidth) ? options.lineWidth : 1;
  const drawStroke = options.drawStroke !== false;
  const name = options.name || 'selection';

  return {
    name,
    zIndex,
    draw(ctx, frame) {
      const selection = normalizeSelectionRect(getSelection(frame), frame);
      if (!selection) {
        return;
      }

      const topLeft = cellRect(frame, { x: selection.x1, y: selection.y1 });
      const bottomRight = cellRect(frame, { x: selection.x2, y: selection.y2 });

      const left = topLeft.left;
      const top = topLeft.top;
      const width = bottomRight.left + bottomRight.width - topLeft.left;
      const height = bottomRight.top + bottomRight.height - topLeft.top;

      ctx.fillStyle = fillStyle;
      ctx.fillRect(left, top, width, height);

      if (drawStroke) {
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.strokeRect(left + 0.5, top + 0.5, width - 1, height - 1);
      }
    },
  };
}

/**
 * @param {HeatmapLayerOptions} [options]
 * @returns {RendererLayer}
 */
export function createHeatmapLayer(options = {}) {
  const dataMode = options.dataMode || (options.colors || options.getColor ? 'rgba' : 'values');
  const minValue = Number.isFinite(options.minValue) ? options.minValue : 0;
  const maxValue = Number.isFinite(options.maxValue) ? options.maxValue : 1;
  const zIndex = Number.isFinite(options.zIndex) ? options.zIndex : 65;
  const inset = Number.isFinite(options.inset) ? options.inset : 0;
  const clampValues = options.clampValues !== false;
  const valuesOrFactory = options.values || (() => null);
  const colorsOrFactory = options.colors || (() => null);
  const getValue = options.getValue;
  const getColor = options.getColor;
  const renderMode = options.renderMode || 'cells';
  const defaultValue = Number.isFinite(options.defaultValue) ? options.defaultValue : 0;
  const defaultColor = toParsedColor(options.defaultColor, { r: 0, g: 0, b: 0, a: 0 });
  const edgeFadeCells = Number.isFinite(options.edgeFadeCells) ? Math.max(0, options.edgeFadeCells) : 1.25;

  if (dataMode !== 'values' && dataMode !== 'rgba') {
    throw new Error(`unsupported heatmap dataMode: ${dataMode}`);
  }

  let palette = options.palette;

  if (dataMode === 'values') {
    if (!palette) {
      palette = heatmapPalettes.redAlpha({ maxAlpha: 0.5 });
    } else if (Array.isArray(palette)) {
      palette = createGradientPalette(palette);
    }

    if (typeof palette !== 'function') {
      throw new Error('heatmap palette must be a function or an array of gradient stops');
    }
  }

  const range = maxValue - minValue || 1;
  const name = options.name || 'heatmap';
  /** @type {PaletteFunction | null} */
  const paletteFn = dataMode === 'values' ? /** @type {PaletteFunction} */ (palette) : null;

  const resolveColor =
    dataMode === 'rgba'
      ? (point, frame, runtime) => {
          const rawColor =
            typeof getColor === 'function'
              ? getColor(point, frame, runtime.colorContainer)
              : readValue(runtime.colorContainer, point);
          return toParsedColor(rawColor, defaultColor);
        }
      : (point, frame, runtime) => {
          const rawValue =
            typeof getValue === 'function'
              ? getValue(point, frame, runtime.valueContainer)
              : readValue(runtime.valueContainer, point);

          const numeric = Number.isFinite(rawValue) ? rawValue : defaultValue;
          let normalized = (numeric - minValue) / range;
          normalized = clampValues ? clamp01(normalized) : normalized;

          return toParsedColor(
            /** @type {PaletteFunction} */ (paletteFn)(normalized, numeric, point, frame),
            defaultColor
          );
        };

  return {
    name,
    zIndex,
    draw(ctx, frame) {
      const runtime = {
        valueContainer: normalizeValueContainer(valuesOrFactory, frame),
        colorContainer: normalizeValueContainer(colorsOrFactory, frame),
      };

      if (dataMode === 'values' && !runtime.valueContainer && typeof getValue !== 'function') {
        return;
      }

      if (dataMode === 'rgba' && !runtime.colorContainer && typeof getColor !== 'function') {
        return;
      }

      if (renderMode === 'gradient') {
        const didDraw = drawGradientHeatmap(ctx, frame, {
          edgeFadePixels: Math.min(frame.theme.grid.x, frame.theme.grid.y) * edgeFadeCells,
          resolveColor,
          runtime,
        });

        if (didDraw) {
          return;
        }
      }

      const bounds = {
        x1: frame.viewport.xOffset,
        y1: frame.viewport.yOffset,
        x2: frame.viewport.xOffset + frame.viewport.width - 1,
        y2: frame.viewport.yOffset + frame.viewport.height - 1,
      };

      frame.board.each(
        (point) => {
          const color = resolveColor(point, frame, runtime);

          if (!color || color.a <= 0) {
            return;
          }

          const rect = cellRect(frame, point);
          ctx.fillStyle = toRgbaString(color);
          ctx.fillRect(
            rect.left + inset,
            rect.top + inset,
            Math.max(0, rect.width - inset * 2),
            Math.max(0, rect.height - inset * 2)
          );
        },
        bounds
      );
    },
  };
}

/**
 * @param {HeatmapLayerOptions} [options]
 * @returns {RendererLayer}
 */
export function createPaletteHeatmapLayer(options = {}) {
  return createHeatmapLayer({
    ...options,
    dataMode: 'values',
  });
}

/**
 * @param {HeatmapLayerOptions} [options]
 * @returns {RendererLayer}
 */
export function createRawHeatmapLayer(options = {}) {
  return createHeatmapLayer({
    ...options,
    dataMode: 'rgba',
  });
}
