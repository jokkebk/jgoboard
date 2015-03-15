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
  this.notifier = new Notifier(board); // board change tracker
  this.options = util.extend(defaults, boardOptions); // clone

  // Creating these is postponed until create() or createTree() is called
  this.stones = false; // stone drawing facility (Stones)
  this.boardTexture = false; // board texture
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
 * @param {String} elemId The element where to create the canvas in.
 * @param {function} readyFn Function to call with canvas once it is ready.
 */
Setup.prototype.create = function(elemId, readyFn) {
  var self = this, options = util.extend({}, this.options), instFn;

  instFn = function(images) {
    var jcanvas;

    // Stone drawing facility
    self.stones = new Stones(images, options);
    self.boardTexture = images.board;

    jcanvas = new Canvas(elemId, options, self.stones, self.boardTexture);
    jcanvas.draw(self.board, 0, 0, self.board.width-1, self.board.height-1);

    self.notifier.addCanvas(jcanvas); // add canvas to listener

    if(readyFn) readyFn(jcanvas);
  };

  if(this.options.textures) // at least some textures exist
    util.loadImages(this.options.textures, instFn);
  else // blain BW board
    instFn({black:false,white:false,shadow:false,board:false});
};

module.exports = Setup;
