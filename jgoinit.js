/*
// Some day everyone will have Object.keys
if(!Object.prototype.keys) {
    Object.prototype.keys = function() {
        var keys = [];
        for(var key in this)
            if(this.hasOwnProperty(key))
                keys.push(key);
        return keys;
    };
}
*/

// Some day everyone will have Array.indexOf
if(!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(obj, start) {
        for(var i = (start || 0), j = this.length; i < j; i++)
            if(this[i] === obj)
                return i;
        return -1;
    };
}

// http://www.html5canvastutorials.com/tutorials/html5-canvas-image-loader/
function JGO_loadImages(sources, callback) {
    var images = {};
    var loadedImages = 0;
    var numImages = 0;
    // get num of sources
    for(var src in sources) {
        if(sources.hasOwnProperty(src))
            numImages++;
    }
    for(var src in sources) {
        if(!sources.hasOwnProperty(src))
            continue;

        images[src] = new Image();
        images[src].onload = function() {
            if(++loadedImages >= numImages) {
                callback(images);
            }
        };
        images[src].src = sources[src];
    }
}

// Deep extend an object
function JGO_extend(dest, src) {
    for(var key in src) {
        if(src.hasOwnProperty(key)) {
            if(typeof src[key] === "object") {
                if(!dest[key] || !(typeof dest[key] === 'object'))
                    dest[key] = {}; // create/overwrite if necessary
                JGO_extend(dest[key], src[key]);
            } else dest[key] = src[key];
        }
    }

    return dest;
}

/**
 * Setup helper class to make creating JGOCanvases easy.
 *
 * @param {JGOBoard} jboard Board object to listen to.
 * @param {Object} boardOptions Base board options like JGO.BOARD.large.
 */
function JGOSetup(jboard, boardOptions) {
    var defaults = {
        margin: {color:'white'},
        edge: {top:true, bottom:true, left:true, right:true},
        coordinates: {top:true, bottom:true, left:true, right:true},
        stars: {points: 0 },
        board: {width:jboard.width, height:jboard.height},
        view: {xOffset:0, yOffset:0, width:jboard.width, height:jboard.height}
    };

    if(jboard.width == jboard.height) switch(jboard.width) { // square
        case 9:
            defaults.stars.points=5;
            defaults.stars.offset=2;
            break;
        case 13:
        case 19:
            defaults.stars.points=9;
            defaults.stars.offset=3;
            break;
    }

    this.jboard = jboard;
    this.jnotifier = new JGONotifier(jboard);
    this.options = JGO_extend(defaults, boardOptions); // clone
}

/**
 * View only a portion of the whole board.
 *
 * @param {int} xOff The X offset.
 * @param {int} yOff The Y offset.
 * @param {int} width The width.
 * @param {int} height The height.
 */
JGOSetup.prototype.view = function(xOff, yOff, width, height) {
    this.options.view.xOffset = xOff;
    this.options.view.yOffset = yOff;
    this.options.view.width = width;
    this.options.view.height = height;

    this.options.edge.left = (xOff == 0);
    this.options.edge.right = (xOff+width == this.options.board.width);

    this.options.edge.top = (yOff == 0);
    this.options.edge.bottom = (yOff+height == this.options.board.height);
};

/**
 * Replace default options (non-viewport related)
 *
 * @param {Object} options The new options.
 */
JGOSetup.prototype.setOptions = function(options) {
    JGO_extend(this.options, options);
};

/**
 * Create JGOCanvas based on current settings.
 *
 * @param {String} elemId The element where to create the canvas in.
 * @param {function} ready Function to call with canvas once it is ready.
 */
JGOSetup.prototype.create = function(elemId, ready) {
    var self = this, options = JGO_extend({}, this.options);

    JGO_loadImages(this.options.textures, function(images) {
        var jcanvas = new JGOCanvas(elemId, options, images);
        jcanvas.draw(jboard, 0, 0, jboard.width-1, jboard.height-1);
        self.jnotifier.addCanvas(jcanvas); // add canvas to listener
        if(ready)
            ready(jcanvas);
    });
};
