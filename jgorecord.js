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
 * @param {int} type Move type - JGO.BLACK, JGO.WHITE or JGO.NONE for edits.
 * @param {JGONode} parent Parent node (or null if none)
 */
function JGONode(type, parent) {
    this.type = type;

    this.parent = parent;
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
 * @param {JGOBoard} jboard Board.
 * @param {Object} c JGOCoordinate or array of them.
 * @param {int} val Type.
 */
JGONode.prototype.setType = function(jboard, c, val) {
    if(c instanceof Array) {
        for(var i=0, len=c.length; i<len; ++i)
            this.setType(jboard, c[i], val); // avoid repeating ourselves
        return;
    }

    // Store both change and previous value to enable reversion
    this.changes.push({c: c.copy(), type: val, old: jboard.getType(c)});
    jboard.setType(c, val);
};

/**
 * Helper method to make changes to a board while saving them in the node.
 *
 * @param {JGOBoard} jboard Board.
 * @param {Object} c JGOCoordinate or array of them.
 * @param {int} val Mark.
 */
JGONode.prototype.setMark = function(jboard, c, val) {
    if(c instanceof Array) {
        for(var i=0, len=c.length; i<len; ++i)
            this.setMark(jboard, c[i], val); // avoid repeating ourselves
        return;
    }

    // Store both change and previous value to enable reversion
    this.changes.push({c: c.copy(), mark: val, old: jboard.getMark(c)});
    jboard.setMark(c, val);
};

/**
 * Apply changes of this node to board.
 *
 * @param {JGOBoard} jboard Board.
 */
JGONode.prototype.apply = function(jboard) {
    for(var i=0; i<this.changes.length; i++) {
        var item = this.changes[i];

        if('type' in item)
            jboard.setType(item.c, item.type);
        else
            jboard.setMark(item.c, item.mark);
    }
};

/**
 * Revert changes of this node to board.
 *
 * @param {JGOBoard} jboard Board.
 */
JGONode.prototype.revert = function(jboard) {
    for(var i=this.changes.length-1; i>=0; i--) {
        var item = this.changes[i];

        if('type' in item)
            jboard.setType(item.c, item.old);
        else
            jboard.setMark(item.c, item.old);
    }
};

/**
 * Create a go game record that can handle plays and variations. Current
 * position is reflected in JGOBoard object passed as parameter to constructor.
 */
function JGORecord(jboard) {
    this.jboard = jboard;
    this.nextMove = JGO.BLACK;
    this.root = this.current = new JGONode(JGO.NONE, null);
}

/**
 * Set handicap stones. Only possible when no subnodes exist yet at tree root.
 *
 * @param {JGOCoordinate} coords Coordinates for handi stones.
 */
JGORecord.prototype.setHandicap = function(coords) {
    if(this.current != this.root || this.root.children.length)
        return;

    this.root.setType(this.jboard, coords, JGO.BLACK);
    this.nextMove = JGO.WHITE;
};

/**
 * Make a move on the board and capture stones if necessary. Creates a new
 * node to game tree.
 *
 * @param {JGOCoordinate} coord Coordinate to play or null for pass.
 * @param {int} stone Stone to play - JGO.BLACK or JGO.WHITE (optional).
 * @returns {boolean} True if move was successful, false if not.
 */
JGORecord.prototype.play = function(coord, stone) {
    var oppType, node, captures = 0, adj, ko;

    if(!stone)
        stone = this.nextMove;

    oppType = (stone == JGO.BLACK ? JGO.WHITE : JGO.BLACK);

    if(this.jboard.getType(coord) != JGO.CLEAR)
        return false;

    node = new JGONode(stone, this.current);

    if(this.current.ko) {
        if(coord && coord.equals(this.current.ko))
            return false;
        else // clear ko
            node.setMark(this.jboard, this.current.ko, JGO.NONE);
    }

    if(coord) { // not a pass
        node.setType(this.jboard, coord, stone);

        adj = this.jboard.getAdjacent(coord); // find adjacent coordinates

        for(var i=0; i<adj.length; i++) {
            var c = adj[i];

            if(this.jboard.getType(c) == oppType) {
                var g = this.jboard.getGroup(c);

                if(!this.jboard.hasType(g.neighbors, JGO.CLEAR)) {
                    node.setType(this.jboard, g.group, JGO.CLEAR);
                    captures += g.group.length;
                    if(captures == 1) // store potential coordinate for ko
                        ko = g.group[0];
                }
            }
        }

        // Suicide not allowed
        if(!captures && !this.jboard.hasType(this.jboard.getGroup(coord).neighbors, JGO.CLEAR)) {
            node.revert(this.jboard);
            return false;
        }

        if(captures == 1 && this.jboard.filter(adj, JGO.CLEAR).length == 1) {
            node.ko = ko.copy(); // Ko detected
            node.setMark(this.jboard, ko, JGO.CIRCLE); // mark ko
        }

        node.captures[stone] += captures;
    }

    // Record new node
    this.current.children.push(node);
    this.current = node;
    this.nextMove = oppType;

    return true;
};


/**
 * Advance to the next node in the game tree.
 *
 * @param {int} variation (Optional) parameter to specify which variation to select, if there are several branches
 * @returns {boolean} True if advance was successful, false if we are at the end of the current variation
 */
JGORecord.prototype.next = function(variation) {
    if(!variation)
        variation = 0

    if(variation >= this.current.children.length)
        return false;

    this.current = this.current.children[variation];
    this.current.apply(this.jboard);

    return true;
};

/**
 * Back up a node in the game tree.
 *
 * @returns {boolean} True if successful, false if we are at the beginning of the game tree
 */
JGORecord.prototype.previous = function() {
    if(this.current.parent === null) // no parent
        return false;

    this.current.revert(this.jboard);
    this.current = this.current.parent;

    return true;
}


/**
 * Go to the beginning of the game tree.
 */
JGORecord.prototype.first = function() {
    this.current = this.root;
    this.jboard.clear();
    this.current.apply(this.jboard);
}

