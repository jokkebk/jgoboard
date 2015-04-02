(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var request = require('superagent');

/**
 * Automatic div module.
 * @module autodiv
 */

function parseMarkup(str) {
  var lines = str.split('\n'), data = [];

  // Handle div contents as diagram contents
  for(var i = 0, len = lines.length; i < len; ++i) {
    var elems = [], line = lines[i];

    for(var j = 0, len2 = line.length; j < len2; ++j) {
      switch(line[j]) {
        case '.':
          elems.push({type: JGO.CLEAR}); break;
        case 'o':
          elems.push({type: JGO.WHITE}); break;
        case 'x':
          elems.push({type: JGO.BLACK}); break;
        case ' ':
          break; // ignore whitespace
        default: // assume marker
          if(!elems.length) break; // no intersection yet
          // Append to mark so x123 etc. are possible
          if(elems[elems.length - 1].mark)
            elems[elems.length - 1].mark += line[j];
          else
            elems[elems.length - 1].mark = line[j];
      }
    }

    if(elems.length) data.push(elems);
  }

  return data;
}

// Array of loaded boards
var boards = [];

// Available attributes:
// data-jgostyle: Evaluated and used as board style
// data-jgosize: Used as board size unless data-jgosgf is defined
// data-jgoview: Used to define viewport
function process(div) {
  // Handle special jgo-* attributes
  var style, width, height, TL, BR; // last two are viewport

  if(div.getAttribute('data-jgostyle'))
    style = eval(div.getAttribute('data-jgostyle'));
  else
    style = JGO.BOARD.medium;

  if(div.getAttribute('data-jgosize')) {
    var size = div.getAttribute('data-jgosize');

    if(size.indexOf('x') != -1) {
      width = parseInt(size.substring(0, size.indexOf('x')));
      height = parseInt(size.substr(size.indexOf('x')+1));
    } else width = height = parseInt(size);
  }

  //if(div.getAttribute('data-jgosgf'))

  var data = parseMarkup(div.innerHTML);
  div.innerHTML = '';

  if(!width) { // Size still missing
    if(!data.length) return; // no size or data, no board

    height = data.length;
    width = data[0].length;
  }

  var jboard = new JGO.Board(width, height);
  var jsetup = new JGO.Setup(jboard, style);

  if(div.getAttribute('data-jgoview')) {
    var tup = div.getAttribute('data-jgoview').split('-');
    TL = jboard.getCoordinate(tup[0]);
    BR = jboard.getCoordinate(tup[1]);
  } else {
    TL = new JGO.Coordinate(0,0);
    BR = new JGO.Coordinate(width-1, height-1);
  }

  jsetup.view(TL.i, TL.j, width-TL.i, height-TL.j);

  var c = new JGO.Coordinate();

  for(c.j = TL.j; c.j <= BR.j; ++c.j) {
    for(c.i = TL.i; c.i <= BR.i; ++c.i) {
      var elem = data[c.j - TL.j][c.i - TL.i];
      jboard.setType(c, elem.type);
      if(elem.mark) jboard.setMark(c, elem.mark);
    }
  }

  jsetup.create(div);
}

/**
 * Find all div elements with class 'jgoboard' and initialize them.
 */
exports.init = function(document) {
  var matches = document.querySelectorAll("div.jgoboard");

  for(var i = 0, len = matches.length; i < len; ++i)
    process(matches[i]);
}

},{"superagent":15}],2:[function(require,module,exports){
'use strict';

var Coordinate = require('./coordinate');
var C = require('./constants');
var util = require('./util');

/**
 * Go board class for storing intersection states. Also has listeners that
 * are notified on any changes to the board via setType() and setMark().
 *
 * @param {int} width The width of the board
 * @param {int} [height] The height of the board
 * @constructor
 */
var Board = function(width, height) {
  this.width = width;

  if(height !== undefined)
    this.height = height;
  else { //noinspection JSSuspiciousNameCombination
    this.height = this.width;
  }

  this.listeners = [];

  this.stones = [];
  this.marks = [];

  // Initialize stones and marks
  for(var i=0; i<this.width; ++i) {
    var stoneArr = [], markArr = [];

    for(var j=0; j<this.height; ++j) {
      stoneArr.push(C.CLEAR);
      markArr.push(C.MARK.NONE);
    }

    this.stones.push(stoneArr);
    this.marks.push(markArr);
  }
};

/**
 * Add listener to the board. Listeners are called in the context of board
 * object and passed coordinate, new value and old value as parameters when
 * changes happen.
 *
 * @param {func} typef A type change listener callback.
 * @param {func} markf A mark change listener callback.
 */
Board.prototype.addListener = function(typef, markf) {
  this.listeners.push({type: typef, mark: markf});
};

/**
 * Create coordinate from "J18" type of notation that depend from board size.
 *
 * @param {string} s The coordinate string.
 */
Board.prototype.getCoordinate = function(s) {
  return new Coordinate(C.COORDINATES.indexOf(s.toUpperCase().substr(0,1)),
      this.height - parseInt(s.substr(1)));
};

/**
 * Make a human readable "J18" type string representation of the coordinate.
 *
 * @param {Coordinate} c Coordinate.
 * @returns {string} representation.
 */
Board.prototype.toString = function(c) {
  return C.COORDINATES[c.i] + (this.height-c.j);
};

/**
 * Simple iteration over all coordinates.
 *
 * @param {func} func The iterator method, which is called with the coordinate
 * and intersection object.
 * @param {int} [i1] Column start.
 * @param {int} [j1] Row start.
 * @param {int} [i2] Colunm end.
 * @param {int} [j2] Row end.
 * context of board object and passed coordinate and newVal as parameter.
 */
Board.prototype.each = function(func, i1, j1, i2, j2) {
  var c = new Coordinate();

  if(i1 === undefined) i1 = 0;
  if(j1 === undefined) j1 = 0;
  if(i2 === undefined) i2 = this.width-1;
  if(j2 === undefined) j2 = this.height-1;

  for(c.j=j1; c.j<=j2; c.j++)
    for(c.i=i1; c.i<=i2; c.i++)
      func.call(this, c.copy(),
          this.stones[c.i][c.j], this.marks[c.i][c.j]);
};

/**
 * Clear board.
 */
Board.prototype.clear = function() {
  this.each(function(c) {
    this.setType(c, C.CLEAR);
    this.setMark(c, C.MARK.NONE);
  });
};

/**
 * Set the intersection type at given coordinate(s).
 *
 * @param {Object} c A Coordinate or Array of them.
 * @param {Object} t New type, e.g. CLEAR, BLACK, ...
 */
Board.prototype.setType = function(c, t) {
  if(c instanceof Coordinate) {
    var old = this.stones[c.i][c.j];

    if(old == t) return; // no change

    this.stones[c.i][c.j] = t;

    for(var l=0; l<this.listeners.length; ++l) // notify listeners
      this.listeners[l].type.call(this, c, t, old);
  } else if(c instanceof Array) {
    for(var i=0, len=c.length; i<len; ++i)
      this.setType(c[i], t); // use ourself to avoid duplicate code
  }
};


/**
 * Set the intersection mark at given coordinate(s).
 *
 * @param {Object} c A Coordinate or Array of them.
 * @param {Object} m New mark, e.g. MARK.NONE, MARK.TRIANGLE, ...
 */
Board.prototype.setMark = function(c, m) {
  if(c instanceof Coordinate) {
    var old = this.marks[c.i][c.j];

    if(old == m) return; // no change

    this.marks[c.i][c.j] = m;

    for(var l=0; l<this.listeners.length; ++l) // notify listeners
      this.listeners[l].mark.call(this, c, m, old);
  } else if(c instanceof Array) {
    for(var i=0, len=c.length; i<len; ++i)
      this.setMark(c[i], m); // use ourself to avoid duplicate code
  }
};

/**
 * Get the intersection type(s) at given coordinate(s).
 *
 * @param {Object} c A Coordinate or an Array of them.
 * @returns {Object} Type or array of types.
 */
Board.prototype.getType = function(c) {
  var ret;

  if(c instanceof Coordinate) {
    ret = this.stones[c.i][c.j];
  } else if(c instanceof Array) {
    ret = [];
    for(var i=0, len=c.length; i<len; ++i)
      ret.push(this.stones[c[i].i][c[i].j]);
  }

  return ret;
};

/**
 * Get the intersection mark(s) at given coordinate(s).
 *
 * @param {Object} c A Coordinate or an Array of them.
 * @returns {Object} Mark or array of marks.
 */
Board.prototype.getMark = function(c) {
  var ret;

  if(c instanceof Coordinate) {
    ret = this.marks[c.i][c.j];
  } else if(c instanceof Array) {
    ret = [];
    for(var i=0, len=c.length; i<len; ++i)
      ret.push(this.marks[c[i].i][c[i].j]);
  }

  return ret;
};

/**
 * Get neighboring coordinates on board.
 *
 * @param {Coordinate} c The coordinate
 * @returns {Array} The array of adjacent coordinates of given type (may be an empty array)
 */
Board.prototype.getAdjacent = function(c) {
  var coordinates = [], i = c.i, j = c.j;

  if(i>0)
    coordinates.push(new Coordinate(i-1, j));
  if(i+1<this.width)
    coordinates.push(new Coordinate(i+1, j));
  if(j>0)
    coordinates.push(new Coordinate(i, j-1));
  if(j+1<this.height)
    coordinates.push(new Coordinate(i, j+1));

  return coordinates;
};

/**
 * Filter coordinates based on intersection type.
 *
 * @param {Object} c An array of Coordinates.
 * @param {Object} t A type filter (return only matching type).
 * @returns {Object} Object with attributes 'type' and 'mark', array or false.
 */
Board.prototype.filter = function(c, t) {
  var ret = [];
  for(var i=0, len=c.length; i<len; ++i)
    if(this.stones[c[i].i][c[i].j] == t)
      ret.push(c);
  return ret;
};

/**
 * Check if coordinates contain given type.
 *
 * @param {Object} c An array of Coordinates.
 * @param {Object} t A type filter (return only matching type).
 * @returns {bool} True or false.
 */
Board.prototype.hasType = function(c, t) {
  for(var i=0, len=c.length; i<len; ++i)
    if(this.stones[c[i].i][c[i].j] == t)
      return true;
  return false;
};

/**
 * Search all intersections of similar type, return group and edge coordinates.
 *
 * @param {Coordinate} coord The coordinate from which to start search.
 * @param {int} [overrideType] Treat current coordinate as this type.
 * @returns {Object} Two arrays of coordinates in members 'group' and 'neighbors'.
 */
Board.prototype.getGroup = function(coord, overrideType) {
  var type = overrideType || this.getType(coord), seen = {},
      group = [coord.copy()], neighbors = [],
      queue = this.getAdjacent(coord);

  seen[coord.toString()] = true;

  while(queue.length) {
    var c = queue.shift();

    if(c.toString() in seen)
      continue; // seen already
    else
      seen[c.toString()] = true; // seen now

    if(this.getType(c) == type) { // check if type is correct
      group.push(c);
      queue = queue.concat(this.getAdjacent(c)); // add prospects
    } else
      neighbors.push(c);
  }

  return {group: group, neighbors: neighbors};
};

/**
 * Get a raw copy of board contents. Will not include any listeners!
 *
 * @returns {Object} Board contents.
 */
Board.prototype.getRaw = function() {
  return {
    width: this.width,
      height: this.height,
      stones: util.extend({}, this.stones),
      marks: util.extend({}, this.marks)
  };
};

/**
 * Set a raw copy of board contents. Will not change or call any listeners!
 *
 * @param {Object} raw Board contents.
 */
Board.prototype.setRaw = function(raw) {
  this.width = raw.width;
  this.height = raw.height;
  this.stones = raw.stones;
  this.marks = raw.marks;
};

/**
 * Calculate impact of a move on board. Returns a data structure outlining
 * validness of move (success & errorMsg) and possible captures and ko
 * coordinate.
 *
 * @param {Board} jboard Board to play the move on (stays unchanged).
 * @param {Coordinate} coord Coordinate to play or null for pass.
 * @param {int} stone Stone to play - BLACK or WHITE.
 * @param {Coordinate} [ko] Coordinate of previous ko.
 * @returns {Object} Move result data structure.
 */
Board.prototype.playMove = function(coord, stone, ko) {
  var oppType = (stone == C.BLACK ? C.WHITE : C.BLACK),
      captures = [], adjacent;

  if(!coord) // pass
    return { success: true, captures: [], ko: false };

  if(this.getType(coord) != C.CLEAR)
    return { success: false,
      errorMsg: 'Cannot play on existing stone!' };

  if(ko && coord.equals(ko))
    return { success: false,
      errorMsg: 'Cannot retake ko immediately!' };

  adjacent = this.getAdjacent(coord); // find adjacent coordinates

  for(var i=0; i<adjacent.length; i++) {
    var c = adjacent[i];

    if(this.getType(c) == oppType) { // potential capture
      var g = this.getGroup(c);

      if(this.filter(g.neighbors, C.CLEAR).length == 1)
        captures = captures.concat(g.group);
    }
  }

  // Suicide not allowed
  if(captures.length === 0 &&
      !this.hasType(this.getGroup(coord, stone).neighbors, C.CLEAR))
    return { success: false,
      errorMsg: 'Suicide is not allowed!' };

  // Check for ko. Note that captures were not removed so there should
  // be zero liberties around this stone in case of a ko.
  if(captures.length == 1 && this.filter(adjacent, C.CLEAR).length == 0)
    return { success: true, captures: captures, ko: captures[0].copy() };

  return { success: true, captures: captures, ko: false };
};

module.exports = Board;

},{"./constants":4,"./coordinate":5,"./util":13}],3:[function(require,module,exports){
'use strict';

var C = require('./constants');
var Coordinate = require('./coordinate');
var util = require('./util');

/**
 * Create a jGoBoard canvas object.
 *
 * @param {Object} elem Container HTML element or its id.
 * @param {Object} opt Options object.
 * @param {Stones} stones Stone and marker drawing facility.
 * @param {Image} boardTexture Board texture or false if none.
 * @constructor
 */
var Canvas = function(elem, opt, stones, boardTexture) {
  /* global document */
  if(typeof elem === 'string')
    elem = document.getElementById(elem);

  var canvas = document.createElement('canvas'),
      self = this, i, j;

  var padLeft = opt.edge.left ? opt.padding.normal : opt.padding.clipped,
      padRight = opt.edge.right ? opt.padding.normal : opt.padding.clipped,
      padTop = opt.edge.top ? opt.padding.normal : opt.padding.clipped,
      padBottom = opt.edge.bottom ? opt.padding.normal : opt.padding.clipped;

  this.marginLeft = opt.edge.left ? opt.margin.normal : opt.margin.clipped;
  this.marginRight = opt.edge.right ? opt.margin.normal : opt.margin.clipped;
  this.marginTop = opt.edge.top ? opt.margin.normal : opt.margin.clipped;
  this.marginBottom = opt.edge.bottom ? opt.margin.normal : opt.margin.clipped;

  this.boardWidth = padLeft + padRight +
    opt.grid.x * opt.view.width;
  this.boardHeight = padTop + padBottom +
    opt.grid.y * opt.view.height;

  this.width = canvas.width =
    this.marginLeft + this.marginRight + this.boardWidth;
  this.height = canvas.height =
    this.marginTop + this.marginBottom + this.boardHeight;

  this.listeners = {'click': [], 'mousemove': [], 'mouseout': []};

  /**
   * Get board coordinate based on screen coordinates.
   * @param {number} x Coordinate.
   * @param {number} y Coordinate.
   * @returns {Coordinate} Board coordinate.
   */
  this.getCoordinate = function(pageX, pageY) {
    var bounds = canvas.getBoundingClientRect(),
        scaledX = (pageX - bounds.left) * canvas.width / (bounds.right - bounds.left),
        scaledY = (pageY - bounds.top) * canvas.height / (bounds.bottom - bounds.top);

    return new Coordinate(
        Math.floor((scaledX-self.marginLeft-padLeft)/opt.grid.x) + opt.view.xOffset,
        Math.floor((scaledY-self.marginTop-padTop)/opt.grid.y) + opt.view.yOffset);
  };

  // Click handler will call all listeners passing the coordinate of click
  // and the click event
  canvas.onclick = function(ev) {
    var c = self.getCoordinate(ev.clientX, ev.clientY),
        listeners = self.listeners.click;

    for(var l=0; l<listeners.length; l++)
      listeners[l].call(self, c.copy(), ev);
  };

  var lastMove = new Coordinate(-1,-1);

  // Move handler will call all listeners passing the coordinate of move
  // whenever mouse moves over a new intersection
  canvas.onmousemove = function(ev) {
    if(!self.listeners.mousemove.length) return;

    var c = self.getCoordinate(ev.clientX, ev.clientY),
        listeners = self.listeners.mousemove;

    if(c.i < self.opt.view.xOffset ||
        c.i >= self.opt.view.xOffset + self.opt.view.width)
      c.i = -1;

    if(c.j < self.opt.view.yOffset ||
        c.j >= self.opt.view.yOffset + self.opt.view.height)
      c.j = -1;

    if(lastMove.equals(c))
      return; // no change
    else
      lastMove = c.copy();

    for(var l=0; l<listeners.length; l++)
      listeners[l].call(self, c.copy(), ev);
  };

  // Mouseout handler will again call all listeners of that event, no
  // coordinates will be passed of course, only the event
  canvas.onmouseout = function(ev) {
    var listeners = self.listeners.mouseout;

    for(var l=0; l<listeners.length; l++)
      listeners[l].call(self, ev);
  };

  elem.appendChild(canvas);

  this.ctx = canvas.getContext('2d');
  this.opt = util.extend({}, opt); // make a copy just in case
  this.stones = stones;
  this.boardTexture = boardTexture;

  // Fill margin with correct color
  this.ctx.fillStyle = opt.margin.color;
  this.ctx.fillRect(0, 0, canvas.width, canvas.height);

  if(this.boardTexture) {
    // Prepare to draw board with shadow
    this.ctx.save();
    this.ctx.shadowColor = opt.boardShadow.color;
    this.ctx.shadowBlur = opt.boardShadow.blur;
    this.ctx.shadowOffsetX = opt.boardShadow.offX;
    this.ctx.shadowOffsetX = opt.boardShadow.offY;

    var clipTop = opt.edge.top ? 0 : this.marginTop,
        clipLeft = opt.edge.left ? 0 : this.marginLeft,
        clipBottom = opt.edge.bottom ? 0 : this.marginBottom,
        clipRight = opt.edge.right ? 0 : this.marginRight;

    // Set clipping to throw shadow only on actual edges
    this.ctx.beginPath();
    this.ctx.rect(clipLeft, clipTop,
        canvas.width - clipLeft - clipRight,
        canvas.height - clipTop - clipBottom);
    this.ctx.clip();

    this.ctx.drawImage(this.boardTexture, 0, 0,
        this.boardWidth, this.boardHeight,
        this.marginLeft, this.marginTop,
        this.boardWidth, this.boardHeight);

    // Draw lighter border around the board to make it more photography
    this.ctx.strokeStyle = opt.border.color;
    this.ctx.lineWidth = opt.border.lineWidth;
    this.ctx.beginPath();
    this.ctx.rect(this.marginLeft, this.marginTop,
        this.boardWidth, this.boardHeight);
    this.ctx.stroke();

    this.ctx.restore(); // forget shadow and clipping
  }

  // Top left center of grid (not edge, center!)
  this.gridTop = this.marginTop + padTop + opt.grid.y / 2;
  this.gridLeft = this.marginLeft + padLeft + opt.grid.x / 2;

  this.ctx.strokeStyle = opt.grid.color;

  var smt = this.opt.grid.smooth; // with 0.5 there will be full antialias

  // Draw vertical gridlines
  for(i=0; i<opt.view.width; i++) {
    if((i === 0 && opt.edge.left) || (i+1 == opt.view.width && opt.edge.right))
      this.ctx.lineWidth = opt.grid.borderWidth;
    else
      this.ctx.lineWidth = opt.grid.lineWidth;

    this.ctx.beginPath();

    this.ctx.moveTo(smt + this.gridLeft + opt.grid.x * i,
        smt + this.gridTop - (opt.edge.top ? 0 : opt.grid.y / 2 + padTop/2));
    this.ctx.lineTo(smt + this.gridLeft + opt.grid.x * i,
        smt + this.gridTop + opt.grid.y * (opt.view.height - 1) +
        (opt.edge.bottom ? 0 : opt.grid.y / 2 + padBottom/2));
    this.ctx.stroke();
  }

  // Draw horizontal gridlines
  for(i=0; i<opt.view.height; i++) {
    if((i === 0 && opt.edge.top) || (i+1 == opt.view.height && opt.edge.bottom))
      this.ctx.lineWidth = opt.grid.borderWidth;
    else
      this.ctx.lineWidth = opt.grid.lineWidth;

    this.ctx.beginPath();

    this.ctx.moveTo(smt + this.gridLeft - (opt.edge.left ? 0 : opt.grid.x / 2 + padLeft/2),
        smt + this.gridTop + opt.grid.y * i);
    this.ctx.lineTo(smt + this.gridLeft + opt.grid.x * (opt.view.width - 1) +
        (opt.edge.right ? 0 : opt.grid.x / 2 + padRight/2),
        smt + this.gridTop + opt.grid.y * i);
    this.ctx.stroke();
  }

  if(opt.stars.points) { // If star points
    var step = (opt.board.width - 1) / 2 - opt.stars.offset;
    // 1, 4, 5, 8 and 9 points are supported, rest will result in randomness
    for(j=0; j<3; j++) {
      for(i=0; i<3; i++) {
        if(j == 1 && i == 1) { // center
          if(opt.stars.points % 2 === 0)
            continue; // skip center
        } else if(i == 1 || j == 1) { // non-corners
          if(opt.stars.points < 8)
            continue; // skip non-corners
        } else { // corners
          if(opt.stars.points < 4)
            continue; // skip corners
        }

        var x = (opt.stars.offset + i * step) - opt.view.xOffset,
            y = (opt.stars.offset + j * step) - opt.view.yOffset;

        if(x < 0 || y < 0 || x >= opt.view.width || y >= opt.view.height)
          continue; // invisible

        this.ctx.beginPath();
        this.ctx.arc(smt + this.gridLeft + x * opt.grid.x,
            smt + this.gridTop + y * opt.grid.y,
            opt.stars.radius, 2*Math.PI, false);
        this.ctx.fillStyle = opt.grid.color;
        this.ctx.fill();
      }
    }
  }

  this.ctx.font = opt.coordinates.font;
  this.ctx.fillStyle = opt.coordinates.color;
  this.ctx.textAlign = 'center';
  this.ctx.textBaseline = 'middle';

  // Draw horizontal coordinates
  for(i=0; i<opt.view.width; i++) {
    if(opt.coordinates && opt.coordinates.top)
      this.ctx.fillText(C.COORDINATES[i + opt.view.xOffset],
          this.gridLeft + opt.grid.x * i,
          this.marginTop / 2);
    if(opt.coordinates && opt.coordinates.bottom)
      this.ctx.fillText(C.COORDINATES[i + opt.view.xOffset],
          this.gridLeft + opt.grid.x * i,
          canvas.height - this.marginBottom / 2);
  }

  // Draw vertical coordinates
  for(i=0; i<opt.view.height; i++) {
    if(opt.coordinates && opt.coordinates.left)
      this.ctx.fillText(''+(opt.board.height-opt.view.yOffset-i),
          this.marginLeft / 2,
          this.gridTop + opt.grid.y * i);
    if(opt.coordinates && opt.coordinates.right)
      this.ctx.fillText(''+(opt.board.height-opt.view.yOffset-i),
          canvas.width - this.marginRight / 2,
          this.gridTop + opt.grid.y * i);
  }

  // Store rendered board in another canvas for fast redraw
  this.backup = document.createElement('canvas');
  this.backup.width = canvas.width;
  this.backup.height = canvas.height;
  this.backup.getContext('2d').drawImage(canvas,
      0, 0, canvas.width, canvas.height,
      0, 0, canvas.width, canvas.height);

  this.restore = function(x, y, w, h) {
    x = Math.floor(x);
    y = Math.floor(y);
    this.ctx.drawImage(this.backup, x, y, w, h, x, y, w, h);
  };

  // Clip further drawing to board only
  this.ctx.beginPath();
  this.ctx.rect(this.marginLeft, this.marginTop, this.boardWidth, this.boardHeight);
  this.ctx.clip();
};

/**
 * Get X coordinate based on column.
 * @returns {number} Coordinate.
 */
Canvas.prototype.getX = function(i) {
  return this.gridLeft + this.opt.grid.x * i;
};

/**
 * Get Y coordinate based on row.
 * @returns {number} Coordinate.
 */
Canvas.prototype.getY = function(j) {
  return this.gridTop + this.opt.grid.y * j;
};

/**
 * Redraw canvas portion using a board.
 *
 * @param {Board} jboard Board object.
 * @param {number} i1 Starting column to be redrawn.
 * @param {number} j1 Starting row to be redrawn.
 * @param {number} i2 Ending column to be redrawn (inclusive).
 * @param {number} j2 Ending row to be redrawn (inclusive).
 */
Canvas.prototype.draw = function(jboard, i1, j1, i2, j2) {
  var self = this;
  i1 = Math.max(i1, this.opt.view.xOffset);
  j1 = Math.max(j1, this.opt.view.yOffset);
  i2 = Math.min(i2, this.opt.view.xOffset + this.opt.view.width - 1);
  j2 = Math.min(j2, this.opt.view.yOffset + this.opt.view.height - 1);

  if(i2 < i1 || j2 < j1)
    return; // nothing to do here

  var x = this.getX(i1 - this.opt.view.xOffset) - this.opt.grid.x,
      y = this.getY(j1 - this.opt.view.yOffset) - this.opt.grid.y,
      w = this.opt.grid.x * (i2 - i1 + 2),
      h = this.opt.grid.y * (j2 - j1 + 2);

  this.ctx.save();

  this.ctx.beginPath();
  this.ctx.rect(x, y, w, h);
  this.ctx.clip(); // only apply redraw to relevant area
  this.restore(x, y, w, h); // restore background

  // Expand redrawn intersections while keeping within viewport
  i1 = Math.max(i1-1, this.opt.view.xOffset);
  j1 = Math.max(j1-1, this.opt.view.yOffset);
  i2 = Math.min(i2+1, this.opt.view.xOffset + this.opt.view.width - 1);
  j2 = Math.min(j2+1, this.opt.view.yOffset + this.opt.view.height - 1);

  var isLabel = /^[a-zA-Z1-9]/;

  // Stone radius derived marker size parameters
  var stoneR = this.opt.stone.radius,
      clearW = stoneR * 1.5, clearH = stoneR * 1.2, clearFunc;

  // Clear grid for labels on clear intersections before casting shadows
  if(this.boardTexture) { // there is a board texture
    clearFunc = function(ox, oy) {
      self.ctx.drawImage(self.boardTexture,
          ox - self.marginLeft - clearW / 2, oy - self.marginTop - clearH / 2, clearW, clearH,
          ox - clearW / 2, oy - clearH / 2, clearW, clearH);
    };
  } else { // no board texture
    this.ctx.fillStyle = this.opt.margin.color;
    clearFunc = function(ox, oy) {
      self.ctx.fillRect(ox - clearW / 2, oy - clearH / 2, clearW, clearH);
    };
  }

  jboard.each(function(c, type, mark) {
    // Note: Use of smt has been disabled here for clear results
    var ox = self.getX(c.i - self.opt.view.xOffset);
    var oy = self.getY(c.j - self.opt.view.yOffset);

    if(type == C.CLEAR && mark && isLabel.test(mark))
    clearFunc(ox, oy);
  }, i1, j1, i2, j2); // provide iteration limits

  // Shadows
  if(this.stones.drawShadow !== false) {
    jboard.each(function(c, type) {
      var ox = self.getX(c.i - self.opt.view.xOffset);
      var oy = self.getY(c.j - self.opt.view.yOffset);

      if(type == C.BLACK || type == C.WHITE) {
        self.stones.drawShadow(self.ctx,
          self.opt.shadow.xOff + ox,
          self.opt.shadow.yOff + oy);
      }
    }, i1, j1, i2, j2); // provide iteration limits
  }

  // Stones and marks
  jboard.each(function(c, type, mark) {
    var ox = (self.getX(c.i - self.opt.view.xOffset));
    var oy = (self.getY(c.j - self.opt.view.yOffset));
    var markColor;

    switch(type) {
      case C.BLACK:
      case C.DIM_BLACK:
        self.ctx.globalAlpha = type == C.BLACK ? 1 : self.opt.stone.dimAlpha;
        self.stones.drawStone(self.ctx, C.BLACK, ox, oy);
        markColor = self.opt.mark.blackColor; // if we have marks, this is the color
        break;
      case C.WHITE:
      case C.DIM_WHITE:
        self.ctx.globalAlpha = type == C.WHITE ? 1 : self.opt.stone.dimAlpha;
        self.stones.drawStone(self.ctx, C.WHITE, ox, oy);
        markColor = self.opt.mark.whiteColor; // if we have marks, this is the color
        break;
      default:
        self.ctx.globalAlpha=1;
        markColor = self.opt.mark.clearColor; // if we have marks, this is the color
    }

    // Common settings to all markers
    self.ctx.lineWidth = self.opt.mark.lineWidth;
    self.ctx.strokeStyle = markColor;

    self.ctx.font = self.opt.mark.font;
    self.ctx.fillStyle = markColor;
    self.ctx.textAlign = 'center';
    self.ctx.textBaseline = 'middle';

    if(mark) self.stones.drawMark(self.ctx, mark, ox, oy);
  }, i1, j1, i2, j2); // provide iteration limits

  this.ctx.restore(); // also restores globalAlpha
};

/**
 * Add an event listener to canvas (click) events. The callback will be
 * called with 'this' referring to Canvas object, with coordinate and
 * event as parameters. Supported event types are 'click', 'mousemove',
 * and 'mouseout'. With 'mouseout', there is no coordinate parameter for
 * callback.
 *
 * @param {String} event The event to listen to, e.g. 'click'.
 * @param {function} callback The callback.
 */
Canvas.prototype.addListener = function(event, callback) {
  this.listeners[event].push(callback);
};

module.exports = Canvas;

},{"./constants":4,"./coordinate":5,"./util":13}],4:[function(require,module,exports){
'use strict';

var util = require('./util');

/**
 * Enum for intersection types. Aliased in JGO namespace, e.g. JGO.BLACK.
 * @enum
 * @readonly
 */
exports.INTERSECTION = {
  CLEAR: 0,
  /** Black stone */
  BLACK: 1,
  /** White stone */
  WHITE: 2,
  /** Semi-transparent black stone */
  DIM_BLACK: 3,
  /** Semi-transparent white stone */
  DIM_WHITE: 4
};

// Alias all objects into globals
util.extend(exports, exports.INTERSECTION);

/**
 * Enum for marker types.
 * @readonly
 * @enum
 */
exports.MARK = {
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
  WHITE_TERRITORY: '+'
};

/**
 * Board coordinate array.
 * @constant
 */
exports.COORDINATES = 'ABCDEFGHJKLMNOPQRSTUVWXYZ'.split('');

},{"./util":13}],5:[function(require,module,exports){
'use strict';

var SGFLetters = 'abcdefghijklmnopqrstuvwxyz'.split('');

/**
 * Create a helper class to create coordinates from (1,2) (zero-based),
 * 'ah' type of input. You can create a coordinate with no arguments, in
 * which case it defaults to (0,0), or with one argument, in which case it
 * tries to parse 'ai' type of string coordinate, or with two arguments, (i,j).
 * 'J18' style coordinates depend on board size due to number running from
 * bottom, so those need to be instantiated from Board.getCoordinate.
 *
 * @param {int} [i] Column or SGF-style string.
 * @param {int} [j] Row.
 * @constructor
 */
var Coordinate = function(i, j) {
  if(i !== undefined) {
    if(j !== undefined) {
      this.i = i;
      this.j = j;
    } else { // try to parse coordinates from first parameter
      this.i = 0;
      this.j = 0;

      if(typeof i != 'string')
        return;

      // assume SGF-type coordinate
      i = i.toLowerCase();

      this.i = SGFLetters.indexOf(i.substr(0,1));
      this.j = SGFLetters.indexOf(i.substr(1));
    }
  } else { // called without both parameters
    this.i = 0;
    this.j = 0;
  }
};

/**
 * Compare with another coordinate.
 *
 * @param {Coordinate} Coordinate.
 * @returns {boolean} true if equal, false if not.
 */
Coordinate.prototype.equals = function(c) {
  return (c.i == this.i) && (c.j == this.j);
};

/**
 * Make an SGF-type 'ai' string representation of the coordinate.
 *
 * @returns {string} String representation.
 */
Coordinate.prototype.toString = function() {
  return SGFLetters[this.i] + SGFLetters[this.j];
};

/**
 * Make a copy of this coordinate.
 *
 * @returns {Coordinate} A copy of this coordinate.
 */
Coordinate.prototype.copy = function() {
  return new Coordinate(this.i, this.j);
};

module.exports = Coordinate;

},{}],6:[function(require,module,exports){
'use strict';

var JGO = require('./constants'); // base for JGO object

JGO.Coordinate = require('./coordinate');
JGO.Canvas = require('./canvas');
JGO.Node = require('./node');
JGO.Notifier = require('./notifier');
JGO.Record = require('./record');
JGO.Setup = require('./setup');
JGO.Stones = require('./stones');
JGO.Board = require('./board');
JGO.util = require('./util');
JGO.sgf = require('./sgf');
JGO.auto = require('./auto');

module.exports = JGO;

},{"./auto":1,"./board":2,"./canvas":3,"./constants":4,"./coordinate":5,"./node":7,"./notifier":8,"./record":9,"./setup":10,"./sgf":11,"./stones":12,"./util":13}],7:[function(require,module,exports){
'use strict';

var util = require('./util');
var C = require('./constants');

/**
 * Helper class to store node information, apply and revert changes easily.
 *
 * @param {Board} jboard Board object to make changes on.
 * @param {Node} parent Parent node or null if no parent.
 * @param {Object} info Node information - ko coordinate, comment, etc.
 * @constructor
 */
var Node = function(jboard, parent, info) {
  this.jboard = jboard;
  this.parent = parent;
  this.info = info ? util.extend({}, info) : {};
  this.children = [];
  this.changes = [];

  if(parent) {
    parent.children.push(this); // register child
    this.captures = util.extend({}, parent.captures); // inherit
  } else {
    this.captures = {};
    this.captures[C.WHITE] = this.captures[C.BLACK] = 0;
  }
};

/**
 * Helper method to clear parent node's markers. Created to achieve SGF like
 * stateless marker behavaior.
 */
Node.prototype.clearParentMarks = function() {
  if(!this.parent)
    return;

  for(var i=this.parent.changes.length-1; i>=0; i--) {
    var item = this.parent.changes[i];

    if('mark' in item)
      this.setMark(item.c, C.MARK.NONE);
  }
};

/**
 * Helper method to make changes to a board while saving them in the node.
 *
 * @param {Object} c Coordinate or array of them.
 * @param {int} val Type.
 */
Node.prototype.setType = function(c, val) {
  if(c instanceof Array) {
    for(var i=0, len=c.length; i<len; ++i)
      this.setType(c[i], val); // avoid repeating ourselves
    return;
  }

  // Store both change and previous value to enable reversion
  this.changes.push({c: c.copy(), type: val, old: this.jboard.getType(c)});
  this.jboard.setType(c, val);
};

/**
 * Helper method to make changes to a board while saving them in the node.
 *
 * @param {Object} c Coordinate or array of them.
 * @param {int} val Mark.
 */
Node.prototype.setMark = function(c, val) {
  if(c instanceof Array) {
    for(var i=0, len=c.length; i<len; ++i)
      this.setMark(c[i], val); // avoid repeating ourselves
    return;
  }

  // Store both change and previous value to enable reversion
  this.changes.push({c: c.copy(), mark: val, old: this.jboard.getMark(c)});
  this.jboard.setMark(c, val);
};


/**
 * Apply changes of this node to board.
 */
Node.prototype.apply = function() {
  for(var i=0; i<this.changes.length; i++) {
    var item = this.changes[i];

    if('type' in item)
      this.jboard.setType(item.c, item.type);
    else
      this.jboard.setMark(item.c, item.mark);
  }
};

/**
 * Revert changes of this node to board.
 */
Node.prototype.revert = function() {
  for(var i=this.changes.length-1; i>=0; i--) {
    var item = this.changes[i];

    if('type' in item)
      this.jboard.setType(item.c, item.old);
    else
      this.jboard.setMark(item.c, item.old);
  }
};

module.exports = Node;

},{"./constants":4,"./util":13}],8:[function(require,module,exports){
'use strict';

var util = require('./util');

/**
 * A change notifier class that can listen to changes in a Board and keep
 * multiple Canvas board views up to date.
 *
 * @param {Board} jboard The board to listen to.
 * @constructor
 */
var Notifier = function(jboard) {
  this.updateScheduled = false; // set on first change
  this.canvases = []; // canvases to notify on changes

  var changeFunc = function(coord) {
    if(this.updateScheduled) { // update already scheduled
      this.min.i = Math.min(this.min.i, coord.i);
      this.min.j = Math.min(this.min.j, coord.j);
      this.max.i = Math.max(this.max.i, coord.i);
      this.max.j = Math.max(this.max.j, coord.j);
      return;
    }

    this.min = coord.copy();
    this.max = coord.copy();
    this.updateScheduled = true;

    setTimeout(function() { // schedule update in the end
      for(var c=0; c<this.canvases.length; c++)
        this.canvases[c].draw(jboard, this.min.i, this.min.j,
          this.max.i, this.max.j);

      this.updateScheduled = false; // changes updated, scheduled function run
    }.bind(this), 0);
  }.bind(this);

  jboard.addListener(changeFunc, changeFunc);
};

/**
 * Add a canvas to notify list.
 *
 * @param {Canvas} jcanvas The canvas to add.
 */
Notifier.prototype.addCanvas = function(jcanvas) {
  this.canvases.push(jcanvas);
};

module.exports = Notifier;

},{"./util":13}],9:[function(require,module,exports){
'use strict';

var Board = require('./board');
var Node = require('./node');

/**
 * Create a go game record that can handle plays and variations. A Board
 * object is created that will reflect the current position in game record.
 *
 * @param {int} width Board width.
 * @param {int} height Board height.
 * @constructor
 */
var Record = function(width, height) {
  this.jboard = new Board(width, height ? height : width);
  this.root = this.current = null;
  this.info = {}; // game information
};

/**
 * Get current node.
 *
 * @returns {Node} Current node.
 */
Record.prototype.getCurrentNode = function() {
  return this.current;
};


/**
 * Get root node.
 *
 * @returns {Node} Root node.
 */
Record.prototype.getRootNode = function() {
  return this.root;
};

/**
 * Create new empty node under current one.
 *
 * @param {bool} clearParentMarks True to clear parent node marks.
 * @param {Object} info Node information - ko coordinate, comment, etc.
 * @returns {Node} New, current node.
 */
Record.prototype.createNode = function(clearParentMarks, options) {
  var node = new Node(this.jboard, this.current, options);

  if(clearParentMarks)
    node.clearParentMarks();

  if(this.root === null)
    this.root = node;

  return (this.current = node);
};

/**
 * Advance to the next node in the game tree.
 *
 * @param {int} [variation] parameter to specify which variation to select, if there are several branches.
 * @returns {Node} New current node or null if at the end of game tree.
 */
Record.prototype.next = function(variation) {
  if(this.current === null)
    return null;

  if(!variation)
    variation = 0;

  if(variation >= this.current.children.length)
    return null;

  this.current = this.current.children[variation];
  this.current.apply(this.jboard);

  return this.current;
};

/**
 * Back up a node in the game tree.
 *
 * @returns {Node} New current node or null if at the beginning of game tree.
 */
Record.prototype.previous = function() {
  if(this.current === null || this.current.parent === null)
    return null; // empty or no parent

  this.current.revert(this.jboard);
  this.current = this.current.parent;

  return this.current;
};

/**
 * Get current variation number (zero-based).
 *
 * @returns {int} Current variations.
 */
Record.prototype.getVariation = function() {
  if(this.current === null || this.current.parent === null)
    return 0;
  return this.current.parent.children.indexOf(this.current);
};

/**
 * Go to a variation. Uses previous() and next().
 *
 * @param {int} [variation] parameter to specify which variation to select, if there are several branches.
 */
Record.prototype.setVariation = function(variation) {
  if(this.previous() === null)
    return null;
  return this.next(variation);
};

/**
 * Get number of variations for current node.
 *
 * @returns {int} Number of variations.
 */
Record.prototype.getVariations = function() {
  if(this.current === null || this.current.parent === null)
    return 1;

  return this.current.parent.children.length; // "nice"
};

/**
 * Go to the beginning of the game tree.
 *
 * @returns {Node} New current node.
 */
Record.prototype.first = function() {
  this.current = this.root;
  this.jboard.clear();

  if(this.current !== null)
    this.current.apply(this.jboard);

  return this.current;
};

/**
 * Create a snapshot of current Record state. Will contain board state and
 * current node.
 *
 * @returns Snapshot to be used with restoreSnapshot().
 */
Record.prototype.createSnapshot = function() {
  return {jboard: this.jboard.getRaw(), current: this.current};
};

/**
 * Restore the Record to the state contained in snapshot. Use only if you
 * REALLY * know what you are doing, this is mainly for creating Record
 * quickly from SGF.
 *
 * @param {Object} Snapshot created with createSnapshot().
 */
Record.prototype.restoreSnapshot = function(raw) {
  this.jboard.setRaw(raw.jboard);
  this.current = raw.current;
};

module.exports = Record;

},{"./board":2,"./node":7}],10:[function(require,module,exports){
'use strict';

var Notifier = require('./notifier');
var Canvas = require('./canvas');
var Stones = require('./stones');
var util = require('./util');

/**
 * Setup helper class to make creating Canvases easy.
 *
 * @param {Board} jboard Board object to listen to.
 * @param {Object} boardOptions Base board options like BOARD.large.
 * @constructor
 */
var Setup = function(board, boardOptions) {
  var defaults = {
    margin: {color:'white'},
    edge: {top:true, bottom:true, left:true, right:true},
    coordinates: {top:true, bottom:true, left:true, right:true},
    stars: {points: 0 },
    board: {width:board.width, height:board.height},
    view: {xOffset:0, yOffset:0, width:board.width, height:board.height}
  };

  if(board.width == board.height) {
    switch(board.width) { // square
      case 9:
        defaults.stars.points=5;
        defaults.stars.offset=2;
        break;
      case 13:
      case 19:
        defaults.stars.points=9;
        defaults.stars.offset=3;
        break;
    }
  }

  this.board = board; // board to follow
  this.options = util.extend(defaults, boardOptions); // clone
};

/**
 * View only a portion of the whole board.
 *
 * @param {int} xOff The X offset.
 * @param {int} yOff The Y offset.
 * @param {int} width The width.
 * @param {int} height The height.
 */
Setup.prototype.view = function(xOff, yOff, width, height) {
  this.options.view.xOffset = xOff;
  this.options.view.yOffset = yOff;
  this.options.view.width = width;
  this.options.view.height = height;

  this.options.edge.left = (xOff === 0);
  this.options.edge.right = (xOff+width == this.options.board.width);

  this.options.edge.top = (yOff === 0);
  this.options.edge.bottom = (yOff+height == this.options.board.height);
};

/**
 * Replace default options (non-viewport related)
 *
 * @param {Object} options The new options.
 */
Setup.prototype.setOptions = function(options) {
  util.extend(this.options, options);
};

/**
 * Create Canvas based on current settings. When textures are used,
 * image resources need to be loaded, so the function returns and
 * asynchronously call readyFn after actual initialization.
 *
 * @param {Object} elemId The element id or HTML Node where to create the canvas in.
 * @param {function} readyFn Function to call with canvas once it is ready.
 */
Setup.prototype.create = function(elemId, readyFn) {
  var options = util.extend({}, this.options); // create a copy

  var createCallback = function(images) {
    var jcanvas = new Canvas(elemId, options,
        new Stones(images, options), images.board);
    jcanvas.draw(this.board, 0, 0, this.board.width-1, this.board.height-1);

    // Track and group later changes with Notifier
    var notifier = new Notifier(this.board);
    notifier.addCanvas(jcanvas);

    if(readyFn) readyFn(jcanvas);
  }.bind(this);

  if(this.options.textures) // at least some textures exist
    util.loadImages(this.options.textures, createCallback);
  else // blain BW board
    createCallback({black:false,white:false,shadow:false,board:false});
};

module.exports = Setup;

},{"./canvas":3,"./notifier":8,"./stones":12,"./util":13}],11:[function(require,module,exports){
'use strict';

/**
 * SGF loading module.
 * @module sgf
 */

var Coordinate = require('./coordinate');
var Record = require('./record');
var C = require('./constants');

var ERROR; // error holder for sgfParse etc.

var fieldMap = {
  'AN': 'annotator',
  'CP': 'copyright',
  'DT': 'date',
  'EV': 'event',
  'GN': 'gameName',
  'OT': 'overtime',
  'RO': 'round',
  'RE': 'result',
  'RU': 'rules',
  'SO': 'source',
  'TM': 'time',
  'PC': 'location',
  'PB': 'black',
  'PW': 'white',
  'BR': 'blackRank',
  'WR': 'whiteRank',
  'BT': 'blackTeam',
  'WT': 'whiteTeam'
};

/*
 * Helper function to handle single coordinates as well as coordinate lists.
 *
 * @param {object} propValues A property value array containing a mix of coordinates (aa) and lists (aa:bb)
 * @returns {array} An array of Coordinate objects matching the given property values.
 */
function explodeSGFList(propValues) {
  var coords = [];

  for(var i=0, len=propValues.length; i<len; i++) {
    var val = propValues[i];

    if(val.indexOf(':') == -1) { // single coordinate
      coords.push(new Coordinate(val));
    } else {
      var tuple = val.split(':'), c1, c2, coord;

      c1 = new Coordinate(tuple[0]);
      c2 = new Coordinate(tuple[1]);
      coord = new Coordinate();

      for(coord.i=c1.i; coord.i<=c2.i; ++coord.i)
        for(coord.j=c1.j; coord.j<=c2.j; ++coord.j)
          coords.push(coord.copy());
    }
  }

  return coords;
}

function sgfMove(node, name, values, moveMarks) {
  var coord, player, opponent, play;

  if(name == 'B') {
    player = C.BLACK;
    opponent = C.WHITE;
  } else if('W') {
    player = C.WHITE;
    opponent = C.BLACK;
  }

  coord = (values[0].length == 2) ? new Coordinate(values[0]) : null;

  play = node.jboard.playMove(coord, player);

  if(moveMarks && play.ko)
      node.setMark(play.ko, C.MARK.SQUARE);

  if(play.success && coord !== null) {
    node.setType(coord, player); // play stone
    node.setType(play.captures, C.CLEAR); // clear opponent's stones
    if(moveMarks)
      node.setMark(coord, C.MARK.CIRCLE);
  } else ERROR = play.error;

  return play.success;
}

function sgfSetup(node, name, values, moveMarks) {
  var setupMap = {'AB': C.BLACK, 'AW': C.WHITE, 'AE': C.CLEAR};

  node.setType(explodeSGFList(values), setupMap[name]);
  return true;
}

function sgfMarker(node, name, values, moveMarks) {
  var markerMap = {
    'TW': ',',
    'TB': '.',
    'CR': '0',
    'TR': '/',
    'MA': '*',
    'SQ': '#'
  };

  node.setMark(explodeSGFList(values), markerMap[name]);
  return true;
}

function sgfComment(node, name, values, moveMarks) {
  node.comment = values[0];
  return true;
}

function sgfHandicap(node, name, values, moveMarks) {
  node.info.handicap = values[0];
  return true;
}

function sgfLabel(node, name, values, moveMarks) {
  for(var i=0; i<values.length; i++) {
    var v = values[i], tuple = v.split(':');

    node.setMark(new Coordinate(tuple[0]), tuple[1]);
  }
  return true;
}

function sgfInfo(node, name, values, moveMarks) {
  var field = fieldMap[name];

  node.info[field] = values[0];
  return true;
}

var SGFProperties = {
  'B': sgfMove,
  'W': sgfMove,
  'AB': sgfSetup,
  'AW': sgfSetup,
  'AE': sgfSetup,
  'C': sgfComment,
  'LB': sgfLabel,
  'HA': sgfHandicap,
  'TW': sgfMarker,
  'TB': sgfMarker,
  'CR': sgfMarker,
  'TR': sgfMarker,
  'MA': sgfMarker,
  'SQ': sgfMarker,
  'AN': sgfInfo,
  'CP': sgfInfo,
  'DT': sgfInfo,
  'EV': sgfInfo,
  'GN': sgfInfo,
  'OT': sgfInfo,
  'RO': sgfInfo,
  'RE': sgfInfo,
  'RU': sgfInfo,
  'SO': sgfInfo,
  'TM': sgfInfo,
  'PC': sgfInfo,
  'PB': sgfInfo,
  'PW': sgfInfo,
  'BR': sgfInfo,
  'WR': sgfInfo,
  'BT': sgfInfo,
  'WT': sgfInfo
};

/*
 * Parse SGF string into object tree representation:
 *
 * tree = { sequence: [ <node(s)> ], leaves: [ <subtree(s), if any> ] }
 *
 * Each node is an object containing property identifiers and associated values in array:
 *
 * node = {'B': ['nn'], 'C': ['This is a comment']}
 *
 * @param {String} sgf The SGF in string format, whitespace allowed.
 * @returns {Object} Root node or false on error. Error stored to ERROR variable.
 */
function parseSGF(sgf) {
  var tokens, i, len, token, // for loop vars
      lastBackslash = false, // flag to note if last string ended in escape
      bracketOpen = -1, // the index where bracket opened
      processed = [];

  if('a~b'.split(/(~)/).length === 3) {
    tokens = sgf.split(/([\[\]\(\);])/); // split into an array at '[', ']', '(', ')', and ';', and include separators in array
  } else { // Thank you IE for not working
    var blockStart = 0, delimiters = '[]();';

    tokens = [];

    for(i=0, len=sgf.length; i<len; ++i) {
      if(delimiters.indexOf(sgf.charAt(i)) !== -1) {
        if(blockStart < i)
          tokens.push(sgf.substring(blockStart, i));
        tokens.push(sgf.charAt(i));
        blockStart = i+1;
      }
    }

    if(blockStart < i) // leftovers
      tokens.push(sgf.substr(blockStart, i));
  }

  // process through tokens and push everything into processed, but merge stuff between square brackets into one element, unescaping escaped brackets
  // i.e. ['(', ';', 'C', '[', 'this is a comment containing brackets ', '[', '\\', ']', ']'] becomes:
  // ['(', ';', 'C', '[', 'this is a comment containing brackets []]']
  // after this transformation, it's just '(', ')', ';', 'ID', and '[bracket stuff]' elements in the processed array
  for(i=0, len=tokens.length; i<len; ++i) {
    token = tokens[i];

    if(bracketOpen == -1) { // handling elements outside property values (i.e. square brackets)
      token = token.replace(/^\s+|\s+$/g, ''); // trim whitespace, it is irrelevant here
      if(token == '[') // found one
        bracketOpen = i;
      else if(token !== '') // we are outside brackets, so just push everything nonempty as it is into 'processed'
        processed.push(token);
    } else { // bracket is open, we're now looking for a ] without preceding \
      if(token != ']') { // a text segment
        lastBackslash = (token.charAt(token.length-1) == '\\'); // true if string ends in \
      } else { // a closing bracket
        if(lastBackslash) { // it's escaped - we continue
          lastBackslash = false;
        } else { // it's not escaped - we close the segment
          processed.push(tokens.slice(bracketOpen, i+1).join('').replace(/\\\]/g, ']')); // push the whole thing including brackets, and unescape the inside closing brackets
          bracketOpen = -1;
        }
      }
    }
  }

  // basic error checking
  if(processed.length === 0) {
    ERROR = 'SGF was empty!';
    return false;
  } else if(processed[0] != '(' || processed[1] != ';' || processed[processed.length-1] != ')') {
    ERROR = 'SGF did not start with \'(;\' or end with \')\'!';
    return false;
  }

  // collect 'XY', '[AB]', '[CD]' sequences (properties) in a node into {'XY': ['AB', 'CD']} type of associative array
  // effectively parsing '(;GM[1]FF[4];B[pd])' into ['(', {'GM': ['1'], 'FF': ['4']}, {'B': ['pd']}, ')']

  // start again with 'tokens' and process into 'processed'
  tokens = processed;
  processed = [];

  var node, propertyId = ''; // node under construction, and current property identifier

  // the following code is not strict on format, so let's hope it's well formed
  for(i=0, len=tokens.length; i<len; ++i) {
    token = tokens[i];

    if(token == '(' || token == ')') {
      if(node) { // flush and reset node if necessary
        if(propertyId !== '' && node[propertyId].length === 0) { // last property was missing value
          ERROR = 'Missing property value at ' + token + '!';
          return false;
        }
        processed.push(node);
        node = undefined;
      }

      processed.push(token); // push this token also
    } else if(token == ';') { // new node
      if(node) { // flush if necessary
        if(propertyId !== '' && node[propertyId].length === 0) { // last property was missing value
          ERROR = 'Missing property value at ' + token + '!';
          return false;
        }
        processed.push(node);
      }

      node = {};
      propertyId = ''; // initialize the new node
    } else { // it's either a property identifier or a property value
      if(token.indexOf('[') !== 0) { // it's property identifier
        if(propertyId !== '' && node[propertyId].length === 0) { // last property was missing value
          ERROR = 'Missing property value at ' + token + '!';
          return false;
        }

        if(token in node) { // duplicate key
          ERROR = 'Duplicate property identifier ' + token + '!';
          return false;
        }

        propertyId = token;
        node[propertyId] = []; // initialize new property with empty value array
      } else { // it's property value
        if(propertyId === '') { // we're missing the identifier
          ERROR = 'Missing property identifier at ' + token + '!';
          return false;
        }

        node[propertyId].push(token.substring(1, token.length-1)); // remove enclosing brackets
      }
    }
  }

  tokens = processed;

  // finally, construct a game tree from '(', ')', and sequence arrays - each leaf is {sequence: [ <list of nodes> ], leaves: [ <list of leaves> ]}
  var stack = [], currentRoot = {sequence: [], leaves: []}, lastRoot; // we know first element already: '('

  for(i=1, len=tokens.length; i<len-1; ++i) {
    token = tokens[i];

    if(token == '(') { // enter a subleaf
      if(currentRoot.sequence.length === 0) { // consecutive parenthesis without node sequence in between will throw an error
        ERROR = 'SGF contains a game tree without a sequence!';
        return false;
      }
      stack.push(currentRoot); // save current leaf for when we return
      currentRoot = {sequence: [], leaves: []};
    } else if(token == ')') { // return from subleaf
      if(currentRoot.sequence.length === 0) { // consecutive parenthesis without node sequence in between will throw an error
        ERROR = 'SGF contains a game tree without a sequence!';
        return false;
      }
      lastRoot = currentRoot;
      currentRoot = stack.pop();
      currentRoot.leaves.push(lastRoot);
    } else { // if every '(' is not followed by exactly one array of nodes (as it should), this code fails
      currentRoot.sequence.push(token);
    }
  }

  if(stack.length > 0) {
    ERROR = 'Invalid number of parentheses in the SGF!';
    return false;
  }

  return currentRoot;
}

/*
 * Apply SGF nodes recursively to create a game tree.
 * @returns true on success, false on error. Error message in ERROR.
 */
function recurseRecord(jrecord, gameTree, moveMarks) {
  for(var i=0; i<gameTree.sequence.length; i++) {
    var node = gameTree.sequence[i],
      jnode = jrecord.createNode(true); // clear parent marks

    for(var key in node) {
      if(node.hasOwnProperty(key)) {
        if(!(key in SGFProperties))
          continue;

        if(!SGFProperties[key](jnode, key, node[key], moveMarks)) {
          ERROR = 'Error while parsing node ' + key + ': ' + ERROR;
          return false;
        }
      }
    }
  }

  for(i=0; i<gameTree.leaves.length; i++) {
    var subTree = gameTree.leaves[i], snapshot;

    snapshot = jrecord.createSnapshot();

    if(!recurseRecord(jrecord, subTree, moveMarks))
      return false; // fall through on errors

    jrecord.restoreSnapshot(snapshot);
  }

  return true;
}

/*
 * Convert game tree to a record.
 * @returns {Object} Record or false on failure. Error stored in ERROR.
 */
function gameTreeToRecord(gameTree, moveMarks) {
  var jrecord, root = gameTree.sequence[0], width = 19, height = 19;

  if('SZ' in root) {
    var size = root.SZ[0];

    if(size.indexOf(':') != -1) {
      width = parseInt(size.substring(0, size.indexOf(':')));
      height = parseInt(size.substr(size.indexOf(':')+1));
    } else width = height = parseInt(size);
  }

  jrecord = new Record(width, height);

  if(!recurseRecord(jrecord, gameTree, moveMarks))
    return false;

  jrecord.first(); // rewind to start

  return jrecord;
}

/**
 * Parse SGF and return {@link Record} object(s).
 *
 * @param {String} sgf The SGF file as a string.
 * @param {bool} moveMarks Create move and ko marks in the record.
 * @returns {Object} Record object, array of them, or string on error.
 */
exports.load = function(sgf, moveMarks) {
  var gameTree = parseSGF(sgf);

  if(gameTree.sequence.length === 0) { // potentially multiple records
    var ret = [];

    if(gameTree.leaves.length === 0)
      return 'Empty game tree!';

    for(var i=0; i<gameTree.leaves.length; i++) {
      var rec = gameTreeToRecord(gameTree, moveMarks);

      if(!rec)
        return ERROR;

      ret.push(rec); // return each leaf as separate record
    }

    return ret;
  }

  return gameTreeToRecord(gameTree, moveMarks);
}

},{"./constants":4,"./coordinate":5,"./record":9}],12:[function(require,module,exports){
'use strict';

var C = require('./constants');

/**
 * Create a jGoBoard stones object. This is a facility that can draw
 * stones and markers on a HTML5 canvas. Only used internally by the
 * library.
 *
 * @param {Object} img Image array.
 * @constructor
 */
var Stones = function(img, options) {
  var me = this;

  this.stoneR = options.stone.radius;
  this.gridX = options.grid.x;
  this.gridY = options.grid.x;
  this.markX = this.stoneR * 1.1;
  this.markY = this.stoneR * 1.1;
  this.circleR = this.stoneR * 0.5;
  this.triangleR = this.stoneR * 0.9;

  if(img.white && img.black) { // Textures
    this.drawStone = function(ctx, type, ox, oy, scale) {
      var stone = type == C.BLACK ? img.black : img.white;

      if(!scale) scale = 1;
      // round x, y for crisp rendering
      ctx.drawImage(stone, 0, 0, stone.width, stone.height,
          Math.round(ox - stone.width / 2 * scale),
          Math.round(oy - stone.height / 2 * scale),
          stone.width * scale, stone.height * scale);
    };

    if(img.shadow) {
      this.drawShadow = function(ctx, ox, oy, scale) {
        var stone = img.shadow;

        if(scale) {
          ctx.drawImage(stone, 0, 0, stone.width, stone.height,
              Math.round(ox - stone.width / 2 * scale),
              Math.round(oy - stone.height / 2 * scale),
              stone.width * scale, stone.height * scale);
        } else {
          ctx.drawImage(stone,
              Math.round(ox - stone.width / 2),
              Math.round(oy - stone.height / 2));
        }
      };
    } else this.drawShadow = false;
  } else { // Drawings
    this.drawStone = function(ctx, type, ox, oy, scale) {
      if(!scale) scale = 1;
      ctx.fillStyle = (type == C.WHITE) ? '#FFFFFF' : '#000000';
      ctx.beginPath();
      ctx.arc(ox, oy, me.stoneR*scale, 2*Math.PI, false);
      ctx.fill();

      if(type == C.WHITE) {
        ctx.strokeStyle = '#000000';
        ctx.stroke();
      }
    };

    this.drawShadow = false;
  }
};

Stones.prototype.drawMark = function(ctx, mark, ox, oy) {
  switch(mark) {
    case C.MARK.SQUARE:
      ctx.beginPath();
      ctx.rect(ox - this.markX / 2, oy - this.markY / 2, this.markX, this.markY);
      ctx.stroke();
      break;

    case C.MARK.CROSS:
      ctx.beginPath();
      ctx.moveTo(ox - this.markX / 2, oy + this.markY / 2);
      ctx.lineTo(ox + this.markX / 2, oy - this.markY / 2);
      ctx.moveTo(ox - this.markX / 2, oy - this.markY / 2);
      ctx.lineTo(ox + this.markX / 2, oy + this.markY / 2);
      ctx.stroke();
      break;

    case C.MARK.TRIANGLE:
      ctx.beginPath();
      for(var r=0; r<3; r++) {
        ctx.moveTo(ox + this.triangleR * Math.cos(Math.PI * (0.5 + 2*r/3)),
            oy - this.triangleR * Math.sin(Math.PI * (0.5 + 2*r/3)));
        ctx.lineTo(ox + this.triangleR * Math.cos(Math.PI * (0.5 + 2*(r+1)/3)),
            oy - this.triangleR * Math.sin(Math.PI * (0.5 + 2*(r+1)/3)));
      }
      ctx.stroke();
      break;

    case C.MARK.CIRCLE:
      ctx.beginPath();
      ctx.arc(ox, oy, this.circleR, 2*Math.PI, false);
      ctx.stroke();
      break;

    case C.MARK.BLACK_TERRITORY:
      ctx.globalAlpha=1;
      this.drawStone(ctx, C.BLACK, ox, oy, 0.5);
      break;

    case C.MARK.WHITE_TERRITORY:
      ctx.globalAlpha=1;
      this.drawStone(ctx, C.WHITE, ox, oy, 0.5);
      break;

    case C.MARK.SELECTED:
      ctx.globalAlpha=0.5;
      ctx.fillStyle = '#8080FF';
      //ctx.beginPath();
      ctx.fillRect(ox - this.gridX / 2, oy - this.gridY / 2,
          this.gridX, this.gridY);
      break;

    default: // Label
      // For clear intersections, grid is cleared before shadow cast
      ctx.fillText(mark, ox, oy);
      break;
  }
};

module.exports = Stones;

},{"./constants":4}],13:[function(require,module,exports){
'use strict';

/**
 * Utility function module.
 * @module util
 */

var Coordinate = require('./coordinate');

/**
 * Load images and defined by object and invoke callback when completed.
 *
 * @param {Object} sources A dictionary of sources to load.
 * @param {function} callback A callback function to call with image dict.
 */
exports.loadImages = function(sources, callback) {
  var images = {}, imagesLeft = 0;

  for(var src in sources) // count non-false properties as images
    if(sources.hasOwnProperty(src) && sources[src])
      imagesLeft++;

  var countdown = function() {
    if(--imagesLeft <= 0)
      callback(images);
  };

  for(src in sources) { // load non-false properties to images object
    if(sources.hasOwnProperty(src) && sources[src]) {
      /* global Image */
      images[src] = new Image();
      images[src].onload = countdown;
      images[src].src = sources[src];
    }
  }
};

/**
 * Helper function to create coordinates for standard handicap placement.
 *
 * @param {int} size Board size (9, 13, 19 supported).
 * @param {itn} num Number of handicap stones.
 * @returns {Array} Array of Coordinate objects.
 */
exports.getHandicapCoordinates = function(size, num) {
  // Telephone dial style numbering
  var handicapPlaces = [[], [], [3,7], [3,7,9], [1,3,7,9], [1,3,5,7,9],
      [1,3,4,6,7,9], [1,3,4,5,6,7,9], [1,2,3,4,6,7,8,9],
      [1,2,3,4,5,6,7,8,9]];
  var places = handicapPlaces[num], offset = (size <= 9 ? 2 : 3),
      step = (size - 1) / 2 - offset, coords = [];

  if(places) {
    for(var n=0; n<places.length; n++) {
      var i = (places[n]-1) % 3, j = Math.floor((places[n]-1) / 3);
      coords.push(new Coordinate(offset+i*step, offset+j*step));
    }
  }

  return coords;
};

/**
 * Deep extend an object.
 *
 * @function extend
 * @param {Object} dest Destination object to extend.
 * @param {Object} src Source object which properties will be copied.
 * @returns {Object} Extended destination object.
 */
exports.extend = function(dest, src) {
  for(var key in src) {
    if(src.hasOwnProperty(key)) {
      if(typeof src[key] === 'object') {
        if(!dest[key] || (typeof dest[key] !== 'object'))
          dest[key] = {}; // create/overwrite if necessary
        exports.extend(dest[key], src[key]);
      } else dest[key] = src[key];
    }
  }

  return dest;
};

},{"./coordinate":5}],14:[function(require,module,exports){
'use strict';
var JGO = require('./JGO');
window.JGO = JGO; // expose as global object

},{"./JGO":6}],15:[function(require,module,exports){
/**
 * Module dependencies.
 */

var Emitter = require('emitter');
var reduce = require('reduce');

/**
 * Root reference for iframes.
 */

var root = 'undefined' == typeof window
  ? this
  : window;

/**
 * Noop.
 */

function noop(){};

/**
 * Check if `obj` is a host object,
 * we don't want to serialize these :)
 *
 * TODO: future proof, move to compoent land
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isHost(obj) {
  var str = {}.toString.call(obj);

  switch (str) {
    case '[object File]':
    case '[object Blob]':
    case '[object FormData]':
      return true;
    default:
      return false;
  }
}

/**
 * Determine XHR.
 */

request.getXHR = function () {
  if (root.XMLHttpRequest
    && ('file:' != root.location.protocol || !root.ActiveXObject)) {
    return new XMLHttpRequest;
  } else {
    try { return new ActiveXObject('Microsoft.XMLHTTP'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP.6.0'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP.3.0'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP'); } catch(e) {}
  }
  return false;
};

/**
 * Removes leading and trailing whitespace, added to support IE.
 *
 * @param {String} s
 * @return {String}
 * @api private
 */

var trim = ''.trim
  ? function(s) { return s.trim(); }
  : function(s) { return s.replace(/(^\s*|\s*$)/g, ''); };

/**
 * Check if `obj` is an object.
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isObject(obj) {
  return obj === Object(obj);
}

/**
 * Serialize the given `obj`.
 *
 * @param {Object} obj
 * @return {String}
 * @api private
 */

function serialize(obj) {
  if (!isObject(obj)) return obj;
  var pairs = [];
  for (var key in obj) {
    if (null != obj[key]) {
      pairs.push(encodeURIComponent(key)
        + '=' + encodeURIComponent(obj[key]));
    }
  }
  return pairs.join('&');
}

/**
 * Expose serialization method.
 */

 request.serializeObject = serialize;

 /**
  * Parse the given x-www-form-urlencoded `str`.
  *
  * @param {String} str
  * @return {Object}
  * @api private
  */

function parseString(str) {
  var obj = {};
  var pairs = str.split('&');
  var parts;
  var pair;

  for (var i = 0, len = pairs.length; i < len; ++i) {
    pair = pairs[i];
    parts = pair.split('=');
    obj[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
  }

  return obj;
}

/**
 * Expose parser.
 */

request.parseString = parseString;

/**
 * Default MIME type map.
 *
 *     superagent.types.xml = 'application/xml';
 *
 */

request.types = {
  html: 'text/html',
  json: 'application/json',
  xml: 'application/xml',
  urlencoded: 'application/x-www-form-urlencoded',
  'form': 'application/x-www-form-urlencoded',
  'form-data': 'application/x-www-form-urlencoded'
};

/**
 * Default serialization map.
 *
 *     superagent.serialize['application/xml'] = function(obj){
 *       return 'generated xml here';
 *     };
 *
 */

 request.serialize = {
   'application/x-www-form-urlencoded': serialize,
   'application/json': JSON.stringify
 };

 /**
  * Default parsers.
  *
  *     superagent.parse['application/xml'] = function(str){
  *       return { object parsed from str };
  *     };
  *
  */

request.parse = {
  'application/x-www-form-urlencoded': parseString,
  'application/json': JSON.parse
};

/**
 * Parse the given header `str` into
 * an object containing the mapped fields.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function parseHeader(str) {
  var lines = str.split(/\r?\n/);
  var fields = {};
  var index;
  var line;
  var field;
  var val;

  lines.pop(); // trailing CRLF

  for (var i = 0, len = lines.length; i < len; ++i) {
    line = lines[i];
    index = line.indexOf(':');
    field = line.slice(0, index).toLowerCase();
    val = trim(line.slice(index + 1));
    fields[field] = val;
  }

  return fields;
}

/**
 * Return the mime type for the given `str`.
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

function type(str){
  return str.split(/ *; */).shift();
};

/**
 * Return header field parameters.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function params(str){
  return reduce(str.split(/ *; */), function(obj, str){
    var parts = str.split(/ *= */)
      , key = parts.shift()
      , val = parts.shift();

    if (key && val) obj[key] = val;
    return obj;
  }, {});
};

