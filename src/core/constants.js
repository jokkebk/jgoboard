export const STONE = Object.freeze({
  CLEAR: 0,
  BLACK: 1,
  WHITE: 2,
  GHOST_BLACK: 3,
  GHOST_WHITE: 4,
});

export const MARK = Object.freeze({
  NONE: '',
  SELECTED: '^',
  SQUARE: '#',
  TRIANGLE: '/',
  CIRCLE: '0',
  CROSS: '*',
  BLACK_TERRITORY: '-',
  WHITE_TERRITORY: '+',
});

export const COORDINATE_LETTERS = Object.freeze('ABCDEFGHJKLMNOPQRSTUVWXYZ'.split(''));
