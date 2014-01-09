// Import or create JGO namespace
var JGO = JGO || {};

(function() {

    /**
    * Setup helper class to make creating JGO.Canvases easy.
    *
    * @param {JGO.Board} jboard Board object to listen to.
    * @param {Object} boardOptions Base board options like JGO.BOARD.large.
    * @constructor
    * @memberof JGO
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
    };

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

        this.options.edge.left = (xOff === 0);
        this.options.edge.right = (xOff+width == this.options.board.width);

        this.options.edge.top = (yOff === 0);
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
