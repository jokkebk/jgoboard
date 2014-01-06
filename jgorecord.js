var JGO = JGO || {};

JGO.util = JGO.util || {};

(function() {
    // Telephone dial style numbering
    var handicapPlaces = [[], [], [3,7], [3,7,9], [1,3,7,9], [1,3,5,7,9],
    [1,3,4,6,7,9], [1,3,4,5,6,7,9], [1,2,3,4,6,7,8,9], [1,2,3,4,5,6,7,8,9]];

    /**
    * Helper function to create coordinates for standard handicap placement.
    *
    * @param {int} size Board size (9, 13, 19 supported).
    * @param {itn} num Number of handicap stones.
    * @returns {Array} Array of JGO.Coordinate objects.
    */
    JGO.util.getHandicapCoordinates = function(size, num) {
        var places = handicapPlaces[num],
        offset = (size <= 9 ? 2 : 3),
        step = (size - 1) / 2 - offset, coords = [];

        if(places) for(var n=0; n<places.length; n++) {
            var i = (places[n]-1) % 3, j = Math.floor((places[n]-1) / 3);
            coords.push(new JGO.Coordinate(offset+i*step, offset+j*step));
        }

        return coords;
    };

    /**
    * Helper class to store node information, apply and revert changes easily.
    *
    * @param {JGO.Board} jboard Board object to make changes on.
    * @param {JGO.Node} parent Parent node or null if no parent.
    * @param {Object} info Node information - ko coordinate, comment, etc.
    */
    JGO.Node = function(jboard, parent, info) {
        this.jboard = jboard;
        this.parent = parent;
        this.info = info ? JGO.extend({}, info) : {};
        this.children = [];
        this.changes = [];

        if(parent) {
            parent.children.push(this); // register child
            this.captures = JGO.extend({}, parent.captures); // inherit
        } else {
            this.captures = {};
            this.captures[JGO.WHITE] = this.captures[JGO.BLACK] = 0;
        }
    };

    /**
    * Helper method to make changes to a board while saving them in the node.
    *
    * @param {Object} c JGO.Coordinate or array of them.
    * @param {int} val Type.
    */
    JGO.Node.prototype.setType = function(c, val) {
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
    * @param {Object} c JGO.Coordinate or array of them.
    * @param {int} val Mark.
    */
    JGO.Node.prototype.setMark = function(c, val) {
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
    JGO.Node.prototype.apply = function() {
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
    JGO.Node.prototype.revert = function() {
        for(var i=this.changes.length-1; i>=0; i--) {
            var item = this.changes[i];

            if('type' in item)
                this.jboard.setType(item.c, item.old);
            else
                this.jboard.setMark(item.c, item.old);
        }
    };

    /**
    * Create a go game record that can handle plays and variations. A JGO.Board
    * object is created that will reflect the current position in game record.
    *
    * @param {int} width Board width.
    * @param {int} height Board height.
    */
    JGO.Record = function(width, height) {
        this.jboard = new JGO.Board(width, height ? height : width);
        this.root = this.current = null;
        this.info = {}; // game information
    };

    /**
    * Get current node.
    *
    * @returns {JGO.Node} Current node.
    */
    JGO.Record.prototype.getCurrentNode = function() {
        return this.current;
    };

    /**
    * Create new empty node under current one.
    *
    * @param {Object} info Node information - ko coordinate, comment, etc.
    * @returns {JGO.Node} New, current node.
    */
    JGO.Record.prototype.createNode = function(options) {
        var node = new JGO.Node(this.jboard, this.current, options);

        if(this.root == null)
            this.root = node;

        return this.current = node;
    };

    /**
    * Advance to the next node in the game tree.
    *
    * @param {int} variation (Optional) parameter to specify which variation to select, if there are several branches
    * @returns {JGO.Node} New current node or null if at the end of game tree.
    */
    JGO.Record.prototype.next = function(variation) {
        if(this.current == null)
            return null;

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
    * @returns {JGO.Node} New current node or null if at the beginning of game tree.
    */
    JGO.Record.prototype.previous = function() {
        if(this.current == null || this.current.parent === null)
            return null; // empty or no parent

        this.current.revert(this.jboard);
        this.current = this.current.parent;

        return this.current;
    };


    /**
    * Go to the beginning of the game tree.
    *
    * @returns {JGO.Node} New current node.
    */
    JGO.Record.prototype.first = function() {
        this.current = this.root;
        this.jboard.clear();

        if(this.current != null)
            this.current.apply(this.jboard);

        return this.current;
    };

    /**
    * Create a snapshot of current JGO.Record state. Will contain board state and
    * current node.
    *
    * @returns Snapshot to be used with restoreSnapshot().
    */
    JGO.Record.prototype.createSnapshot = function() {
        return {jboard: this.jboard.getRaw(), current: this.current};
    }

    /**
    * Restore the JGO.Record to the state contained in snapshot. Use only if you
    * REALLY * know what you are doing, this is mainly for creating JGO.Record
    * quickly from SGF.
    *
    * @param {Object} Snapshot created with createSnapshot().
    */
    JGO.Record.prototype.restoreSnapshot = function(raw) {
        this.jboard.setRaw(raw.jboard);
        this.current = raw.current;
    };

})();
