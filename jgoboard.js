/*!
 * jGoBoard v1.0
 * http://www.jgoboard.com/
 *
 * This software is licensed under a Creative Commons Attribution-NonCommercial 3.0 Unported License:
 * http://creativecommons.org/licenses/by-nc/3.0/
 * If you want to negotiate on a commercial license, please contact the author.
 *
 * Date: 2011-02-17
 */

// JGO constants
var JGO = {
    CLEAR: 0, // no stone
    BLACK: 1, // black stone
    WHITE: 2, // white stone
    DIM_BLACK: 3, // semi-transparent black stone
    DIM_WHITE: 4, // semi-transparent white stone

    NONE: '',
    SQUARE: '#',
    TRIANGLE: '/',
    CIRCLE: '0',
    CROSS: '*',
    BLACK_TERRITORY: ',',
    WHITE_TERRITORY: '.',

    BOARD: {}
};

var JGO_Letters = "ABCDEFGHJKLMNOPQRSTUVWXYZ".split('');
var JGO_SGFLetters = "abcdefghijklmnopqrstuvwxyz".split('');

/**
 * Create a helper class to create coordinates from (1,2) (zero-based),
 * "ah" type of input. You can create a coordinate with no arguments, in
 * which case it defaults to (0,0), or with one argument, in which case it
 * tries to parse "ai" type of string coordinate, or with two arguments, (i,j).
 * "J18" style coordinates depend on board size due to number running from
 * bottom, so those need to be instantiated from JGOBoard.getCoordinate.
 *
 * @param {int} i Column or SGF-style string (optional).
 * @param {int} j Row (optional).
 */
function JGOCoordinate(i, j) {
    if(i != undefined) {
        if(j != undefined) {
            this.i = i;
            this.j = j;
        } else { // try to parse coordinates from first parameter
            this.i = 0;
            this.j = 0;

            if(typeof i != "string")
                return;

            i = i.toLowerCase();

            if(i.substr(0,1).toUpperCase() == i.substr(0,1)) { // capital letter, assume "J18" type
            } else { // assume SGF-type coordinate
                this.i = JGO_SGFLetters.indexOf(i.substr(0,1));
                this.j = JGO_SGFLetters.indexOf(i.substr(1));
            }
        }
    } else { // called without both parameters
        this.i = 0;
        this.j = 0;
    }
}

/**
 * Compare with another coordinate.
 *
 * @param {JGOCoordinate} Coordinate.
 * @returns {boolean} true if equal, false if not.
 */
JGOCoordinate.prototype.equals = function(c) {
    return (c.i == this.i) && (c.j == this.j);
};

/**
 * Make an SGF-type "ai" string representation of the coordinate.
 *
 * @returns {string} representation
 */
JGOCoordinate.prototype.toString = function() {
    return JGO_SGFLetters[this.i] + JGO_SGFLetters[this.j];
};

/**
 * Make a copy of this coordinate.
 *
 * @returns {JGOCoordinate} A copy of this coordinate
 */
JGOCoordinate.prototype.copy = function() {
    return new JGOCoordinate(this.i, this.j);
};

/**
 * Go board class for storing intersection states. Also has listeners that
 * are notified on any changes to the board via setType() and setMark().
 *
 * @param {int} width The width of the board
 * @param {int} height The height of the board (optional)
 */
function JGOBoard(width, height) {
    this.width = width;

    if(height != undefined)
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
            markArr.push(JGO.NONE);
        }

        this.stones.push(stoneArr);
        this.marks.push(markArr);
    }
}

/**
 * Add listener to the board. Listeners are called in the context of board
 * object and passed coordinate, new value and old value as parameters when
 * changes happen.
 *
 * @param {func} typef A type change listener callback.
 * @param {func} markf A mark change listener callback.
 */
JGOBoard.prototype.addListener = function(typef, markf) {
    this.listeners.push({type: typef, mark: markf});
};

/**
 * Create coordinate from "J18" type of notation that depend from board size.
 *
 * @param {string} s The coordinate string.
 */
JGOBoard.prototype.getCoordinate = function(s) {
    return new JGOCoordinate(JGO_Letters.indexOf(s.toUpperCase().substr(0,1)),
                             this.height - parseInt(s.substr(1)));
}

/**
 * Make a human readable "J18" type string representation of the coordinate.
 *
 * @param {JGOCoordinate} c Coordinate.
 * @returns {string} representation.
 */
JGOBoard.prototype.toString = function(c) {
    return JGO_Letters[c.i] + (this.height-c.j);
}

