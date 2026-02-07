import { deepFreeze, deepMerge } from '../shared/deep-merge.js';

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

const bwOverride = {
  textures: false,
};

export const mediumKaya = deepFreeze(deepMerge({}, baseTheme));
export const mediumWalnut = deepFreeze(deepMerge(baseTheme, walnutOverride));
export const mediumBW = deepFreeze(deepMerge(baseTheme, bwOverride));

export const largeKaya = deepFreeze(deepMerge(baseTheme, largeScale));
export const largeWalnut = deepFreeze(deepMerge(deepMerge(baseTheme, largeScale), walnutOverrideLarge));
export const largeBW = deepFreeze(deepMerge(deepMerge(baseTheme, largeScale), bwOverride));

export const kayaMedium = mediumKaya;
export const kayaLarge = largeKaya;

export const themesByName = Object.freeze({
  'kaya-medium': mediumKaya,
  'kaya-large': largeKaya,
  'walnut-medium': mediumWalnut,
  'walnut-large': largeWalnut,
  'bw-medium': mediumBW,
  'bw-large': largeBW,
});

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
