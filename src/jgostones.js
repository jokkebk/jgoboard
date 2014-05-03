// Import or create JGO namespace
var JGO = JGO || {};

(function() {
    'use strict';

    /**
     * Create a jGoBoard stones object. This is a facility that can draw
     * stones and markers on a HTML5 canvas. Only used internally by the
     * library.
     *
     * @param {Object} img Image array.
     * @constructor
     * @memberof JGO
     */
    JGO.Stones = function(img, options) {
        var me = this;

        this.stoneR = options.stone.radius;
        this.gridX = options.grid.x;
        this.gridY = options.grid.x;
        this.markX = this.stoneR * 1.1;
        this.markY = this.stoneR * 1.1;
        this.circleR = this.stoneR * 0.5;
        this.triangleR = this.stoneR * 0.9;

        // Create black and white
        if(img.white && img.black) {
            this.drawStone = function(ctx, type, ox, oy, scale) {
                var stone = type == JGO.BLACK ? img.black : img.white;

                if(scale) {
                    ctx.drawImage(stone, 0, 0, stone.width, stone.height,
                                  ox - stone.width / 2 * scale,
                                  oy - stone.height / 2 * scale,
                                  stone.width * scale, stone.height * scale);
                } else {
                    ctx.drawImage(stone, ox - stone.width / 2,
                                  oy - stone.height / 2);
                }
            };

            if(img.shadow) {
                this.drawShadow = function(ctx, ox, oy, scale) {
                    var stone = img.shadow;

                    if(scale) {
                        ctx.drawImage(stone, 0, 0, stone.width, stone.height,
                                      ox - stone.width / 2 * scale,
                                      oy - stone.height / 2 * scale,
                                      stone.width * scale, stone.height * scale);
                    } else {
                        ctx.drawImage(stone, ox - stone.width / 2,
                                      oy - stone.height / 2);
                    }
                };
            } else {
                this.drawShadow = false;
            }
        } else {
            this.drawStone = function(ctx, type, ox, oy, scale) {
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(ox, oy, me.stoneR*scale, 2*Math.PI, false);
                ctx.fill();

                if(type == JGO.WHITE) {
                    ctx.strokeStyle = '#000000';
                    ctx.stroke();
                }
            };

            this.drawShadow = false;
        }
    };

    JGO.Stones.prototype.drawMark = function(ctx, mark, ox, oy) {
        switch(mark) {
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
                for(var r=0; r<3; r++) {
                    ctx.moveTo(ox + this.triangleR * Math.cos(Math.PI * (0.5 + 2*r/3)),
                               oy - this.triangleR * Math.sin(Math.PI * (0.5 + 2*r/3)));
                    ctx.lineTo(ox + this.triangleR * Math.cos(Math.PI * (0.5 + 2*(r+1)/3)),
                               oy - this.triangleR * Math.sin(Math.PI * (0.5 + 2*(r+1)/3)));
                }
                ctx.stroke();
                break;

            case JGO.MARK.CIRCLE:
                ctx.beginPath();
                ctx.arc(ox, oy, this.circleR, 2*Math.PI, false);
                ctx.stroke();
                break;

            case JGO.MARK.BLACK_TERRITORY:
                ctx.globalAlpha=1;
                this.drawStone(ctx, JGO.BLACK, ox, oy, 0.5);
                break;

            case JGO.MARK.WHITE_TERRITORY:
                ctx.globalAlpha=1;
                this.drawStone(ctx, JGO.WHITE, ox, oy, 0.5);
                break;

            case JGO.MARK.SELECTED:
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
})();
