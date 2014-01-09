// Import or create JGO namespace
var JGO = JGO || {};

(function() {
    'use strict';

    /**
    * Helper class to store node information, apply and revert changes easily.
    *
    * @param {JGO.Board} jboard Board object to make changes on.
    * @param {JGO.Node} parent Parent node or null if no parent.
    * @param {Object} info Node information - ko coordinate, comment, etc.
    * @constructor
    * @memberof JGO
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

})();
