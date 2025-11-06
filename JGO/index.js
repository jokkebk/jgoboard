import JGO from './constants.js'; // base for JGO object
import Coordinate from './coordinate.js';
import Canvas from './canvas.js';
import Node from './node.js';
import Notifier from './notifier.js';
import Record from './record.js';
import Setup from './setup.js';
import Stones from './stones.js';
import Board from './board.js';
import * as util from './util.js';
import sgf from './sgf.js';
import auto from './auto.js';

// Assemble the JGO object
JGO.Coordinate = Coordinate;
JGO.Canvas = Canvas;
JGO.Node = Node;
JGO.Notifier = Notifier;
JGO.Record = Record;
JGO.Setup = Setup;
JGO.Stones = Stones;
JGO.Board = Board;
JGO.util = util;
JGO.sgf = sgf;
JGO.auto = auto;

// Named exports for tree-shaking
export {
  Coordinate,
  Canvas,
  Node,
  Notifier,
  Record,
  Setup,
  Stones,
  Board,
  util,
  sgf,
  auto
};

export default JGO;
