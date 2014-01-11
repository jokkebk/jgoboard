// Import or create JGO namespace
var JGO = JGO || {};

(function() {
    'use strict';

    /**
    * Go board class for storing intersection states. Also has listeners that
    * are notified on any changes to the board via setType() and setMark().
    *
    * @param {int} width The width of the board
    * @param {int} [height] The height of the board
    * @memberof JGO
    * @constructor
    */
    JGO.Board = function(width, height) {
        this.width = width;

        if(height !== undefined)
            this.height = height;
        else
            this.height = this.width;

        this.listeners = [];

        this.stones = [];
        this.marks = [];

        // Initialize stones and marks
        for(var i=0; i<this.width; ++i) {
            var stoneArr = [], markArr = [];

            for(var j=0; j<this.height; ++j) {
                stoneArr.push(JGO.CLEAR);
                markArr.push(JGO.MARK.NONE);
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
    JGO.Board.prototype.addListener = function(typef, markf) {
        this.listeners.push({type: typef, mark: markf});
    };

    /**
    * Create coordinate from "J18" type of notation that depend from board size.
    *
    * @param {string} s The coordinate string.
    */
    JGO.Board.prototype.getCoordinate = function(s) {
        return new JGO.Coordinate(JGO.COORDINATES.indexOf(s.toUpperCase().substr(0,1)),
        this.height - parseInt(s.substr(1)));
    };

    /**
    * Make a human readable "J18" type string representation of the coordinate.
    *
    * @param {JGO.Coordinate} c Coordinate.
    * @returns {string} representation.
    */
    JGO.Board.prototype.toString = function(c) {
        return JGO.COORDINATES[c.i] + (this.height-c.j);
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
    JGO.Board.prototype.each = function(func, i1, j1, i2, j2) {
        var c = new JGO.Coordinate();

        if(!i1) i1 = 0;
        if(!j1) j1 = 0;
        if(!i2) i2 = this.width-1;
        if(!j2) j2 = this.height-1;

        for(c.j=j1; c.j<=j2; c.j++)
            for(c.i=i1; c.i<=i2; c.i++)
                func.call(this, c.copy(),
                this.stones[c.i][c.j], this.marks[c.i][c.j]);
    };

    /**
    * Clear board.
    */
    JGO.Board.prototype.clear = function() {
        this.each(function(c) {
            this.setType(c, JGO.CLEAR);
            this.setMark(c, JGO.MARK.NONE);
        });
    };

    /**
    * Set the intersection type at given coordinate(s).
    *
    * @param {Object} c A JGO.Coordinate or Array of them.
    * @param {Object} t New type, e.g. JGO.CLEAR, JGO.BLACK, ...
    */
    JGO.Board.prototype.setType = function(c, t) {
        if(c instanceof JGO.Coordinate) {
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
    * @param {Object} c A JGO.Coordinate or Array of them.
    * @param {Object} m New mark, e.g. JGO.MARK.NONE, JGO.MARK.TRIANGLE, ...
    */
    JGO.Board.prototype.setMark = function(c, m) {
        if(c instanceof JGO.Coordinate) {
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
    * @param {Object} c A JGO.Coordinate or an Array of them.
    * @returns {Object} Type or array of types.
    */
    JGO.Board.prototype.getType = function(c) {
        var ret;

        if(c instanceof JGO.Coordinate) {
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
    * @param {Object} c A JGO.Coordinate or an Array of them.
    * @returns {Object} Mark or array of marks.
    */
    JGO.Board.prototype.getMark = function(c) {
        var ret;

        if(c instanceof JGO.Coordinate) {
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
    * @param {JGO.Coordinate} c The coordinate
    * @returns {Array} The array of adjacent coordinates of given type (may be an empty array)
    */
    JGO.Board.prototype.getAdjacent = function(c) {
        var coordinates = [], i = c.i, j = c.j;

        if(i>0)
            coordinates.push(new JGO.Coordinate(i-1, j));
        if(i+1<this.width)
            coordinates.push(new JGO.Coordinate(i+1, j));
        if(j>0)
            coordinates.push(new JGO.Coordinate(i, j-1));
        if(j+1<this.height)
            coordinates.push(new JGO.Coordinate(i, j+1));

        return coordinates;
    };

    /**
    * Filter coordinates based on intersection type.
    *
    * @param {Object} c An array of JGO.Coordinates.
    * @param {Object} t A type filter (return only matching type).
    * @returns {Object} Object with attributes 'type' and 'mark', array or false.
    */
    JGO.Board.prototype.filter = function(c, t) {
        var ret = [];
        for(var i=0, len=c.length; i<len; ++i)
            if(this.stones[c[i].i][c[i].j] == t)
                ret.push(c);
        return ret;
    };

    /**
    * Check if coordinates contain given type.
    *
    * @param {Object} c An array of JGO.Coordinates.
    * @param {Object} t A type filter (return only matching type).
    * @returns {bool} True or false.
    */
    JGO.Board.prototype.hasType = function(c, t) {
        for(var i=0, len=c.length; i<len; ++i)
            if(this.stones[c[i].i][c[i].j] == t)
                return true;
        return false;
    };

    /**
    * Search all intersections of similar type, return group and edge coordinates.
    *
    * @param {JGO.Coordinate} coord The coordinate from which to start search.
    * @param {int} [overrideType] Treat current coordinate as this type.
    * @returns {Object} Two arrays of coordinates in members 'group' and 'neighbors'.
    */
    JGO.Board.prototype.getGroup = function(coord, overrideType) {
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
    JGO.Board.prototype.getRaw = function() {
        return {
            width: this.width,
            height: this.height,
            stones: JGO.extend({}, this.stones),
            marks: JGO.extend({}, this.marks)
        };
    };

    /**
    * Set a raw copy of board contents. Will not change or call any listeners!
    *
    * @param {Object} raw Board contents.
    */
    JGO.Board.prototype.setRaw = function(raw) {
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
    * @param {JGO.Board} jboard Board to play the move on (stays unchanged).
    * @param {JGO.Coordinate} coord Coordinate to play or null for pass.
    * @param {int} stone Stone to play - JGO.BLACK or JGO.WHITE.
    * @param {JGO.Coordinate} [ko] Coordinate of previous ko.
    * @returns {Object} Move result data structure.
    */
    JGO.Board.prototype.playMove = function(coord, stone, ko) {
        var oppType = (stone == JGO.BLACK ? JGO.WHITE : JGO.BLACK),
            captures = [], adjacent;

        if(!coord) // pass
            return { success: true, captures: [], ko: false };

        if(this.getType(coord) != JGO.CLEAR)
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

                if(this.filter(g.neighbors, JGO.CLEAR).length == 1)
                    captures = captures.concat(g.group);
            }
        }

        // Suicide not allowed
        if(captures.length === 0 &&
            !this.hasType(this.getGroup(coord, stone).neighbors, JGO.CLEAR))
            return { success: false,
                errorMsg: 'Suicide is not allowed!' };

        // Check for ko. Note that captures were not removed so there should
        // be zero liberties around this stone in case of a ko.
        if(captures.length == 1 && !this.filter(adjacent, JGO.CLEAR).length)
            return { success: true, captures: captures, ko: captures[0].copy() };

        return { success: true, captures: captures, ko: false };
    };
})();