/**
 * Initialize a new `Response` with the given `xhr`.
 *
 *  - set flags (.ok, .error, etc)
 *  - parse header
 *
 * Examples:
 *
 *  Aliasing `superagent` as `request` is nice:
 *
 *      request = superagent;
 *
 *  We can use the promise-like API, or pass callbacks:
 *
 *      request.get('/').end(function(res){});
 *      request.get('/', function(res){});
 *
 *  Sending data can be chained:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' })
 *        .end(function(res){});
 *
 *  Or passed to `.send()`:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' }, function(res){});
 *
 *  Or passed to `.post()`:
 *
 *      request
 *        .post('/user', { name: 'tj' })
 *        .end(function(res){});
 *
 * Or further reduced to a single call for simple cases:
 *
 *      request
 *        .post('/user', { name: 'tj' }, function(res){});
 *
 * @param {XMLHTTPRequest} xhr
 * @param {Object} options
 * @api private
 */

function Response(req, options) {
  options = options || {};
  this.req = req;
  this.xhr = this.req.xhr;
  // responseText is accessible only if responseType is '' or 'text' and on older browsers
  this.text = ((this.req.method !='HEAD' && (this.xhr.responseType === '' || this.xhr.responseType === 'text')) || typeof this.xhr.responseType === 'undefined')
     ? this.xhr.responseText
     : null;
  this.statusText = this.req.xhr.statusText;
  this.setStatusProperties(this.xhr.status);
  this.header = this.headers = parseHeader(this.xhr.getAllResponseHeaders());
  // getAllResponseHeaders sometimes falsely returns "" for CORS requests, but
  // getResponseHeader still works. so we get content-type even if getting
  // other headers fails.
  this.header['content-type'] = this.xhr.getResponseHeader('content-type');
  this.setHeaderProperties(this.header);
  this.body = this.req.method != 'HEAD'
    ? this.parseBody(this.text ? this.text : this.xhr.response)
    : null;
}

