// Import or create JGO namespace
var JGO = JGO || {};

(function() {

    /**
    * Create a go game record that can handle plays and variations. A JGO.Board
    * object is created that will reflect the current position in game record.
    *
    * @param {int} width Board width.
    * @param {int} height Board height.
    * @constructor
    * @memberof JGO
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
