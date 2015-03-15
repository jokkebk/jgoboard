(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
  if(captures.length == 1 && !this.filter(adjacent, C.CLEAR).length)
    return { success: true, captures: captures, ko: captures[0].copy() };

  return { success: true, captures: captures, ko: false };
};

module.exports = Board;

},{"./constants":3,"./coordinate":4,"./util":12}],2:[function(require,module,exports){
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

},{"./constants":3,"./coordinate":4,"./util":12}],3:[function(require,module,exports){
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

},{"./util":12}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
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
JGO.util.loadSGF = require('./sgf');

module.exports = JGO;

},{"./board":1,"./canvas":2,"./constants":3,"./coordinate":4,"./node":6,"./notifier":7,"./record":8,"./setup":9,"./sgf":10,"./stones":11,"./util":12}],6:[function(require,module,exports){
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

},{"./constants":3,"./util":12}],7:[function(require,module,exports){
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

  console.log('<p>Notifier created at ' + util.imageLoads + '</p>');

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

},{"./util":12}],8:[function(require,module,exports){
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

},{"./board":1,"./node":6}],9:[function(require,module,exports){
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

},{"./canvas":2,"./notifier":7,"./stones":11,"./util":12}],10:[function(require,module,exports){
'use strict';

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

/**
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

function sgfMove(node, name, values) {
  var coord, player, opponent, play;

  if(name == 'B') {
    player = C.BLACK;
    opponent = C.WHITE;
  } else if('W') {
    player = C.WHITE;
    opponent = C.BLACK;
  }

  coord = (values[0].length == 2) ? new Coordinate(values[0]) : null;

  play = node.jboard.playMove(coord, player); // Just ignore ko

  if(play.success && coord !== null) {
    node.setType(coord, player); // play stone
    node.setType(play.captures, C.CLEAR); // clear opponent's stones
  } else ERROR = play.error;

  return play.success;
}

function sgfSetup(node, name, values) {
  var setupMap = {'AB': C.BLACK, 'AW': C.WHITE, 'AE': C.CLEAR};

  node.setType(explodeSGFList(values), setupMap[name]);
  return true;
}

function sgfMarker(node, name, values) {
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

function sgfComment(node, name, values) {
  node.comment = values[0];
  return true;
}

function sgfHandicap(node, name, values) {
  node.info.handicap = values[0];
  return true;
}

function sgfLabel(node, name, values) {
  for(var i=0; i<values.length; i++) {
    var v = values[i], tuple = v.split(':');

    node.setMark(new Coordinate(tuple[0]), tuple[1]);
  }
  return true;
}

function sgfInfo(node, name, values) {
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

/**
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

/**
 * Apply SGF nodes recursively to create a game tree.
 * @returns true on success, false on error. Error message in ERROR.
 */
function recurseRecord(jrecord, gameTree) {
  for(var i=0; i<gameTree.sequence.length; i++) {
    var node = gameTree.sequence[i],
      jnode = jrecord.createNode(true); // clear parent marks

    for(var key in node) {
      if(node.hasOwnProperty(key)) {
        if(!(key in SGFProperties))
          continue;

        if(!SGFProperties[key](jnode, key, node[key])) {
          ERROR = 'Error while parsing node ' + key + ': ' + ERROR;
          return false;
        }
      }
    }
  }

  for(i=0; i<gameTree.leaves.length; i++) {
    var subTree = gameTree.leaves[i], snapshot;

    snapshot = jrecord.createSnapshot();

    if(!recurseRecord(jrecord, subTree))
      return false; // fall through on errors

    jrecord.restoreSnapshot(snapshot);
  }

  return true;
}

/**
 * Convert game tree to a record.
 * @returns {Object} Record or false on failure. Error stored in ERROR.
 */
function gameTreeToRecord(gameTree) {
  var jrecord, root = gameTree.sequence[0], width = 19, height = 19;

  if('SZ' in root) {
    var size = root.SZ[0];

    if(size.indexOf(':') != -1) {
      width = parseInt(size.substring(0, size.indexOf(':')));
      height = parseInt(size.substr(size.indexOf(':')+1));
    } else width = height = parseInt(size);
  }

  jrecord = new Record(width, height);

  if(!recurseRecord(jrecord, gameTree))
    return false;

  jrecord.first(); // rewind to start

  return jrecord;
}

/**
 * Parse SGF and return Record object(s).
 *
 * @returns {Object} Record object, array of them, or string on error.
 */
function loadSGF(sgf) {
  var gameTree = parseSGF(sgf);

  if(gameTree.sequence.length === 0) { // potentially multiple records
    var ret = [];

    if(gameTree.leaves.length === 0)
      return 'Empty game tree!';

    for(var i=0; i<gameTree.leaves.length; i++) {
      var rec = gameTreeToRecord(gameTree);

      if(!rec)
        return ERROR;

      ret.push(rec); // return each leaf as separate record
    }

    return ret;
  }

  return gameTreeToRecord(gameTree);
}

module.exports = loadSGF;

},{"./constants":3,"./coordinate":4,"./record":8}],11:[function(require,module,exports){
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

},{"./constants":3}],12:[function(require,module,exports){
'use strict';

var Coordinate = require('./coordinate');

/**
 * Load images and defined by object and invoke callback when completed.
 *
 * @param {Object} sources A dictionary of sources to load.
 * @param {function} callback A callback function to call with image dict.
 * @memberof util
 */
exports.imageLoads = 0;
exports.loadImages = function(sources, callback) {
  var images = {}, imagesLeft = 0;

  for(var src in sources) // count non-false properties as images
    if(sources.hasOwnProperty(src) && sources[src])
      imagesLeft++;

  var countdown = function() {
    exports.imageLoads++;
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
 * @memberof util
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
 * @memberof util
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

},{"./coordinate":4}],13:[function(require,module,exports){
'use strict';
var JGO = require('./JGO');
window.JGO = JGO; // expose as global object

},{"./JGO":5}]},{},[13]);