/**
 * Get case-insensitive `field` value.
 *
 * @param {String} field
 * @return {String}
 * @api public
 */

Response.prototype.get = function(field){
  return this.header[field.toLowerCase()];
};

/**
 * Set header related properties:
 *
 *   - `.type` the content type without params
 *
 * A response of "Content-Type: text/plain; charset=utf-8"
 * will provide you with a `.type` of "text/plain".
 *
 * @param {Object} header
 * @api private
 */

Response.prototype.setHeaderProperties = function(header){
  // content-type
  var ct = this.header['content-type'] || '';
  this.type = type(ct);

  // params
  var obj = params(ct);
  for (var key in obj) this[key] = obj[key];
};

/**
 * Parse the given body `str`.
 *
 * Used for auto-parsing of bodies. Parsers
 * are defined on the `superagent.parse` object.
 *
 * @param {String} str
 * @return {Mixed}
 * @api private
 */

Response.prototype.parseBody = function(str){
  var parse = request.parse[this.type];
  return parse && str && (str.length || str instanceof Object)
    ? parse(str)
    : null;
};

/**
 * Set flags such as `.ok` based on `status`.
 *
 * For example a 2xx response will give you a `.ok` of __true__
 * whereas 5xx will be __false__ and `.error` will be __true__. The
 * `.clientError` and `.serverError` are also available to be more
 * specific, and `.statusType` is the class of error ranging from 1..5
 * sometimes useful for mapping respond colors etc.
 *
 * "sugar" properties are also defined for common cases. Currently providing:
 *
 *   - .noContent
 *   - .badRequest
 *   - .unauthorized
 *   - .notAcceptable
 *   - .notFound
 *
 * @param {Number} status
 * @api private
 */

