"use strict";
Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
const SGFLetters = "abcdefghijklmnopqrstuvwxyz".split("");
const Coordinate = function(i, j) {
  if (i !== void 0) {
    if (j !== void 0) {
      this.i = i;
      this.j = j;
    } else {
      this.i = 0;
      this.j = 0;
      if (typeof i != "string")
        return;
      i = i.toLowerCase();
      this.i = SGFLetters.indexOf(i.substr(0, 1));
      this.j = SGFLetters.indexOf(i.substr(1));
    }
  } else {
    this.i = 0;
    this.j = 0;
  }
};
Coordinate.prototype.equals = function(c2) {
  return c2.i == this.i && c2.j == this.j;
};
Coordinate.prototype.toString = function() {
  return SGFLetters[this.i] + SGFLetters[this.j];
};
Coordinate.prototype.copy = function() {
  return new Coordinate(this.i, this.j);
};
function loadImages(sources, callback) {
  var images = {}, imagesLeft = 0;
  for (var src in sources)
    if (sources.hasOwnProperty(src) && sources[src])
      imagesLeft++;
  var countdown = function() {
    if (--imagesLeft <= 0) {
      callback(images);
    }
  };
  for (src in sources) {
    if (sources.hasOwnProperty(src) && sources[src]) {
      images[src] = new Image();
      images[src].onload = countdown;
      images[src].src = sources[src];
    }
  }
}
function getHandicapCoordinates(size2, num) {
  var handicapPlaces = [
    [],
    [],
    [3, 7],
    [3, 7, 9],
    [1, 3, 7, 9],
    [1, 3, 5, 7, 9],
    [1, 3, 4, 6, 7, 9],
    [1, 3, 4, 5, 6, 7, 9],
    [1, 2, 3, 4, 6, 7, 8, 9],
    [1, 2, 3, 4, 5, 6, 7, 8, 9]
  ];
  var places = handicapPlaces[num], offset = size2 <= 9 ? 2 : 3, step = (size2 - 1) / 2 - offset, coords = [];
  if (places) {
    for (var n = 0; n < places.length; n++) {
      var i = (places[n] - 1) % 3, j = Math.floor((places[n] - 1) / 3);
      coords.push(new Coordinate(offset + i * step, offset + j * step));
    }
  }
  return coords;
}
function extend(dest, src) {
  for (var key in src) {
    if (src.hasOwnProperty(key)) {
      if (typeof src[key] === "object") {
        if (!dest[key] || typeof dest[key] !== "object")
          dest[key] = {};
        extend(dest[key], src[key]);
      } else dest[key] = src[key];
    }
  }
  return dest;
}
const util = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  extend,
  getHandicapCoordinates,
  loadImages
}, Symbol.toStringTag, { value: "Module" }));
const INTERSECTION = {
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
const MARK = {
  /** No marker ('') */
  NONE: "",
  /** Selected intersection */
  SELECTED: "^",
  /** Square */
  SQUARE: "#",
  /** Triangle */
  TRIANGLE: "/",
  /** Circle */
  CIRCLE: "0",
  /** Cross */
  CROSS: "*",
  /** Black territory */
  BLACK_TERRITORY: "-",
  /** White territory */
  WHITE_TERRITORY: "+"
};
const COORDINATES = "ABCDEFGHJKLMNOPQRSTUVWXYZ".split("");
const JGO = {
  INTERSECTION,
  MARK,
  COORDINATES
};
extend(JGO, INTERSECTION);
var Stones = function(options, images) {
  this.stoneR = options.stone.radius;
  this.gridX = options.grid.x;
  this.gridY = options.grid.x;
  this.markX = this.stoneR * 1.1;
  this.markY = this.stoneR * 1.1;
  this.circleR = this.stoneR * 0.5;
  this.triangleR = this.stoneR * 0.9;
  this.images = images;
};
Stones.prototype.drawStone = function(ctx, type, ox, oy, scale) {
  if (!scale) scale = 1;
  var stone = type == JGO.BLACK || type == JGO.DIM_BLACK ? this.images.black : this.images.white;
  if (!stone) {
    ctx.fillStyle = type == JGO.WHITE ? "#FFFFFF" : "#000000";
    ctx.beginPath();
    ctx.arc(ox, oy, this.stoneR * scale, 2 * Math.PI, false);
    ctx.fill();
    if (type == JGO.WHITE) {
      ctx.strokeStyle = "#000000";
      ctx.stroke();
    }
  } else {
    ctx.drawImage(
      stone,
      0,
      0,
      stone.width,
      stone.height,
      Math.round(ox - stone.width / 2 * scale),
      Math.round(oy - stone.height / 2 * scale),
      stone.width * scale,
      stone.height * scale
    );
  }
};
Stones.prototype.drawShadow = function(ctx, ox, oy, scale) {
  var shadow = this.images.shadow;
  if (!shadow) return;
  if (!scale) scale = 1;
  ctx.drawImage(
    shadow,
    0,
    0,
    shadow.width,
    shadow.height,
    Math.round(ox - shadow.width / 2 * scale),
    Math.round(oy - shadow.height / 2 * scale),
    shadow.width * scale,
    shadow.height * scale
  );
};
Stones.prototype.drawMark = function(ctx, mark, ox, oy) {
  switch (mark) {
    case JGO.MARK.SQUARE:
      ctx.beginPath();
      ctx.rect(ox - this.markX / 2, oy - this.markY / 2, this.markX, this.markY);
      ctx.stroke();
      break;
    case JGO.MARK.CROSS:
      ctx.beginPath();
      ctx.moveTo(ox - this.markX / 2, oy + this.markY / 2);
      ctx.lineTo(ox + this.markX / 2, oy - this.markY / 2);
      ctx.moveTo(ox - this.markX / 2, oy - this.markY / 2);
      ctx.lineTo(ox + this.markX / 2, oy + this.markY / 2);
      ctx.stroke();
      break;
    case JGO.MARK.TRIANGLE:
      ctx.beginPath();
      for (var r = 0; r < 3; r++) {
        ctx.moveTo(
          ox + this.triangleR * Math.cos(Math.PI * (0.5 + 2 * r / 3)),
          oy - this.triangleR * Math.sin(Math.PI * (0.5 + 2 * r / 3))
        );
        ctx.lineTo(
          ox + this.triangleR * Math.cos(Math.PI * (0.5 + 2 * (r + 1) / 3)),
          oy - this.triangleR * Math.sin(Math.PI * (0.5 + 2 * (r + 1) / 3))
        );
      }
      ctx.stroke();
      break;
    case JGO.MARK.CIRCLE:
      ctx.beginPath();
      ctx.arc(ox, oy, this.circleR, 2 * Math.PI, false);
      ctx.stroke();
      break;
    case JGO.MARK.BLACK_TERRITORY:
      ctx.globalAlpha = 1;
      this.drawStone(ctx, JGO.BLACK, ox, oy, 0.5);
      break;
    case JGO.MARK.WHITE_TERRITORY:
      ctx.globalAlpha = 1;
      this.drawStone(ctx, JGO.WHITE, ox, oy, 0.5);
      break;
    case JGO.MARK.SELECTED:
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = "#8080FF";
      ctx.fillRect(
        ox - this.gridX / 2,
        oy - this.gridY / 2,
        this.gridX,
        this.gridY
      );
      break;
    default:
      ctx.fillText(mark, ox, oy);
      break;
  }
};
var Canvas = function(elem2, opt, images) {
  if (typeof elem2 === "string")
    elem2 = document.getElementById(elem2);
  var canvas = document.createElement("canvas"), i, j;
  var padLeft = opt.edge.left ? opt.padding.normal : opt.padding.clipped, padRight = opt.edge.right ? opt.padding.normal : opt.padding.clipped, padTop = opt.edge.top ? opt.padding.normal : opt.padding.clipped, padBottom = opt.edge.bottom ? opt.padding.normal : opt.padding.clipped;
  this.marginLeft = opt.edge.left ? opt.margin.normal : opt.margin.clipped;
  this.marginRight = opt.edge.right ? opt.margin.normal : opt.margin.clipped;
  this.marginTop = opt.edge.top ? opt.margin.normal : opt.margin.clipped;
  this.marginBottom = opt.edge.bottom ? opt.margin.normal : opt.margin.clipped;
  this.boardWidth = padLeft + padRight + opt.grid.x * opt.view.width;
  this.boardHeight = padTop + padBottom + opt.grid.y * opt.view.height;
  this.width = canvas.width = this.marginLeft + this.marginRight + this.boardWidth;
  this.height = canvas.height = this.marginTop + this.marginBottom + this.boardHeight;
  this.listeners = { "click": [], "mousemove": [], "mouseout": [] };
  this.getCoordinate = (function(pageX, pageY) {
    var bounds = canvas.getBoundingClientRect(), scaledX = (pageX - bounds.left) * canvas.width / (bounds.right - bounds.left), scaledY = (pageY - bounds.top) * canvas.height / (bounds.bottom - bounds.top);
    return new Coordinate(
      Math.floor((scaledX - this.marginLeft - padLeft) / opt.grid.x) + opt.view.xOffset,
      Math.floor((scaledY - this.marginTop - padTop) / opt.grid.y) + opt.view.yOffset
    );
  }).bind(this);
  canvas.onclick = (function(ev) {
    var c2 = this.getCoordinate(ev.clientX, ev.clientY), listeners = this.listeners.click;
    for (var l = 0; l < listeners.length; l++)
      listeners[l].call(this, c2.copy(), ev);
  }).bind(this);
  var lastMove = new Coordinate(-1, -1);
  canvas.onmousemove = (function(ev) {
    if (!this.listeners.mousemove.length) return;
    var c2 = this.getCoordinate(ev.clientX, ev.clientY), listeners = this.listeners.mousemove;
    if (c2.i < this.opt.view.xOffset || c2.i >= this.opt.view.xOffset + this.opt.view.width)
      c2.i = -1;
    if (c2.j < this.opt.view.yOffset || c2.j >= this.opt.view.yOffset + this.opt.view.height)
      c2.j = -1;
    if (lastMove.equals(c2))
      return;
    else
      lastMove = c2.copy();
    for (var l = 0; l < listeners.length; l++)
      listeners[l].call(this, c2.copy(), ev);
  }).bind(this);
  canvas.onmouseout = (function(ev) {
    var listeners = this.listeners.mouseout;
    for (var l = 0; l < listeners.length; l++)
      listeners[l].call(this, ev);
  }).bind(this);
  elem2.appendChild(canvas);
  this.ctx = canvas.getContext("2d");
  this.opt = extend({}, opt);
  this.stones = new Stones(opt, images);
  this.images = images;
  this.ctx.fillStyle = opt.margin.color;
  this.ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (this.images.board) {
    this.ctx.save();
    this.ctx.shadowColor = opt.boardShadow.color;
    this.ctx.shadowBlur = opt.boardShadow.blur;
    this.ctx.shadowOffsetX = opt.boardShadow.offX;
    this.ctx.shadowOffsetX = opt.boardShadow.offY;
    var clipTop = opt.edge.top ? 0 : this.marginTop, clipLeft = opt.edge.left ? 0 : this.marginLeft, clipBottom = opt.edge.bottom ? 0 : this.marginBottom, clipRight = opt.edge.right ? 0 : this.marginRight;
    this.ctx.beginPath();
    this.ctx.rect(
      clipLeft,
      clipTop,
      canvas.width - clipLeft - clipRight,
      canvas.height - clipTop - clipBottom
    );
    this.ctx.clip();
    this.ctx.drawImage(
      this.images.board,
      0,
      0,
      this.boardWidth,
      this.boardHeight,
      this.marginLeft,
      this.marginTop,
      this.boardWidth,
      this.boardHeight
    );
    this.ctx.strokeStyle = opt.border.color;
    this.ctx.lineWidth = opt.border.lineWidth;
    this.ctx.beginPath();
    this.ctx.rect(
      this.marginLeft,
      this.marginTop,
      this.boardWidth,
      this.boardHeight
    );
    this.ctx.stroke();
    this.ctx.restore();
  }
  this.gridTop = this.marginTop + padTop + opt.grid.y / 2;
  this.gridLeft = this.marginLeft + padLeft + opt.grid.x / 2;
  this.ctx.strokeStyle = opt.grid.color;
  var smt = this.opt.grid.smooth;
  for (i = 0; i < opt.view.width; i++) {
    if (i === 0 && opt.edge.left || i + 1 == opt.view.width && opt.edge.right)
      this.ctx.lineWidth = opt.grid.borderWidth;
    else
      this.ctx.lineWidth = opt.grid.lineWidth;
    this.ctx.beginPath();
    this.ctx.moveTo(
      smt + this.gridLeft + opt.grid.x * i,
      smt + this.gridTop - (opt.edge.top ? 0 : opt.grid.y / 2 + padTop / 2)
    );
    this.ctx.lineTo(
      smt + this.gridLeft + opt.grid.x * i,
      smt + this.gridTop + opt.grid.y * (opt.view.height - 1) + (opt.edge.bottom ? 0 : opt.grid.y / 2 + padBottom / 2)
    );
    this.ctx.stroke();
  }
  for (i = 0; i < opt.view.height; i++) {
    if (i === 0 && opt.edge.top || i + 1 == opt.view.height && opt.edge.bottom)
      this.ctx.lineWidth = opt.grid.borderWidth;
    else
      this.ctx.lineWidth = opt.grid.lineWidth;
    this.ctx.beginPath();
    this.ctx.moveTo(
      smt + this.gridLeft - (opt.edge.left ? 0 : opt.grid.x / 2 + padLeft / 2),
      smt + this.gridTop + opt.grid.y * i
    );
    this.ctx.lineTo(
      smt + this.gridLeft + opt.grid.x * (opt.view.width - 1) + (opt.edge.right ? 0 : opt.grid.x / 2 + padRight / 2),
      smt + this.gridTop + opt.grid.y * i
    );
    this.ctx.stroke();
  }
  if (opt.stars.points) {
    var step = (opt.board.width - 1) / 2 - opt.stars.offset;
    for (j = 0; j < 3; j++) {
      for (i = 0; i < 3; i++) {
        if (j == 1 && i == 1) {
          if (opt.stars.points % 2 === 0)
            continue;
        } else if (i == 1 || j == 1) {
          if (opt.stars.points < 8)
            continue;
        } else {
          if (opt.stars.points < 4)
            continue;
        }
        var x = opt.stars.offset + i * step - opt.view.xOffset, y = opt.stars.offset + j * step - opt.view.yOffset;
        if (x < 0 || y < 0 || x >= opt.view.width || y >= opt.view.height)
          continue;
        this.ctx.beginPath();
        this.ctx.arc(
          smt + this.gridLeft + x * opt.grid.x,
          smt + this.gridTop + y * opt.grid.y,
          opt.stars.radius,
          2 * Math.PI,
          false
        );
        this.ctx.fillStyle = opt.grid.color;
        this.ctx.fill();
      }
    }
  }
  this.ctx.font = opt.coordinates.font;
  this.ctx.fillStyle = opt.coordinates.color;
  this.ctx.textAlign = "center";
  this.ctx.textBaseline = "middle";
  for (i = 0; i < opt.view.width; i++) {
    if (opt.coordinates && opt.coordinates.top)
      this.ctx.fillText(
        JGO.COORDINATES[i + opt.view.xOffset],
        this.gridLeft + opt.grid.x * i,
        this.marginTop / 2
      );
    if (opt.coordinates && opt.coordinates.bottom)
      this.ctx.fillText(
        JGO.COORDINATES[i + opt.view.xOffset],
        this.gridLeft + opt.grid.x * i,
        canvas.height - this.marginBottom / 2
      );
  }
  for (i = 0; i < opt.view.height; i++) {
    if (opt.coordinates && opt.coordinates.left)
      this.ctx.fillText(
        "" + (opt.board.height - opt.view.yOffset - i),
        this.marginLeft / 2,
        this.gridTop + opt.grid.y * i
      );
    if (opt.coordinates && opt.coordinates.right)
      this.ctx.fillText(
        "" + (opt.board.height - opt.view.yOffset - i),
        canvas.width - this.marginRight / 2,
        this.gridTop + opt.grid.y * i
      );
  }
  this.backup = document.createElement("canvas");
  this.backup.width = canvas.width;
  this.backup.height = canvas.height;
  this.backup.getContext("2d").drawImage(
    canvas,
    0,
    0,
    canvas.width,
    canvas.height,
    0,
    0,
    canvas.width,
    canvas.height
  );
  this.ctx.beginPath();
  this.ctx.rect(this.marginLeft, this.marginTop, this.boardWidth, this.boardHeight);
  this.ctx.clip();
  if (this.images.black) this.ctx.drawImage(this.images.black, 10, 10);
  if (this.images.white) this.ctx.drawImage(this.images.white, 10, 10);
  if (this.images.shadow) this.ctx.drawImage(this.images.shadow, 10, 10);
  this.restore(this.marginLeft, this.marginTop, this.boardWidth, this.boardHeight);
};
Canvas.prototype.restore = function(x, y, w, h) {
  x = Math.floor(x);
  y = Math.floor(y);
  x = Math.max(x, 0);
  y = Math.max(y, 0);
  w = Math.min(w, this.backup.width - x);
  h = Math.min(h, this.backup.height - y);
  try {
    this.ctx.drawImage(this.backup, x, y, w, h, x, y, w, h);
  } catch (e) {
    console.log(e);
  }
};
Canvas.prototype.getX = function(i) {
  return this.gridLeft + this.opt.grid.x * i;
};
Canvas.prototype.getY = function(j) {
  return this.gridTop + this.opt.grid.y * j;
};
Canvas.prototype.draw = function(jboard2, i1, j1, i2, j2) {
  i1 = this.opt.view.xOffset;
  j1 = this.opt.view.yOffset;
  i2 = this.opt.view.xOffset + this.opt.view.width - 1;
  j2 = this.opt.view.yOffset + this.opt.view.height - 1;
  if (i2 < i1 || j2 < j1)
    return;
  var x = this.getX(i1 - this.opt.view.xOffset) - this.opt.grid.x, y = this.getY(j1 - this.opt.view.yOffset) - this.opt.grid.y, w = this.opt.grid.x * (i2 - i1 + 2), h = this.opt.grid.y * (j2 - j1 + 2);
  this.ctx.save();
  this.ctx.beginPath();
  this.ctx.rect(x, y, w, h);
  this.ctx.clip();
  this.restore(x, y, w, h);
  i1 = Math.max(i1 - 1, this.opt.view.xOffset);
  j1 = Math.max(j1 - 1, this.opt.view.yOffset);
  i2 = Math.min(i2 + 1, this.opt.view.xOffset + this.opt.view.width - 1);
  j2 = Math.min(j2 + 1, this.opt.view.yOffset + this.opt.view.height - 1);
  var isLabel = /^[a-zA-Z1-9]/;
  var stoneR = this.opt.stone.radius, clearW = stoneR * 1.5, clearH = stoneR * 1.2, clearFunc;
  if (this.images.board) {
    clearFunc = (function(ox, oy) {
      this.ctx.drawImage(
        this.images.board,
        ox - this.marginLeft - clearW / 2,
        oy - this.marginTop - clearH / 2,
        clearW,
        clearH,
        ox - clearW / 2,
        oy - clearH / 2,
        clearW,
        clearH
      );
    }).bind(this);
  } else {
    this.ctx.fillStyle = this.opt.margin.color;
    clearFunc = (function(ox, oy) {
      this.ctx.fillRect(ox - clearW / 2, oy - clearH / 2, clearW, clearH);
    }).bind(this);
  }
  jboard2.each((function(c2, type, mark) {
    var ox = this.getX(c2.i - this.opt.view.xOffset);
    var oy = this.getY(c2.j - this.opt.view.yOffset);
    if (type == JGO.CLEAR && mark && isLabel.test(mark))
      clearFunc(ox, oy);
  }).bind(this), i1, j1, i2, j2);
  jboard2.each((function(c2, type) {
    var ox = this.getX(c2.i - this.opt.view.xOffset);
    var oy = this.getY(c2.j - this.opt.view.yOffset);
    if (type == JGO.BLACK || type == JGO.WHITE) {
      this.stones.drawShadow(
        this.ctx,
        this.opt.shadow.xOff + ox,
        this.opt.shadow.yOff + oy
      );
    }
  }).bind(this), i1, j1, i2, j2);
  jboard2.each((function(c2, type, mark) {
    var ox = this.getX(c2.i - this.opt.view.xOffset);
    var oy = this.getY(c2.j - this.opt.view.yOffset);
    var markColor;
    switch (type) {
      case JGO.BLACK:
      case JGO.DIM_BLACK:
        this.ctx.globalAlpha = type == JGO.BLACK ? 1 : this.opt.stone.dimAlpha;
        this.stones.drawStone(this.ctx, type, ox, oy);
        markColor = this.opt.mark.blackColor;
        break;
      case JGO.WHITE:
      case JGO.DIM_WHITE:
        this.ctx.globalAlpha = type == JGO.WHITE ? 1 : this.opt.stone.dimAlpha;
        this.stones.drawStone(this.ctx, type, ox, oy);
        markColor = this.opt.mark.whiteColor;
        break;
      default:
        this.ctx.globalAlpha = 1;
        markColor = this.opt.mark.clearColor;
    }
    this.ctx.lineWidth = this.opt.mark.lineWidth;
    this.ctx.strokeStyle = markColor;
    this.ctx.font = this.opt.mark.font;
    this.ctx.fillStyle = markColor;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    if (mark) this.stones.drawMark(this.ctx, mark, ox, oy);
  }).bind(this), i1, j1, i2, j2);
  this.ctx.restore();
};
Canvas.prototype.addListener = function(event, callback) {
  this.listeners[event].push(callback);
};
const Node = function(jboard2, parent, info) {
  this.jboard = jboard2;
  this.parent = parent;
  this.info = info ? extend({}, info) : {};
  this.children = [];
  this.changes = [];
  if (parent) {
    parent.children.push(this);
    this.info.captures = extend({}, parent.info.captures);
  } else {
    this.info.captures = { 1: 0, 2: 0 };
  }
};
Node.prototype.clearParentMarks = function() {
  if (!this.parent)
    return;
  for (var i = this.parent.changes.length - 1; i >= 0; i--) {
    var item = this.parent.changes[i];
    if ("mark" in item)
      this.setMark(item.c, JGO.MARK.NONE);
  }
};
Node.prototype.setType = function(c2, val) {
  if (c2 instanceof Array) {
    for (var i = 0, len = c2.length; i < len; ++i)
      this.setType(c2[i], val);
    return;
  }
  this.changes.push({ c: c2.copy(), type: val, old: this.jboard.getType(c2) });
  this.jboard.setType(c2, val);
};
Node.prototype.setMark = function(c2, val) {
  if (c2 instanceof Array) {
    for (var i = 0, len = c2.length; i < len; ++i)
      this.setMark(c2[i], val);
    return;
  }
  this.changes.push({ c: c2.copy(), mark: val, old: this.jboard.getMark(c2) });
  this.jboard.setMark(c2, val);
};
Node.prototype.apply = function() {
  for (var i = 0; i < this.changes.length; i++) {
    var item = this.changes[i];
    if ("type" in item)
      this.jboard.setType(item.c, item.type);
    else
      this.jboard.setMark(item.c, item.mark);
  }
};
Node.prototype.revert = function() {
  for (var i = this.changes.length - 1; i >= 0; i--) {
    var item = this.changes[i];
    if ("type" in item)
      this.jboard.setType(item.c, item.old);
    else
      this.jboard.setMark(item.c, item.old);
  }
};
const Notifier = function(jboard2) {
  this.updateScheduled = false;
  this.canvases = [];
  this.board = jboard2;
  this.changeFunc = (function(ev) {
    var coord = ev.coordinate;
    if (this.updateScheduled) {
      this.min.i = Math.min(this.min.i, coord.i);
      this.min.j = Math.min(this.min.j, coord.j);
      this.max.i = Math.max(this.max.i, coord.i);
      this.max.j = Math.max(this.max.j, coord.j);
      return;
    }
    this.min = coord.copy();
    this.max = coord.copy();
    this.updateScheduled = true;
    setTimeout((function() {
      for (var c2 = 0; c2 < this.canvases.length; c2++)
        this.canvases[c2].draw(
          this.board,
          this.min.i,
          this.min.j,
          this.max.i,
          this.max.j
        );
      this.updateScheduled = false;
    }).bind(this), 0);
  }).bind(this);
  this.board.addListener(this.changeFunc);
};
Notifier.prototype.changeBoard = function(board) {
  this.board.removeListener(this.changeFunc);
  this.board = board;
  this.board.addListener(this.changeFunc);
  for (var c2 = 0; c2 < this.canvases.length; c2++)
    this.canvases[c2].draw(this.board, 0, 0, this.board.width, this.board.height);
};
Notifier.prototype.addCanvas = function(jcanvas) {
  this.canvases.push(jcanvas);
};
const Board = function(width2, height2) {
  this.width = width2;
  if (height2 !== void 0)
    this.height = height2;
  else {
    this.height = this.width;
  }
  this.listeners = [];
  this.stones = [];
  this.marks = [];
  for (var i = 0; i < this.width; ++i) {
    var stoneArr = [], markArr = [];
    for (var j = 0; j < this.height; ++j) {
      stoneArr.push(JGO.CLEAR);
      markArr.push(JGO.MARK.NONE);
    }
    this.stones.push(stoneArr);
    this.marks.push(markArr);
  }
};
Board.prototype.addListener = function(func) {
  this.listeners.push(func);
};
Board.prototype.removeListener = function(func) {
  var index = this.listeners.indexOf(func);
  if (index != -1) this.listeners.splice(index, 1);
};
Board.prototype.getCoordinate = function(s) {
  return new Coordinate(
    JGO.COORDINATES.indexOf(s.toUpperCase().substr(0, 1)),
    this.height - parseInt(s.substr(1))
  );
};
Board.prototype.toString = function(c2) {
  return JGO.COORDINATES[c2.i] + (this.height - c2.j);
};
Board.prototype.each = function(func, i1, j1, i2, j2) {
  var c2 = new Coordinate();
  if (i1 === void 0) i1 = 0;
  if (j1 === void 0) j1 = 0;
  if (i2 === void 0) i2 = this.width - 1;
  if (j2 === void 0) j2 = this.height - 1;
  for (c2.j = j1; c2.j <= j2; c2.j++)
    for (c2.i = i1; c2.i <= i2; c2.i++)
      func(c2.copy(), this.stones[c2.i][c2.j], this.marks[c2.i][c2.j]);
};
Board.prototype.clear = function() {
  this.each((function(c2) {
    this.setType(c2, JGO.CLEAR);
    this.setMark(c2, JGO.MARK.NONE);
  }).bind(this));
};
Board.prototype.setType = function(c2, t) {
  if (c2 instanceof Coordinate) {
    var old = this.stones[c2.i][c2.j];
    if (old == t) return;
    this.stones[c2.i][c2.j] = t;
    var ev = {
      type: "type",
      coordinate: c2,
      board: this,
      oldVal: old,
      newVal: t
    };
    this.listeners.forEach(function(l) {
      l(ev);
    });
  } else if (c2 instanceof Array) {
    for (var i = 0, len = c2.length; i < len; ++i)
      this.setType(c2[i], t);
  }
};
Board.prototype.setMark = function(c2, m) {
  if (c2 instanceof Coordinate) {
    var old = this.marks[c2.i][c2.j];
    if (old == m) return;
    this.marks[c2.i][c2.j] = m;
    var ev = {
      type: "mark",
      coordinate: c2,
      board: this,
      oldVal: old,
      newVal: m
    };
    this.listeners.forEach(function(l) {
      l(ev);
    });
  } else if (c2 instanceof Array) {
    for (var i = 0, len = c2.length; i < len; ++i)
      this.setMark(c2[i], m);
  }
};
Board.prototype.getType = function(c2) {
  var ret;
  if (c2 instanceof Coordinate) {
    ret = this.stones[c2.i][c2.j];
  } else if (c2 instanceof Array) {
    ret = [];
    for (var i = 0, len = c2.length; i < len; ++i)
      ret.push(this.stones[c2[i].i][c2[i].j]);
  }
  return ret;
};
Board.prototype.getMark = function(c2) {
  var ret;
  if (c2 instanceof Coordinate) {
    ret = this.marks[c2.i][c2.j];
  } else if (c2 instanceof Array) {
    ret = [];
    for (var i = 0, len = c2.length; i < len; ++i)
      ret.push(this.marks[c2[i].i][c2[i].j]);
  }
  return ret;
};
Board.prototype.getAdjacent = function(c2) {
  var coordinates = [], i = c2.i, j = c2.j;
  if (i > 0)
    coordinates.push(new Coordinate(i - 1, j));
  if (i + 1 < this.width)
    coordinates.push(new Coordinate(i + 1, j));
  if (j > 0)
    coordinates.push(new Coordinate(i, j - 1));
  if (j + 1 < this.height)
    coordinates.push(new Coordinate(i, j + 1));
  return coordinates;
};
Board.prototype.filter = function(c2, t) {
  var ret = [];
  for (var i = 0, len = c2.length; i < len; ++i)
    if (this.stones[c2[i].i][c2[i].j] == t)
      ret.push(c2[i]);
  return ret;
};
Board.prototype.hasType = function(c2, t) {
  for (var i = 0, len = c2.length; i < len; ++i)
    if (this.stones[c2[i].i][c2[i].j] == t)
      return true;
  return false;
};
Board.prototype.getGroup = function(coord, overrideType) {
  var type = overrideType || this.getType(coord), seen = {}, group = [coord.copy()], neighbors = [], queue = this.getAdjacent(coord);
  seen[coord.toString()] = true;
  while (queue.length) {
    var c2 = queue.shift();
    if (c2.toString() in seen)
      continue;
    else
      seen[c2.toString()] = true;
    if (this.getType(c2) == type) {
      group.push(c2);
      queue = queue.concat(this.getAdjacent(c2));
    } else
      neighbors.push(c2);
  }
  return { group, neighbors };
};
Board.prototype.getRaw = function() {
  return {
    width: this.width,
    height: this.height,
    stones: extend({}, this.stones),
    marks: extend({}, this.marks)
  };
};
Board.prototype.setRaw = function(raw) {
  this.width = raw.width;
  this.height = raw.height;
  this.stones = raw.stones;
  this.marks = raw.marks;
};
Board.prototype.clone = function() {
  var board = new Board();
  board.setRaw(this.getRaw());
  return board;
};
Board.prototype.playMove = function(coord, stone, ko) {
  var oppType = stone == JGO.BLACK ? JGO.WHITE : JGO.BLACK, captures = [], adjacent, captured = {};
  if (!coord)
    return { success: true, captures: [], ko: false };
  if (this.getType(coord) != JGO.CLEAR)
    return {
      success: false,
      errorMsg: "Cannot play on existing stone!"
    };
  if (ko && coord.equals(ko))
    return {
      success: false,
      errorMsg: "Cannot retake ko immediately!"
    };
  adjacent = this.getAdjacent(coord);
  for (var i = 0; i < adjacent.length; i++) {
    var c2 = adjacent[i];
    if (c2.toString() in captured) continue;
    if (this.getType(c2) == oppType) {
      var g = this.getGroup(c2);
      if (this.filter(g.neighbors, JGO.CLEAR).length === 1) {
        captures = captures.concat(g.group);
        for (var j = 0; j < g.group.length; j++)
          captured[g.group[j].toString()] = true;
      }
    }
  }
  if (captures.length === 0 && !this.hasType(this.getGroup(coord, stone).neighbors, JGO.CLEAR))
    return {
      success: false,
      errorMsg: "Suicide is not allowed!"
    };
  if (captures.length == 1 && this.filter(adjacent, JGO.CLEAR).length === 0 && this.filter(adjacent, stone).length === 0)
    return { success: true, captures, ko: captures[0].copy() };
  return { success: true, captures, ko: false };
};
var Record = function(width2, height2) {
  this.jboard = new Board(width2, height2 ? height2 : width2);
  this.root = this.current = null;
  this.info = {};
};
Record.prototype.getBoard = function() {
  return this.jboard;
};
Record.prototype.getCurrentNode = function() {
  return this.current;
};
Record.prototype.getRootNode = function() {
  return this.root;
};
Record.prototype.createNode = function(clearParentMarks, options) {
  var node = new Node(this.jboard, this.current, options);
  if (clearParentMarks)
    node.clearParentMarks();
  if (this.root === null)
    this.root = node;
  return this.current = node;
};
Record.prototype.next = function(variation) {
  if (this.current === null)
    return null;
  if (!variation)
    variation = 0;
  if (variation >= this.current.children.length)
    return null;
  this.current = this.current.children[variation];
  this.current.apply(this.jboard);
  return this.current;
};
Record.prototype.previous = function() {
  if (this.current === null || this.current.parent === null)
    return null;
  this.current.revert(this.jboard);
  this.current = this.current.parent;
  return this.current;
};
Record.prototype.getVariation = function() {
  if (this.current === null || this.current.parent === null)
    return 0;
  return this.current.parent.children.indexOf(this.current);
};
Record.prototype.setVariation = function(variation) {
  if (this.previous() === null)
    return null;
  return this.next(variation);
};
Record.prototype.getVariations = function() {
  if (this.current === null || this.current.parent === null)
    return 1;
  return this.current.parent.children.length;
};
Record.prototype.first = function() {
  this.current = this.root;
  this.jboard.clear();
  if (this.current !== null)
    this.current.apply(this.jboard);
  return this.current;
};
Record.prototype.createSnapshot = function() {
  return { jboard: this.jboard.getRaw(), current: this.current };
};
Record.prototype.restoreSnapshot = function(raw) {
  this.jboard.setRaw(raw.jboard);
  this.current = raw.current;
};
Record.prototype.normalize = function(node) {
  var i, len, maxLen = 0, maxI = 0;
  if (!node) node = this.getRootNode();
  for (i = 0; i < node.children.length; i++) {
    len = this.normalize(node.children[i]);
    if (maxLen < len) {
      maxLen = len;
      maxI = i;
    }
  }
  if (maxI) {
    i = node.children[0];
    node.children[0] = node.children[maxI];
    node.children[maxI] = i;
  }
  return maxLen + 1;
};
var Setup = function(board, boardOptions) {
  var defaults = {
    margin: { color: "white" },
    edge: { top: true, bottom: true, left: true, right: true },
    coordinates: { top: true, bottom: true, left: true, right: true },
    stars: { points: 0 },
    board: { width: board.width, height: board.height },
    view: { xOffset: 0, yOffset: 0, width: board.width, height: board.height }
  };
  if (board.width == board.height) {
    switch (board.width) {
      // square
      case 9:
        defaults.stars.points = 5;
        defaults.stars.offset = 2;
        break;
      case 13:
      case 19:
        defaults.stars.points = 9;
        defaults.stars.offset = 3;
        break;
    }
  }
  this.board = board;
  this.notifier = new Notifier(this.board);
  this.options = extend(defaults, boardOptions);
};
Setup.prototype.view = function(xOff, yOff, width2, height2) {
  this.options.view.xOffset = xOff;
  this.options.view.yOffset = yOff;
  this.options.view.width = width2;
  this.options.view.height = height2;
  this.options.edge.left = xOff === 0;
  this.options.edge.right = xOff + width2 == this.options.board.width;
  this.options.edge.top = yOff === 0;
  this.options.edge.bottom = yOff + height2 == this.options.board.height;
};
Setup.prototype.setOptions = function(options) {
  extend(this.options, options);
};
Setup.prototype.getNotifier = function() {
  return this.notifier;
};
Setup.prototype.create = function(elemId, readyFn) {
  var options = extend({}, this.options);
  var createCallback = (function(images) {
    var jcanvas = new Canvas(elemId, options, images);
    jcanvas.draw(this.board, 0, 0, this.board.width - 1, this.board.height - 1);
    this.notifier.addCanvas(jcanvas);
    if (readyFn) readyFn(jcanvas);
  }).bind(this);
  if (this.options.textures)
    loadImages(this.options.textures, createCallback);
  else
    createCallback({ black: false, white: false, shadow: false, board: false });
};
var ERROR;
var fieldMap = {
  "AN": "annotator",
  "CP": "copyright",
  "DT": "date",
  "EV": "event",
  "GN": "gameName",
  "OT": "overtime",
  "RO": "round",
  "RE": "result",
  "RU": "rules",
  "SO": "source",
  "TM": "time",
  "PC": "location",
  "PB": "black",
  "PW": "white",
  "BR": "blackRank",
  "WR": "whiteRank",
  "BT": "blackTeam",
  "WT": "whiteTeam"
};
function explodeSGFList(propValues) {
  var coords = [];
  for (var i = 0, len = propValues.length; i < len; i++) {
    var val = propValues[i];
    if (val.indexOf(":") == -1) {
      coords.push(new Coordinate(val));
    } else {
      var tuple = val.split(":"), c1, c2, coord;
      c1 = new Coordinate(tuple[0]);
      c2 = new Coordinate(tuple[1]);
      coord = new Coordinate();
      for (coord.i = c1.i; coord.i <= c2.i; ++coord.i)
        for (coord.j = c1.j; coord.j <= c2.j; ++coord.j)
          coords.push(coord.copy());
    }
  }
  return coords;
}
function sgfMove(node, name, values, moveMarks) {
  var coord, player, play;
  if (name == "B") {
    player = JGO.BLACK;
    JGO.WHITE;
  } else {
    player = JGO.WHITE;
    JGO.BLACK;
  }
  coord = values[0].length == 2 ? new Coordinate(values[0]) : null;
  if (coord !== null && (coord.i >= node.jboard.width || coord.j >= node.jboard.height))
    coord = null;
  play = node.jboard.playMove(coord, player);
  node.info.captures[player] += play.captures.length;
  if (moveMarks && play.ko)
    node.setMark(play.ko, JGO.MARK.SQUARE);
  if (play.success && coord !== null) {
    node.setType(coord, player);
    node.setType(play.captures, JGO.CLEAR);
    if (moveMarks)
      node.setMark(coord, JGO.MARK.CIRCLE);
  } else ERROR = play.error;
  return play.success;
}
function sgfSetup(node, name, values) {
  var setupMap = { "AB": JGO.BLACK, "AW": JGO.WHITE, "AE": JGO.CLEAR };
  node.setType(explodeSGFList(values), setupMap[name]);
  return true;
}
function sgfMarker(node, name, values) {
  var markerMap = {
    "TW": JGO.MARK.WHITE_TERRITORY,
    "TB": JGO.MARK.BLACK_TERRITORY,
    "CR": JGO.MARK.CIRCLE,
    "TR": JGO.MARK.TRIANGLE,
    "MA": JGO.MARK.CROSS,
    "SQ": JGO.MARK.SQUARE
  };
  node.setMark(explodeSGFList(values), markerMap[name]);
  return true;
}
function sgfComment(node, name, values) {
  node.info.comment = values[0];
  return true;
}
function sgfHandicap(node, name, values) {
  node.info.handicap = values[0];
  return true;
}
function sgfLabel(node, name, values) {
  for (var i = 0; i < values.length; i++) {
    var v = values[i], tuple = v.split(":");
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
  "B": sgfMove,
  "W": sgfMove,
  "AB": sgfSetup,
  "AW": sgfSetup,
  "AE": sgfSetup,
  "C": sgfComment,
  "LB": sgfLabel,
  "HA": sgfHandicap,
  "TW": sgfMarker,
  "TB": sgfMarker,
  "CR": sgfMarker,
  "TR": sgfMarker,
  "MA": sgfMarker,
  "SQ": sgfMarker,
  "AN": sgfInfo,
  "CP": sgfInfo,
  "DT": sgfInfo,
  "EV": sgfInfo,
  "GN": sgfInfo,
  "OT": sgfInfo,
  "RO": sgfInfo,
  "RE": sgfInfo,
  "RU": sgfInfo,
  "SO": sgfInfo,
  "TM": sgfInfo,
  "PC": sgfInfo,
  "PB": sgfInfo,
  "PW": sgfInfo,
  "BR": sgfInfo,
  "WR": sgfInfo,
  "BT": sgfInfo,
  "WT": sgfInfo
};
function parseSGF(sgf2) {
  var tokens, i, len, token, lastBackslash = false, bracketOpen = -1, processed = [];
  if ("a~b".split(/(~)/).length === 3) {
    tokens = sgf2.split(/([\[\]\(\);])/);
  } else {
    var blockStart = 0, delimiters = "[]();";
    tokens = [];
    for (i = 0, len = sgf2.length; i < len; ++i) {
      if (delimiters.indexOf(sgf2.charAt(i)) !== -1) {
        if (blockStart < i)
          tokens.push(sgf2.substring(blockStart, i));
        tokens.push(sgf2.charAt(i));
        blockStart = i + 1;
      }
    }
    if (blockStart < i)
      tokens.push(sgf2.substr(blockStart, i));
  }
  for (i = 0, len = tokens.length; i < len; ++i) {
    token = tokens[i];
    if (bracketOpen == -1) {
      token = token.replace(/^\s+|\s+$/g, "");
      if (token == "[")
        bracketOpen = i;
      else if (token !== "")
        processed.push(token);
    } else {
      if (token != "]") {
        lastBackslash = token.charAt(token.length - 1) == "\\";
      } else {
        if (lastBackslash) {
          lastBackslash = false;
        } else {
          processed.push(tokens.slice(bracketOpen, i + 1).join("").replace(/\\\]/g, "]"));
          bracketOpen = -1;
        }
      }
    }
  }
  if (processed.length === 0) {
    ERROR = "SGF was empty!";
    return false;
  } else if (processed[0] != "(" || processed[1] != ";" || processed[processed.length - 1] != ")") {
    ERROR = "SGF did not start with '(;' or end with ')'!";
    return false;
  }
  tokens = processed;
  processed = [];
  var node, propertyId = "";
  for (i = 0, len = tokens.length; i < len; ++i) {
    token = tokens[i];
    if (token == "(" || token == ")") {
      if (node) {
        if (propertyId !== "" && node[propertyId].length === 0) {
          ERROR = "Missing property value at " + token + "!";
          return false;
        }
        processed.push(node);
        node = void 0;
      }
      processed.push(token);
    } else if (token == ";") {
      if (node) {
        if (propertyId !== "" && node[propertyId].length === 0) {
          ERROR = "Missing property value at " + token + "!";
          return false;
        }
        processed.push(node);
      }
      node = {};
      propertyId = "";
    } else {
      if (token.indexOf("[") !== 0) {
        if (propertyId !== "" && node[propertyId].length === 0) {
          ERROR = "Missing property value at " + token + "!";
          return false;
        }
        if (token in node) {
          ERROR = "Duplicate property identifier " + token + "!";
          return false;
        }
        propertyId = token;
        node[propertyId] = [];
      } else {
        if (propertyId === "") {
          ERROR = "Missing property identifier at " + token + "!";
          return false;
        }
        node[propertyId].push(token.substring(1, token.length - 1));
      }
    }
  }
  tokens = processed;
  var stack = [], currentRoot = { sequence: [], leaves: [] }, lastRoot;
  for (i = 1, len = tokens.length; i < len - 1; ++i) {
    token = tokens[i];
    if (token == "(") {
      if (currentRoot.sequence.length === 0) {
        ERROR = "SGF contains a game tree without a sequence!";
        return false;
      }
      stack.push(currentRoot);
      currentRoot = { sequence: [], leaves: [] };
    } else if (token == ")") {
      if (currentRoot.sequence.length === 0) {
        ERROR = "SGF contains a game tree without a sequence!";
        return false;
      }
      lastRoot = currentRoot;
      currentRoot = stack.pop();
      currentRoot.leaves.push(lastRoot);
    } else {
      currentRoot.sequence.push(token);
    }
  }
  if (stack.length > 0) {
    ERROR = "Invalid number of parentheses in the SGF!";
    return false;
  }
  return currentRoot;
}
function recurseRecord(jrecord, gameTree, moveMarks) {
  for (var i = 0; i < gameTree.sequence.length; i++) {
    var node = gameTree.sequence[i], jnode = jrecord.createNode(true);
    for (var key in node) {
      if (node.hasOwnProperty(key)) {
        if (!(key in SGFProperties))
          continue;
        if (!SGFProperties[key](jnode, key, node[key], moveMarks)) {
          ERROR = "Error while parsing node " + key + ": " + ERROR;
          return false;
        }
      }
    }
  }
  for (i = 0; i < gameTree.leaves.length; i++) {
    var subTree = gameTree.leaves[i], snapshot;
    snapshot = jrecord.createSnapshot();
    if (!recurseRecord(jrecord, subTree, moveMarks))
      return false;
    jrecord.restoreSnapshot(snapshot);
  }
  return true;
}
function gameTreeToRecord(gameTree, moveMarks) {
  var jrecord, root = gameTree.sequence[0], width2 = 19, height2 = 19;
  if ("SZ" in root) {
    var size2 = root.SZ[0];
    if (size2.indexOf(":") != -1) {
      width2 = parseInt(size2.substring(0, size2.indexOf(":")));
      height2 = parseInt(size2.substr(size2.indexOf(":") + 1));
    } else width2 = height2 = parseInt(size2);
  }
  jrecord = new Record(width2, height2);
  if (!recurseRecord(jrecord, gameTree, moveMarks))
    return false;
  jrecord.first();
  return jrecord;
}
function load(sgf2, moveMarks) {
  var gameTree = parseSGF(sgf2);
  if (gameTree === false)
    return ERROR;
  if (gameTree.sequence.length === 0) {
    var ret = [];
    if (gameTree.leaves.length === 0)
      return "Empty game tree!";
    for (var i = 0; i < gameTree.leaves.length; i++) {
      var rec = gameTreeToRecord(gameTree, moveMarks);
      if (!rec)
        return ERROR;
      ret.push(rec);
    }
    return ret;
  }
  return gameTreeToRecord(gameTree, moveMarks);
}
const sgf = { load };
function parseMarkup(str) {
  var lines = str.split("\n"), data2 = [];
  for (var i = 0, len = lines.length; i < len; ++i) {
    var elems = [], line = lines[i];
    for (var j = 0, len2 = line.length; j < len2; ++j) {
      switch (line[j]) {
        case ".":
          elems.push({ type: JGO.CLEAR });
          break;
        case "o":
          elems.push({ type: JGO.WHITE });
          break;
        case "x":
          elems.push({ type: JGO.BLACK });
          break;
        case " ":
          break;
        // ignore whitespace
        default:
          if (!elems.length) break;
          if (elems[elems.length - 1].mark)
            elems[elems.length - 1].mark += line[j];
          else
            elems[elems.length - 1].mark = line[j];
      }
    }
    if (elems.length) data2.push(elems);
  }
  return data2;
}
function process(JGO, div) {
  var style, width, height, TL, BR;
  if (div.getAttribute("data-jgostyle")) {
    style = eval(div.getAttribute("data-jgostyle"));
  } else style = JGO.BOARD.medium;
  if (div.getAttribute("data-jgosize")) {
    var size = div.getAttribute("data-jgosize");
    if (size.indexOf("x") != -1) {
      width = parseInt(size.substring(0, size.indexOf("x")));
      height = parseInt(size.substr(size.indexOf("x") + 1));
    } else width = height = parseInt(size);
  }
  var data = parseMarkup(div.innerHTML);
  div.innerHTML = "";
  if (!width) {
    if (!data.length) return;
    height = data.length;
    width = data[0].length;
  }
  var jboard = new JGO.Board(width, height);
  var jsetup = new JGO.Setup(jboard, style);
  if (div.getAttribute("data-jgoview")) {
    var tup = div.getAttribute("data-jgoview").split("-");
    TL = jboard.getCoordinate(tup[0]);
    BR = jboard.getCoordinate(tup[1]);
  } else {
    TL = new JGO.Coordinate(0, 0);
    BR = new JGO.Coordinate(width - 1, height - 1);
  }
  jsetup.view(TL.i, TL.j, width - TL.i, height - TL.j);
  var c = new JGO.Coordinate();
  for (c.j = TL.j; c.j <= BR.j; ++c.j) {
    for (c.i = TL.i; c.i <= BR.i; ++c.i) {
      var elem = data[c.j - TL.j][c.i - TL.i];
      jboard.setType(c, elem.type);
      if (elem.mark) jboard.setMark(c, elem.mark);
    }
  }
  jsetup.create(div);
}
function init(document2, JGO2) {
  var matches = document2.querySelectorAll("div.jgoboard");
  for (var i = 0, len = matches.length; i < len; ++i)
    process(JGO2, matches[i]);
}
const auto = { init };
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
if (typeof window !== "undefined") {
  window.JGO = JGO;
}
exports.Board = Board;
exports.Canvas = Canvas;
exports.Coordinate = Coordinate;
exports.Node = Node;
exports.Notifier = Notifier;
exports.Record = Record;
exports.Setup = Setup;
exports.Stones = Stones;
exports.auto = auto;
exports.default = JGO;
exports.sgf = sgf;
exports.util = util;
//# sourceMappingURL=jgoboard.cjs.map
