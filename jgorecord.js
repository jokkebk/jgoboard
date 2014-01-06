// Telephone dial style numbering
var JGO_HandicapPlaces = [[], [], [3,7], [3,7,9], [1,3,7,9], [1,3,5,7,9],
    [1,3,4,6,7,9], [1,3,4,5,6,7,9], [1,2,3,4,6,7,8,9], [1,2,3,4,5,6,7,8,9]];

/**
 * Helper function to create coordinates for standard handicap placement.
 *
 * @param {int} size Board size (9, 13, 19 supported).
 * @param {itn} num Number of handicap stones.
 * @returns {Array} Array of JGOCoordinate objects.
 */
function JGO_GenerateHandicap(size, num) {
    var places = JGO_HandicapPlaces[num],
        offset = (size <= 9 ? 2 : 3),
        step = (size - 1) / 2 - offset, coords = [];

    if(places) for(var n=0; n<places.length; n++) {
        var i = (places[n]-1) % 3, j = Math.floor((places[n]-1) / 3);
        coords.push(new JGOCoordinate(offset+i*step, offset+j*step));
    }

    return coords;
}

/**
 * Helper class to store node information, apply and revert changes easily.
 * Should not be accessed directly from user code!
 *
 * @param {JGOBoard} Board object to make changes on.
 * @param {JGONode} parent Parent node (or null if none)
 */
function JGONode(jboard, parent) {
    this.jboard = jboard;
    this.type = JGO.NONE; // default for edits

    this.parent = parent ? parent : null;
    this.children = [];

    this.ko = false; // no ko by default
    this.comment = '';

    this.changes = [];

    if(!parent) {
        this.captures = {};
        this.captures[JGO.WHITE] = this.captures[JGO.BLACK] = 0;
    } else
        this.captures = JGO_extend({}, parent.captures); // copy
}

/**
 * Helper method to make changes to a board while saving them in the node.
 *
 * @param {Object} c JGOCoordinate or array of them.
 * @param {int} val Type.
 */
JGONode.prototype.setType = function(c, val) {
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
 * @param {Object} c JGOCoordinate or array of them.
 * @param {int} val Mark.
 */
JGONode.prototype.setMark = function(c, val) {
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
 * Helper method to set handicap stones. Should only be called for root node!
 *
 * @param {int} handi Amount of handicap stones (0-9).
 */
JGONode.prototype.setHandicap = function(handi) {
    var coords = JGO_GenerateHandicap(this.jboard.width, handi);
    this.setType(coords, JGO.BLACK);
};

/**
 * Make a move on the board and capture stones if necessary. Understands ko.
 *
 * @param {JGOCoordinate} coord Coordinate to play or null for pass.
 * @param {int} stone Stone to play - JGO.BLACK or JGO.WHITE.
 * @returns {boolean} True if move was successful, false if not.
 */
JGONode.prototype.play = function(coord, stone) {
    var oppType = (stone == JGO.BLACK ? JGO.WHITE : JGO.BLACK),
        captures = 0, adj, ko;

    if(this.changes.length) // cannot play after edits in the same node!
        return false;

    this.type = stone; // alter node type automatically

    if(!coord) // pass
        return true;

    if(this.jboard.getType(coord) != JGO.CLEAR)
        return false; // cannot play on existing stone

    if(this.parent && this.parent.ko && coord.equals(this.parent.ko))
        return false; // cannot retake ko immediately

    // First change in node is the stone played
    this.setType(coord, stone);

    if(this.parent && this.parent.ko) // clear ko mark
        this.setMark(this.current.ko, JGO.NONE);

    adj = this.jboard.getAdjacent(coord); // find adjacent coordinates

    for(var i=0; i<adj.length; i++) {
        var c = adj[i];

        if(this.jboard.getType(c) == oppType) {
            var g = this.jboard.getGroup(c);

            if(!this.jboard.hasType(g.neighbors, JGO.CLEAR)) {
                this.setType(g.group, JGO.CLEAR);
                captures += g.group.length;
                if(captures == 1) // store potential coordinate for ko
                    ko = g.group[0];
            }
        }
    }

    // Suicide not allowed
    if(!captures && !this.jboard.hasType(this.jboard.getGroup(coord).neighbors, JGO.CLEAR)) {
        this.revert(this.jboard);
        this.changes = []; // clear node
        return false;
    }

    if(captures == 1 && this.jboard.filter(adj, JGO.CLEAR).length == 1) {
        this.ko = ko.copy(); // Ko detected
        this.setMark(ko, JGO.CIRCLE); // mark ko
    }

    this.captures[stone] += captures;

    return true;
};

/**
 * Apply changes of this node to board.
 */
JGONode.prototype.apply = function() {
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
JGONode.prototype.revert = function() {
    for(var i=this.changes.length-1; i>=0; i--) {
        var item = this.changes[i];

        if('type' in item)
            this.jboard.setType(item.c, item.old);
        else
            this.jboard.setMark(item.c, item.old);
    }
};

/**
 * Create a go game record that can handle plays and variations. A JGOBoard
 * object is created that will reflect the current position in game record.
 *
 * @param {int} width Board width.
 * @param {int} height Board height.
 */
function JGORecord(width, height) {
    this.jboard = new JGOBoard(width, height ? height : width);
    this.root = this.current = new JGONode(this.jboard);
    this.info = {}; // game information
}

/**
 * Get current node.
 *
 * @returns {JGONode} Current node.
 */
JGORecord.prototype.getCurrentNode = function() {
    return this.current;
}

/**
 * Create new empty node under current one.
 *
 * @returns {JGONode} New, current node.
 */
JGORecord.prototype.createNode = function() {
    var node = new JGONode(this.jboard, this.current);

    return this.current = node;
}

/**
 * Advance to the next node in the game tree.
 *
 * @param {int} variation (Optional) parameter to specify which variation to select, if there are several branches
 * @returns {JGONode} New current node or null if at the end of game tree.
 */
JGORecord.prototype.next = function(variation) {
    if(!variation)
        variation = 0

    if(variation >= this.current.children.length)
        return null;

    this.current = this.current.children[variation];
    this.current.apply(this.jboard);

    return this.current;
};

/**
 * Back up a node in the game tree.
 *
 * @returns {JGONode} New current node or null if at the beginning of game tree.
 */
JGORecord.prototype.previous = function() {
    if(this.current.parent === null) // no parent
        return null;

    this.current.revert(this.jboard);
    this.current = this.current.parent;

    return this.current;
}


/**
 * Go to the beginning of the game tree.
 *
 * @returns {JGONode} New current node.
 */
JGORecord.prototype.first = function() {
    this.current = this.root;
    this.jboard.clear();
    this.current.apply(this.jboard);

    return this.current;
}

/**
 * Get a snapshot of current JGORecord state. Will contain board state and
 * current node.
 *
 * @returns Snapshot to be used with restoreSnapshot().
 */
JGORecord.prototype.getSnapshot = function() {
    return {jboard: this.jboard.getRaw(), current: this.current};
}

/**
 * Set a JGORecord to the state contained in snapshot. Use only if you REALLY
 * know what you are doing, this is mainly for creating JGORecord quickly
 * from SGF.
 *
 * @param {Object} Snapshot created with getSnapshot().
 */
JGORecord.prototype.setSnapshot = function(raw) {
    this.jboard.setRaw(raw.jboard);
    this.current = raw.current;
}