Response.prototype.setStatusProperties = function(status){
  var type = status / 100 | 0;

  // status / class
  this.status = status;
  this.statusType = type;

  // basics
  this.info = 1 == type;
  this.ok = 2 == type;
  this.clientError = 4 == type;
  this.serverError = 5 == type;
  this.error = (4 == type || 5 == type)
    ? this.toError()
    : false;

  // sugar
  this.accepted = 202 == status;
  this.noContent = 204 == status || 1223 == status;
  this.badRequest = 400 == status;
  this.unauthorized = 401 == status;
  this.notAcceptable = 406 == status;
  this.notFound = 404 == status;
  this.forbidden = 403 == status;
};

/**
 * Return an `Error` representative of this response.
 *
 * @return {Error}
 * @api public
 */

Response.prototype.toError = function(){
  var req = this.req;
  var method = req.method;
  var url = req.url;

  var msg = 'cannot ' + method + ' ' + url + ' (' + this.status + ')';
  var err = new Error(msg);
  err.status = this.status;
  err.method = method;
  err.url = url;

  return err;
};

/**
 * Expose `Response`.
 */

request.Response = Response;

/**
 * Initialize a new `Request` with the given `method` and `url`.
 *
 * @param {String} method
 * @param {String} url
 * @api public
 */

