import { deepFreeze, deepMerge } from '../shared/deep-merge.js';

/**
 * @typedef {object} ThemeMargin
 * @property {string} color
 * @property {number} normal
 * @property {number} clipped
 */

/**
 * @typedef {object} ThemeBoardShadow
 * @property {string} color
 * @property {number} blur
 * @property {number} offX
 * @property {number} offY
 */

/**
 * @typedef {object} ThemeBorder
 * @property {string} color
 * @property {number} lineWidth
 */

/**
 * @typedef {object} ThemePadding
 * @property {number} normal
 * @property {number} clipped
 */

/**
 * @typedef {object} ThemeGrid
 * @property {string} color
 * @property {number} x
 * @property {number} y
 * @property {number} smooth
 * @property {number} borderWidth
 * @property {number} lineWidth
 */

/**
 * @typedef {object} ThemeStars
 * @property {number | 'auto'} points
 * @property {number | 'auto'} offset
 * @property {number} radius
 */

/**
 * @typedef {object} ThemeCoordinates
 * @property {boolean} top
 * @property {boolean} right
 * @property {boolean} bottom
 * @property {boolean} left
 * @property {string} color
 * @property {string} font
 */

/**
 * @typedef {object} ThemeStone
 * @property {number} radius
 * @property {number} dimAlpha
 */

/**
 * @typedef {object} ThemeShadow
 * @property {number} xOff
 * @property {number} yOff
 */

/**
 * @typedef {object} ThemeMark
 * @property {number} lineWidth
 * @property {string} blackColor
 * @property {string} whiteColor
 * @property {string} clearColor
 * @property {string} font
 */

/**
 * @typedef {object} ThemeTextures
 * @property {string} black
 * @property {string} white
 * @property {string} shadow
 * @property {string} board
 */

/**
 * @typedef {object} Theme
 * @property {ThemeMargin} margin
 * @property {ThemeBoardShadow} boardShadow
 * @property {ThemeBorder} border
 * @property {ThemePadding} padding
 * @property {ThemeGrid} grid
 * @property {ThemeStars} stars
 * @property {ThemeCoordinates | false} coordinates
 * @property {ThemeStone} stone
 * @property {ThemeShadow} shadow
 * @property {ThemeMark} mark
 * @property {ThemeTextures | false} textures
 */

/**
 * @template T
 * @typedef {{ [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }} DeepPartial
 */

/**
 * @typedef {string | DeepPartial<Theme> | Theme} ThemeInput
 */

/** @type {Theme} */
const baseTheme = {
  margin: {
    color: '#ffffff',
    normal: 20,
    clipped: 20,
  },
  boardShadow: {
    color: '#ffe0a8',
    blur: 15,
    offX: 2.5,
    offY: 2.5,
  },
  border: {
    color: 'rgba(255, 255, 255, 0.3)',
    lineWidth: 2,
  },
  padding: {
    normal: 10,
    clipped: 5,
  },
  grid: {
    color: '#202020',
    x: 25,
    y: 25,
    smooth: 0,
    borderWidth: 1.2,
    lineWidth: 0.9,
  },
  stars: {
    points: 'auto',
    offset: 'auto',
    radius: 2.5,
  },
  coordinates: {
    top: true,
    right: true,
    bottom: true,
    left: true,
    color: '#808080',
    font: 'normal 12px sans-serif',
  },
  stone: {
    radius: 12,
    dimAlpha: 0.6,
  },
  shadow: {
    xOff: -1,
    yOff: 1,
  },
  mark: {
    lineWidth: 1,
    blackColor: 'white',
    whiteColor: 'black',
    clearColor: 'black',
    font: 'normal 12px sans-serif',
  },
  textures: {
    black: 'medium/black.png',
    white: 'medium/white.png',
    shadow: 'medium/shadow.png',
    board: 'medium/shinkaya.jpg',
  },
};

/** @type {DeepPartial<Theme>} */
const largeScale = {
  margin: {
    normal: 40,
    clipped: 40,
  },
  boardShadow: {
    blur: 30,
    offX: 5,
    offY: 5,
  },
  padding: {
    normal: 20,
    clipped: 10,
  },
  grid: {
    x: 50,
    y: 50,
    borderWidth: 1.5,
    lineWidth: 1.2,
  },
  stars: {
    radius: 3,
  },
  coordinates: {
    font: 'normal 18px sans-serif',
  },
  stone: {
    radius: 24,
  },
  shadow: {
    xOff: -2,
    yOff: 2,
  },
  mark: {
    lineWidth: 1.5,
    font: 'normal 24px sans-serif',
  },
  textures: {
    black: 'large/black.png',
    white: 'large/white.png',
    shadow: 'large/shadow.png',
    board: 'large/shinkaya.jpg',
  },
};

/** @type {DeepPartial<Theme>} */
const walnutOverride = {
  textures: {
    board: 'medium/walnut.jpg',
    shadow: 'medium/shadow_dark.png',
  },
  boardShadow: {
    color: '#e2baa0',
  },
  grid: {
    color: '#101010',
    borderWidth: 1.4,
    lineWidth: 1.1,
  },
};

/** @type {DeepPartial<Theme>} */
const walnutOverrideLarge = {
  textures: {
    board: 'large/walnut.jpg',
    shadow: 'large/shadow_dark.png',
  },
  boardShadow: {
    color: '#e2baa0',
  },
  grid: {
    color: '#101010',
    borderWidth: 1.8,
    lineWidth: 1.5,
  },
};

/** @type {DeepPartial<Theme>} */
const bwOverride = {
  textures: false,
};

/** @type {Theme} */
export const mediumKaya = deepFreeze(deepMerge({}, baseTheme));
/** @type {Theme} */
export const mediumWalnut = deepFreeze(deepMerge(baseTheme, walnutOverride));
/** @type {Theme} */
export const mediumBW = deepFreeze(deepMerge(baseTheme, bwOverride));

/** @type {Theme} */
export const largeKaya = deepFreeze(deepMerge(baseTheme, largeScale));
/** @type {Theme} */
export const largeWalnut = deepFreeze(deepMerge(deepMerge(baseTheme, largeScale), walnutOverrideLarge));
/** @type {Theme} */
export const largeBW = deepFreeze(deepMerge(deepMerge(baseTheme, largeScale), bwOverride));

/** @type {Theme} */
export const kayaMedium = mediumKaya;
/** @type {Theme} */
export const kayaLarge = largeKaya;

/** @type {Readonly<Record<string, Theme>>} */
export const themesByName = Object.freeze({
  'kaya-medium': mediumKaya,
  'kaya-large': largeKaya,
  'walnut-medium': mediumWalnut,
  'walnut-large': largeWalnut,
  'bw-medium': mediumBW,
  'bw-large': largeBW,
});

/**
 * @param {ThemeInput} themeInput
 * @returns {Theme}
 */
export function resolveTheme(themeInput) {
  if (!themeInput) {
    return mediumKaya;
  }

  if (typeof themeInput === 'string') {
    const named = themesByName[themeInput];
    if (!named) {
      throw new Error(`unknown theme: ${themeInput}`);
    }
    return named;
  }

  return deepMerge(mediumKaya, themeInput);
}
