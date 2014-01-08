// Import or create JGO namespace
var JGO = JGO || {};

(function() {

    /**
    * A change notifier class that can listen to changes in a JGO.Board and keep
    * multiple JGO.Canvas board views up to date.
    *
    * @param {JGO.Board} jboard The board to listen to.
    */
    JGO.Notifier = function(jboard) {
        var self = this;
        var changeFunc = function(coord) {
            if(self.changed) { // not the first change
                self.min.i = Math.min(self.min.i, coord.i);
                self.min.j = Math.min(self.min.j, coord.j);
                self.max.i = Math.max(self.max.i, coord.i);
                self.max.j = Math.max(self.max.j, coord.j);
                return;
            }

            self.min = coord.copy();
            self.max = coord.copy();
            self.changed = true;

            setTimeout(function() { // schedule update in the end
                for(var c=0; c<self.canvases.length; c++)
                    self.canvases[c].draw(jboard, self.min.i, self.min.j,
                    self.max.i, self.max.j);
                    self.changed = false; // changes updated, scheduled function run
            }, 0);
        };

        this.changed = false; // indicator to set on first change
        this.canvases = []; // canvases to notify on changes

        jboard.addListener(changeFunc, changeFunc);
    };

    /**
    * Add a canvas to notify list.
    *
    * @param {JGO.Canvas} jcanvas The canvas to add.
    */
    JGO.Notifier.prototype.addCanvas = function(jcanvas) {
        this.canvases.push(jcanvas);
    };

})();