function Request(method, url) {
  var self = this;
  Emitter.call(this);
  this._query = this._query || [];
  this.method = method;
  this.url = url;
  this.header = {};
  this._header = {};
  this.on('end', function(){
    var err = null;
    var res = null;

    try {
      res = new Response(self);
    } catch(e) {
      err = new Error('Parser is unable to parse the response');
      err.parse = true;
      err.original = e;
      return self.callback(err);
    }

    self.emit('response', res);

    if (err) {
      return self.callback(err, res);
    }

    if (res.status >= 200 && res.status < 300) {
      return self.callback(err, res);
    }

    var new_err = new Error(res.statusText || 'Unsuccessful HTTP response');
    new_err.original = err;
    new_err.response = res;
    new_err.status = res.status;

    self.callback(err || new_err, res);
  });
}

/**
 * Mixin `Emitter`.
 */

Emitter(Request.prototype);

/**
 * Allow for extension
 */

Request.prototype.use = function(fn) {
  fn(this);
  return this;
}

/**
 * Set timeout to `ms`.
 *
 * @param {Number} ms
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.timeout = function(ms){
  this._timeout = ms;
  return this;
};

/**
 * Clear previous timeout.
 *
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.clearTimeout = function(){
  this._timeout = 0;
  clearTimeout(this._timer);
  return this;
};

/**
 * Abort the request, and clear potential timeout.
 *
 * @return {Request}
 * @api public
 */

