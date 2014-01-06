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

// Create / import jGoBoard
var JGO = JGO || {};

JGO.util = JGO.util || {};

(function() {
    /**
     * Deep extend an object. Part of main JGO namespace for brevity, it feels
     * such a fundamental construct cannot be called JGO.util.extend.
     *
     * @param {Object} dest Destination object to extend.
     * @param {Object} src Source object which properties will be copied.
     * @returns {Object} Extended destination object.
     */
    JGO.extend = function(dest, src) {
        for(var key in src) {
            if(src.hasOwnProperty(key)) {
                if(typeof src[key] === "object") {
                    if(!dest[key] || !(typeof dest[key] === 'object'))
                        dest[key] = {}; // create/overwrite if necessary
                    JGO.extend(dest[key], src[key]);
                } else dest[key] = src[key];
            }
        }

        return dest;
    }

    /**
     * Load images and defined by object and invoke callback when completed.
     * http://www.html5canvastutorials.com/tutorials/html5-canvas-image-loader/
     *
     * @param {Object} sources A dictionary of sources to load.
     * @param {function} callback A callback function to call with image dict.
     */
    JGO.util.loadImages = function(sources, callback) {
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
    };

    /**
    * Setup helper class to make creating JGO.Canvases easy.
    *
    * @param {JGO.Board} jboard Board object to listen to.
    * @param {Object} boardOptions Base board options like JGO.BOARD.large.
    */
    JGO.Setup = function(jboard, boardOptions) {
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
        this.jnotifier = new JGO.Notifier(jboard);
        this.options = JGO.extend(defaults, boardOptions); // clone
    }

    /**
    * View only a portion of the whole board.
    *
    * @param {int} xOff The X offset.
    * @param {int} yOff The Y offset.
    * @param {int} width The width.
    * @param {int} height The height.
    */
    JGO.Setup.prototype.view = function(xOff, yOff, width, height) {
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
    JGO.Setup.prototype.setOptions = function(options) {
        JGO.extend(this.options, options);
    };

    /**
    * Create JGO.Canvas based on current settings.
    *
    * @param {String} elemId The element where to create the canvas in.
    * @param {function} ready Function to call with canvas once it is ready.
    */
    JGO.Setup.prototype.create = function(elemId, ready) {
        var self = this, jboard = this.jboard,
        options = JGO.extend({}, this.options);

        JGO.util.loadImages(this.options.textures, function(images) {
            var jcanvas = new JGO.Canvas(elemId, options, images);
            jcanvas.draw(jboard, 0, 0, jboard.width-1, jboard.height-1);
            self.jnotifier.addCanvas(jcanvas); // add canvas to listener
            if(ready)
                ready(jcanvas);
        });
    };

})();
