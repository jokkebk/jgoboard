import { extend } from './util.js';

/**
 * Enum for intersection types. Aliased in JGO namespace, e.g. JGO.BLACK.
 * @enum
 * @readonly
 */
export const INTERSECTION = {
  CLEAR: 0,
  /** Black stone */
  BLACK: 1,
  /** White stone */
  WHITE: 2,
  /** Semi-transparent black stone */
  DIM_BLACK: 3,
  /** Semi-transparent white stone */
  DIM_WHITE: 4,
};

/**
 * Enum for marker types.
 * @readonly
 * @enum
 */
export const MARK = {
  /** No marker ('') */
  NONE: '',
  /** Selected intersection */
  SELECTED: '^',
  /** Square */
  SQUARE: '#',
  /** Triangle */
  TRIANGLE: '/',
  /** Circle */
  CIRCLE: '0',
  /** Cross */
  CROSS: '*',
  /** Black territory */
  BLACK_TERRITORY: '-',
  /** White territory */
  WHITE_TERRITORY: '+',
};

/**
 * Board coordinate array.
 * @constant
 */
export const COORDINATES = 'ABCDEFGHJKLMNOPQRSTUVWXYZ'.split('');

// Create the base JGO object with all exports
const JGO = {
  INTERSECTION,
  MARK,
  COORDINATES,
};

// Alias all INTERSECTION properties into globals (for backward compatibility)
extend(JGO, INTERSECTION);

export default JGO;