Request.prototype.abort = function(){
  if (this.aborted) return;
  this.aborted = true;
  this.xhr.abort();
  this.clearTimeout();
  this.emit('abort');
  return this;
};

/**
 * Set header `field` to `val`, or multiple fields with one object.
 *
 * Examples:
 *
 *      req.get('/')
 *        .set('Accept', 'application/json')
 *        .set('X-API-Key', 'foobar')
 *        .end(callback);
 *
 *      req.get('/')
 *        .set({ Accept: 'application/json', 'X-API-Key': 'foobar' })
 *        .end(callback);
 *
 * @param {String|Object} field
 * @param {String} val
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.set = function(field, val){
  if (isObject(field)) {
    for (var key in field) {
      this.set(key, field[key]);
    }
    return this;
  }
  this._header[field.toLowerCase()] = val;
  this.header[field] = val;
  return this;
};

/**
 * Remove header `field`.
 *
 * Example:
 *
 *      req.get('/')
 *        .unset('User-Agent')
 *        .end(callback);
 *
 * @param {String} field
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.unset = function(field){
  delete this._header[field.toLowerCase()];
  delete this.header[field];
  return this;
};

/**
 * Get case-insensitive header `field` value.
 *
 * @param {String} field
 * @return {String}
 * @api private
 */

