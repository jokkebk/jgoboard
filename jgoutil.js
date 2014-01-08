var JGO = JGO || {};

JGO.util = JGO.util || {};

(function() {
    /**
     * Load images and defined by object and invoke callback when completed.
     * http://www.html5canvastutorials.com/tutorials/html5-canvas-image-loader/
     *
     * @function loadImages
     * @memberof JGO.util
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
    * Helper function to create coordinates for standard handicap placement.
    *
    * @param {int} size Board size (9, 13, 19 supported).
    * @param {itn} num Number of handicap stones.
    * @returns {Array} Array of JGO.Coordinate objects.
    */
    JGO.util.getHandicapCoordinates = function(size, num) {
        // Telephone dial style numbering
        var handicapPlaces = [[], [], [3,7], [3,7,9], [1,3,7,9], [1,3,5,7,9],
            [1,3,4,6,7,9], [1,3,4,5,6,7,9], [1,2,3,4,6,7,8,9], 
            [1,2,3,4,5,6,7,8,9]];
        var places = handicapPlaces[num], offset = (size <= 9 ? 2 : 3),
            step = (size - 1) / 2 - offset, coords = [];

        if(places) for(var n=0; n<places.length; n++) {
            var i = (places[n]-1) % 3, j = Math.floor((places[n]-1) / 3);
            coords.push(new JGO.Coordinate(offset+i*step, offset+j*step));
        }

        return coords;
    };

})();
