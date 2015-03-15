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