Request.prototype.getHeader = function(field){
  return this._header[field.toLowerCase()];
};

/**
 * Set Content-Type to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.xml = 'application/xml';
 *
 *      request.post('/')
 *        .type('xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 *      request.post('/')
 *        .type('application/xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 * @param {String} type
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.type = function(type){
  this.set('Content-Type', request.types[type] || type);
  return this;
};

/**
 * Set Accept to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.json = 'application/json';
 *
 *      request.get('/agent')
 *        .accept('json')
 *        .end(callback);
 *
 *      request.get('/agent')
 *        .accept('application/json')
 *        .end(callback);
 *
 * @param {String} accept
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.accept = function(type){
  this.set('Accept', request.types[type] || type);
  return this;
};

/**
 * Set Authorization field value with `user` and `pass`.
 *
 * @param {String} user
 * @param {String} pass
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.auth = function(user, pass){
  var str = btoa(user + ':' + pass);
  this.set('Authorization', 'Basic ' + str);
  return this;
};

/**
* Add query-string `val`.
*
* Examples:
*
*   request.get('/shoes')
*     .query('size=10')
*     .query({ color: 'blue' })
*
* @param {Object|String} val
* @return {Request} for chaining
* @api public
*/

Request.prototype.query = function(val){
  if ('string' != typeof val) val = serialize(val);
  if (val) this._query.push(val);
  return this;
};

