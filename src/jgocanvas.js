// Import or create JGO namespace
var JGO = JGO || {};

(function() {
    'use strict';

    /**
     * Create a jGoBoard canvas object.
     *
     * @param {String} elem Container element id.
     * @param {Object} opt Options object.
     * @param {Object} img Image array.
     * @constructor
     * @memberof JGO
     */
    JGO.Canvas = function(elem, opt, img) {
        var container = document.getElementById(elem),
            canvas = document.createElement('canvas'),
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
         * Get board row based on y coordinate.
         * @param {number} y Coordinate.
         * @returns {number} The row.
         */
        this.getRow = function(y) {
            return Math.floor((y-canvas.offsetTop-self.marginTop-padTop)/opt.grid.y) + opt.view.yOffset;
        };

        /**
         * Get board column based on x coordinate.
         * @param {number} x Coordinate.
         * @returns {number} The column.
         */
        this.getColumn = function(x) {
            return Math.floor((x-canvas.offsetLeft-self.marginLeft-padLeft)/opt.grid.x) + opt.view.xOffset;
        };

        // Click handler will call all listeners passing the coordinate of click
        // and the click event
        canvas.onclick = function(ev) {
            var x = self.getRow(ev.pageX), y = self.getColumn(ev.pageY),
                c = new JGO.Coordinate(x,y),
                listeners = self.listeners.click;

            for(var l=0; l<listeners.length; l++)
                listeners[l].call(self, c.copy(), ev);
        };

        var moveLastX = -1, moveLastY = -1;

        // Move handler will call all listeners passing the coordinate of move
        // whenever mouse moves over a new intersection
        canvas.onmousemove = function(ev) {
            var x = self.getRow(ev.pageX), y = self.getColumn(ev.pageY),
                listeners = self.listeners.mousemove, c;

            if(x < self.opt.view.xOffset ||
                x >= self.opt.view.xOffset + self.opt.view.width)
                x = -1;

            if(y < self.opt.view.yOffset ||
                y >= self.opt.view.yOffset + self.opt.view.height)
                y = -1;

            if(moveLastX == x && moveLastY == y)
                return; // no change

            moveLastX = x;
            moveLastY = y;
            c = new JGO.Coordinate(x,y);

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

        container.appendChild(canvas);

        this.ctx = canvas.getContext('2d');
        this.opt = opt;
        this.img = img;

        // Fill margin with correct color
        this.ctx.rect(0, 0, canvas.width, canvas.height);
        this.ctx.fillStyle = opt.margin.color;
        this.ctx.fill();

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

        this.ctx.drawImage(img.board, 0, 0,
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
            if(opt.coordinates.top)
                this.ctx.fillText(JGO.COORDINATES[i + opt.view.xOffset],
                    this.gridLeft + opt.grid.x * i,
                this.marginTop / 2);
            if(opt.coordinates.bottom)
                this.ctx.fillText(JGO.COORDINATES[i + opt.view.xOffset],
                    this.gridLeft + opt.grid.x * i,
                    canvas.height - this.marginBottom / 2);
        }

        // Draw vertical coordinates
        for(i=0; i<opt.view.height; i++) {
            if(opt.coordinates.left)
                this.ctx.fillText(''+(opt.board.height-opt.view.yOffset-i),
            this.marginLeft / 2,
                this.gridTop + opt.grid.y * i);
            if(opt.coordinates.right)
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
    JGO.Canvas.prototype.getX = function(i) {
        return this.gridLeft + this.opt.grid.x * i;
    };

    /**
     * Get Y coordinate based on row.
     * @returns {number} Coordinate.
     */
    JGO.Canvas.prototype.getY = function(j) {
        return this.gridTop + this.opt.grid.y * j;
    };

    /**
     * Redraw canvas portion using a board.
     *
     * @param {JGO.Board} jboard Board object.
     * @param {number} i1 Starting column to be redrawn.
     * @param {number} j1 Starting row to be redrawn.
     * @param {number} i2 Ending column to be redrawn (inclusive).
     * @param {number} j2 Ending row to be redrawn (inclusive).
     */
    JGO.Canvas.prototype.draw = function(jboard, i1, j1, i2, j2) {
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
        var clearW = this.opt.stone.radius * 1.5,
            clearH = this.opt.stone.radius * 1.2,
            markX = this.opt.stone.radius * 1.1,
            markY = this.opt.stone.radius * 1.1,
            circleR = this.opt.stone.radius * 0.5,
            triangleR = this.opt.stone.radius * 0.9;

        // Clear grid for labels on clear intersections before casting shadows
        jboard.each(function(c, type, mark) {
            var ox = 0.5 + self.getX(c.i - self.opt.view.xOffset),
            oy = 0.5 + self.getY(c.j - self.opt.view.yOffset);

            if(type == JGO.CLEAR && mark && isLabel.test(mark))
                self.ctx.drawImage(self.img.board,
                    ox - self.marginLeft - clearW / 2,
                    oy - self.marginTop - clearH / 2,
                    clearW, clearH,
                    ox - clearW / 2,
                    oy - clearH / 2,
                clearW, clearH);
        }, i1, j1, i2, j2); // provide iteration limits

        // Shadows
        if(this.img.shadow) {
            jboard.each(function(c, type) {
                var ox = 0.5 + self.getX(c.i - self.opt.view.xOffset),
                    oy = 0.5 + self.getY(c.j - self.opt.view.yOffset);

                switch(type) {
                    case JGO.BLACK:
                    case JGO.WHITE:
                        self.ctx.drawImage(self.img.shadow,
                            self.opt.shadow.xOff + ox - self.img.shadow.width / 2,
                            self.opt.shadow.yOff + oy - self.img.shadow.height / 2);
                        break;
                }
            }, i1, j1, i2, j2); // provide iteration limits
        }

        // Stones and marks
        jboard.each(function(c, type, mark) {
            var ox = 0.5 + self.getX(c.i - self.opt.view.xOffset),
                oy = 0.5 + self.getY(c.j - self.opt.view.yOffset);
            var markColor, r;

            switch(type) {
                case JGO.DIM_BLACK:
                    self.ctx.globalAlpha=self.opt.stone.dimAlpha;
                    self.ctx.drawImage(self.img.black, ox - self.img.black.width / 2,
                    oy - self.img.black.height / 2);
                    markColor = self.opt.mark.blackColor; // if we have marks, self is the color
                    break;
                case JGO.BLACK:
                    self.ctx.globalAlpha=1;
                    self.ctx.drawImage(self.img.black, ox - self.img.black.width / 2,
                    oy - self.img.black.height / 2);
                    markColor = self.opt.mark.blackColor; // if we have marks, self is the color
                    break;
                case JGO.DIM_WHITE:
                    self.ctx.globalAlpha=self.opt.stone.dimAlpha;
                    self.ctx.drawImage(self.img.white, ox - self.img.white.width / 2,
                    oy - self.img.white.height / 2);
                    markColor = self.opt.mark.whiteColor; // if we have marks, self is the color
                    break;
                case JGO.WHITE:
                    self.ctx.globalAlpha=1;
                    self.ctx.drawImage(self.img.white, ox - self.img.white.width / 2,
                    oy - self.img.white.height / 2);
                    markColor = self.opt.mark.whiteColor; // if we have marks, self is the color
                    break;
                default:
                    self.ctx.globalAlpha=1;
                    markColor = self.opt.mark.clearColor; // if we have marks, self is the color
            }

            // Common settings to all markers
            self.ctx.lineWidth = self.opt.mark.lineWidth;
            self.ctx.strokeStyle = markColor;

            self.ctx.font = self.opt.mark.font;
            self.ctx.fillStyle = markColor;
            self.ctx.textAlign = 'center';
            self.ctx.textBaseline = 'middle';

            if(mark) {
                switch(mark) {
                    case JGO.MARK.SQUARE:
                        self.ctx.beginPath();
                        self.ctx.rect(ox - markX / 2, oy - markY / 2,
                        markX, markY);
                        self.ctx.stroke();
                        break;

                    case JGO.MARK.CROSS:
                        self.ctx.beginPath();
                        self.ctx.moveTo(ox - markX / 2, oy + markY / 2);
                        self.ctx.lineTo(ox + markX / 2, oy - markY / 2);
                        self.ctx.moveTo(ox - markX / 2, oy - markY / 2);
                        self.ctx.lineTo(ox + markX / 2, oy + markY / 2);
                        self.ctx.stroke();
                        break;

                    case JGO.MARK.TRIANGLE:
                        self.ctx.beginPath();
                        for(r=0; r<3; r++) {
                            self.ctx.moveTo(ox + triangleR * Math.cos(Math.PI * (0.5 + 2*r/3)),
                            oy - triangleR * Math.sin(Math.PI * (0.5 + 2*r/3)));
                            self.ctx.lineTo(ox + triangleR * Math.cos(Math.PI * (0.5 + 2*(r+1)/3)),
                            oy - triangleR * Math.sin(Math.PI * (0.5 + 2*(r+1)/3)));
                        }
                        self.ctx.stroke();
                        break;

                    case JGO.MARK.CIRCLE:
                        self.ctx.beginPath();
                        self.ctx.arc(ox, oy, circleR, 2*Math.PI, false);
                        self.ctx.stroke();
                        break;

                    case JGO.MARK.BLACK_TERRITORY:
                        self.ctx.globalAlpha=1;
                        self.ctx.drawImage(self.img.black, 0, 0,
                            self.img.black.width, self.img.black.height,
                            ox - self.img.black.width / 4,
                            oy - self.img.black.height / 4,
                        self.img.black.width / 2, self.img.black.height / 2);
                        break;

                    case JGO.MARK.WHITE_TERRITORY:
                        self.ctx.globalAlpha=1;
                        self.ctx.drawImage(self.img.white, 0, 0,
                            self.img.white.width, self.img.white.height,
                            ox - self.img.white.width / 4,
                            oy - self.img.white.height / 4,
                        self.img.white.width / 2, self.img.white.height / 2);
                        break;

                    case JGO.MARK.SELECTED:
                        self.ctx.globalAlpha=0.5;
                        self.ctx.fillStyle = '#8080FF';
                        //self.ctx.beginPath();
                        self.ctx.fillRect(ox - self.opt.grid.x / 2,
                            oy - self.opt.grid.y / 2,
                            self.opt.grid.x, self.opt.grid.y);
                        break;

                    default: // Label
                        // For clear intersections, grid is cleared before shadow cast
                        self.ctx.fillText(mark, ox, oy);
                        break;
                }
            }
        }, i1, j1, i2, j2); // provide iteration limits

        this.ctx.restore(); // also restores globalAlpha
    };

    /**
    * Add an event listener to canvas (click) events. The callback will be called
    * with 'this' referring to JGO.Canvas object, with coordinate and event
    * as parameters. Supported event types are 'click', 'mousemove', and
    * 'mouseout'. With 'mouseout', there is no coordinate parameter for callback.
    *
    * @param {String} event The event to listen to, e.g. 'click'.
    * @param {function} callback The callback.
    */
    JGO.Canvas.prototype.addListener = function(event, callback) {
        this.listeners[event].push(callback);
    };

})();
