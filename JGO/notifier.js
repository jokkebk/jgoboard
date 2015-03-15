'use strict';

var util = require('./util');

/**
 * A change notifier class that can listen to changes in a Board and keep
 * multiple Canvas board views up to date.
 *
 * @param {Board} jboard The board to listen to.
 * @constructor
 */
var Notifier = function(jboard) {
  this.updateScheduled = false; // set on first change
  this.canvases = []; // canvases to notify on changes

  console.log('<p>Notifier created at ' + util.imageLoads + '</p>');

  var changeFunc = function(coord) {
    if(this.updateScheduled) { // update already scheduled
      this.min.i = Math.min(this.min.i, coord.i);
      this.min.j = Math.min(this.min.j, coord.j);
      this.max.i = Math.max(this.max.i, coord.i);
      this.max.j = Math.max(this.max.j, coord.j);
      return;
    }

    this.min = coord.copy();
    this.max = coord.copy();
    this.updateScheduled = true;

    setTimeout(function() { // schedule update in the end
      for(var c=0; c<this.canvases.length; c++)
        this.canvases[c].draw(jboard, this.min.i, this.min.j,
          this.max.i, this.max.j);

      this.updateScheduled = false; // changes updated, scheduled function run
    }.bind(this), 0);
  }.bind(this);

  jboard.addListener(changeFunc, changeFunc);
};

/**
 * Add a canvas to notify list.
 *
 * @param {Canvas} jcanvas The canvas to add.
 */
Notifier.prototype.addCanvas = function(jcanvas) {
  this.canvases.push(jcanvas);
};

module.exports = Notifier;