/**
 * Write the field `name` and `val` for "multipart/form-data"
 * request bodies.
 *
 * ``` js
 * request.post('/upload')
 *   .field('foo', 'bar')
 *   .end(callback);
 * ```
 *
 * @param {String} name
 * @param {String|Blob|File} val
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.field = function(name, val){
  if (!this._formData) this._formData = new root.FormData();
  this._formData.append(name, val);
  return this;
};

/**
 * Queue the given `file` as an attachment to the specified `field`,
 * with optional `filename`.
 *
 * ``` js
 * request.post('/upload')
 *   .attach(new Blob(['<a id="a"><b id="b">hey!</b></a>'], { type: "text/html"}))
 *   .end(callback);
 * ```
 *
 * @param {String} field
 * @param {Blob|File} file
 * @param {String} filename
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.attach = function(field, file, filename){
  if (!this._formData) this._formData = new root.FormData();
  this._formData.append(field, file, filename);
  return this;
};

/**
 * Send `data`, defaulting the `.type()` to "json" when
 * an object is given.
 *
 * Examples:
 *
 *       // querystring
 *       request.get('/search')
 *         .end(callback)
 *
 *       // multiple data "writes"
 *       request.get('/search')
 *         .send({ search: 'query' })
 *         .send({ range: '1..5' })
 *         .send({ order: 'desc' })
 *         .end(callback)
 *
 *       // manual json
 *       request.post('/user')
 *         .type('json')
 *         .send('{"name":"tj"})
 *         .end(callback)
 *
 *       // auto json
 *       request.post('/user')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // manual x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send('name=tj')
 *         .end(callback)
 *
 *       // auto x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // defaults to x-www-form-urlencoded
  *      request.post('/user')
  *        .send('name=tobi')
  *        .send('species=ferret')
  *        .end(callback)
 *
 * @param {String|Object} data
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.send = function(data){
  var obj = isObject(data);
  var type = this.getHeader('Content-Type');

  // merge
  if (obj && isObject(this._data)) {
    for (var key in data) {
      this._data[key] = data[key];
    }
  } else if ('string' == typeof data) {
    if (!type) this.type('form');
    type = this.getHeader('Content-Type');
    if ('application/x-www-form-urlencoded' == type) {
      this._data = this._data
        ? this._data + '&' + data
        : data;
    } else {
      this._data = (this._data || '') + data;
    }
  } else {
    this._data = data;
  }

  if (!obj || isHost(data)) return this;
  if (!type) this.type('json');
  return this;
};

/**
 * Invoke the callback with `err` and `res`
 * and handle arity check.
 *
 * @param {Error} err
 * @param {Response} res
 * @api private
 */

Request.prototype.callback = function(err, res){
  var fn = this._callback;
  this.clearTimeout();
  fn(err, res);
};

/**
 * Invoke callback with x-domain error.
 *
 * @api private
 */

Request.prototype.crossDomainError = function(){
  var err = new Error('Origin is not allowed by Access-Control-Allow-Origin');
  err.crossDomain = true;
  this.callback(err);
};

/**
 * Invoke callback with timeout error.
 *
 * @api private
 */

Request.prototype.timeoutError = function(){
  var timeout = this._timeout;
  var err = new Error('timeout of ' + timeout + 'ms exceeded');
  err.timeout = timeout;
  this.callback(err);
};

/**
 * Enable transmission of cookies with x-domain requests.
 *
 * Note that for this to work the origin must not be
 * using "Access-Control-Allow-Origin" with a wildcard,
 * and also must set "Access-Control-Allow-Credentials"
 * to "true".
 *
 * @api public
 */

Request.prototype.withCredentials = function(){
  this._withCredentials = true;
  return this;
};

/**
 * Initiate request, invoking callback `fn(res)`
 * with an instanceof `Response`.
 *
 * @param {Function} fn
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.end = function(fn){
  var self = this;
  var xhr = this.xhr = request.getXHR();
  var query = this._query.join('&');
  var timeout = this._timeout;
  var data = this._formData || this._data;

  // store callback
  this._callback = fn || noop;

  // state change
  xhr.onreadystatechange = function(){
    if (4 != xhr.readyState) return;

    // In IE9, reads to any property (e.g. status) off of an aborted XHR will
    // result in the error "Could not complete the operation due to error c00c023f"
    var status;
    try { status = xhr.status } catch(e) { status = 0; }

    if (0 == status) {
      if (self.timedout) return self.timeoutError();
      if (self.aborted) return;
      return self.crossDomainError();
    }
    self.emit('end');
  };

  // progress
  try {
    if (xhr.upload && this.hasListeners('progress')) {
      xhr.upload.onprogress = function(e){
        e.percent = e.loaded / e.total * 100;
        self.emit('progress', e);
      };
    }
  } catch(e) {
    // Accessing xhr.upload fails in IE from a web worker, so just pretend it doesn't exist.
    // Reported here:
    // https://connect.microsoft.com/IE/feedback/details/837245/xmlhttprequest-upload-throws-invalid-argument-when-used-from-web-worker-context
  }

  // timeout
  if (timeout && !this._timer) {
    this._timer = setTimeout(function(){
      self.timedout = true;
      self.abort();
    }, timeout);
  }

  // querystring
  if (query) {
    query = request.serializeObject(query);
    this.url += ~this.url.indexOf('?')
      ? '&' + query
      : '?' + query;
  }

  // initiate request
  xhr.open(this.method, this.url, true);

  // CORS
  if (this._withCredentials) xhr.withCredentials = true;

  // body
  if ('GET' != this.method && 'HEAD' != this.method && 'string' != typeof data && !isHost(data)) {
    // serialize stuff
    var serialize = request.serialize[this.getHeader('Content-Type')];
    if (serialize) data = serialize(data);
  }

  // set header fields
  for (var field in this.header) {
    if (null == this.header[field]) continue;
    xhr.setRequestHeader(field, this.header[field]);
  }

  // send stuff
  this.emit('request', this);
  xhr.send(data);
  return this;
};

/**
 * Expose `Request`.
 */

request.Request = Request;

/**
 * Issue a request:
 *
 * Examples:
 *
 *    request('GET', '/users').end(callback)
 *    request('/users').end(callback)
 *    request('/users', callback)
 *
 * @param {String} method
 * @param {String|Function} url or callback
 * @return {Request}
 * @api public
 */

function request(method, url) {
  // callback
  if ('function' == typeof url) {
    return new Request('GET', method).end(url);
  }

  // url first
  if (1 == arguments.length) {
    return new Request('GET', method);
  }

  return new Request(method, url);
}

/**
 * GET `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.get = function(url, data, fn){
  var req = request('GET', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.query(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * HEAD `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.head = function(url, data, fn){
  var req = request('HEAD', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * DELETE `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.del = function(url, fn){
  var req = request('DELETE', url);
  if (fn) req.end(fn);
  return req;
};

/**
 * PATCH `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} data
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.patch = function(url, data, fn){
  var req = request('PATCH', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * POST `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} data
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.post = function(url, data, fn){
  var req = request('POST', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * PUT `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.put = function(url, data, fn){
  var req = request('PUT', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * Expose `request`.
 */

module.exports = request;

},{"emitter":16,"reduce":17}],16:[function(require,module,exports){

/**
 * Expose `Emitter`.
 */

module.exports = Emitter;

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks[event] = this._callbacks[event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  var self = this;
  this._callbacks = this._callbacks || {};

  function on() {
    self.off(event, on);
    fn.apply(this, arguments);
  }

  on.fn = fn;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks[event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks[event];
    return this;
  }

  // remove specific handler
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks[event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks[event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

},{}],17:[function(require,module,exports){

/**
 * Reduce `arr` with `fn`.
 *
 * @param {Array} arr
 * @param {Function} fn
 * @param {Mixed} initial
 *
 * TODO: combatible error handling?
 */

module.exports = function(arr, fn, initial){  
  var idx = 0;
  var len = arr.length;
  var curr = arguments.length == 3
    ? initial
    : arr[idx++];

  while (idx < len) {
    curr = fn.call(null, curr, arr[idx], ++idx, arr);
  }
  
  return curr;
};
},{}]},{},[14]);