/**
 * Simple iteration over all coordinates.
 *
 * @param {func} func The iterator method, which is called with the coordinate
 * and intersection object.
 * @param {int} i1 Optional colunm start.
 * @param {int} j1 Optional row start.
 * @param {int} i2 Optional colunm end.
 * @param {int} j2 Optional row end.
 * context of board object and passed coordinate and newVal as parameter.
 */
JGOBoard.prototype.each = function(func, i1, j1, i2, j2) {
    var c = new JGOCoordinate();

    if(!i1) i1 = 0;
    if(!j1) j1 = 0;
    if(!i2) i2 = this.width-1;
    if(!j2) j2 = this.height-1;

    for(c.j=j1; c.j<=j2; c.j++)
        for(c.i=i1; c.i<=i2; c.i++)
            func.call(this, c.copy(),
                      this.stones[c.i][c.j], this.marks[c.i][c.j]);
}

/**
 * Clear board.
 */
JGOBoard.prototype.clear = function() {
    this.each(function(c) {
        this.setType(c, JGO.CLEAR);
        this.setMark(c, JGO.NONE);
    });
};

/**
 * Set the intersection type at given coordinate(s).
 *
 * @param {Object} c A JGOCoordinate or Array of them.
 * @param {Object} t New type, e.g. JGO.CLEAR, JGO.BLACK, ...
 */
JGOBoard.prototype.setType = function(c, t) {
    if(c instanceof JGOCoordinate) {
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
 * @param {Object} c A JGOCoordinate or Array of them.
 * @param {Object} m New mark, e.g. JGO.NONE, JGO.TRIANGLE, ...
 */
JGOBoard.prototype.setMark = function(c, m) {
    if(c instanceof JGOCoordinate) {
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
 * @param {Object} c A JGOCoordinate or an Array of them.
 * @returns {Object} Type or array of types.
 */
JGOBoard.prototype.getType = function(c) {
    var ret;
    if(c instanceof JGOCoordinate) {
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
 * @param {Object} c A JGOCoordinate or an Array of them.
 * @returns {Object} Mark or array of marks.
 */
JGOBoard.prototype.getMark = function(c) {
    var ret;
    if(c instanceof JGOCoordinate) {
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
 * @param {JGOCoordinate} c The coordinate
 * @returns {Array} The array of adjacent coordinates of given type (may be an empty array)
 */
JGOBoard.prototype.getAdjacent = function(c, s) {
    var coordinates = [], i = c.i, j = c.j;

    if(i>0)
        coordinates.push(new JGOCoordinate(i-1, j));
    if(i+1<this.width)
        coordinates.push(new JGOCoordinate(i+1, j));
    if(j>0)
        coordinates.push(new JGOCoordinate(i, j-1));
    if(j+1<this.height)
        coordinates.push(new JGOCoordinate(i, j+1));

    return coordinates;
};

/**
 * Filter coordinates based on intersection type.
 *
 * @param {Object} c An array of JGOCoordinates.
 * @param {Object} t A type filter (return only matching type).
 * @returns {Object} Object with attributes 'type' and 'mark', array or false.
 */
JGOBoard.prototype.filter = function(c, t) {
    var ret = [];
    for(var i=0, len=c.length; i<len; ++i)
        if(this.stones[c[i].i][c[i].j] == t)
            ret.push(c);
    return ret;
};

/**
 * Check if coordinates contain given type.
 *
 * @param {Object} c An array of JGOCoordinates.
 * @param {Object} t A type filter (return only matching type).
 * @returns {bool} True or false.
 */
JGOBoard.prototype.hasType = function(c, t) {
    for(var i=0, len=c.length; i<len; ++i)
        if(this.stones[c[i].i][c[i].j] == t)
            return true;
    return false;
};

/**
 * Search all intersections of similar type, return group and edge coordinates.
 *
 * @param {JGOCoordinate} coord The coordinate from which to start search.
 * @returns {Object} Two arrays of coordinates in members 'group' and 'neighbors'.
 */
JGOBoard.prototype.getGroup = function(coord) {
    var type = this.getType(coord), seen = {}, // seen coordinates
        group = [], neighbors = [], // liberties/adjacent stones
        queue = [coord.copy()], // queue of coordinates to check
        self = this;

    do {
        var newQueue = [];

        while(queue.length) {
            var c = queue.shift();

            if(c.toString() in seen) 
                continue; // seen already
            else
                seen[c.toString()] = true; // seen now

            if(this.getType(c) == type) { // check if type is correct
                group.push(c);
                newQueue = newQueue.concat(this.getAdjacent(c)); // prospects
            } else
                neighbors.push(c);
        }

        queue = newQueue;
    } while(queue.length);

    return {group: group, neighbors: neighbors};
};
