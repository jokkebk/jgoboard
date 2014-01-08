/*!
 * jGoBoard v3.0
 * http://www.jgoboard.com/
 *
 * This software is licensed under a Creative Commons Attribution-NonCommercial 3.0 Unported License:
 * http://creativecommons.org/licenses/by-nc/3.0/
 * If you want to negotiate on a commercial license, please contact the author.
 */


// Some day everyone will have Object.keys
//if(!Object.prototype.keys) {
//    Object.prototype.keys = function() {
//        var keys = [];
//        for(var key in this)
//            if(this.hasOwnProperty(key))
//                keys.push(key);
//        return keys;
//    };
//}

// Some day everyone will have Array.indexOf
if(!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(obj, start) {
        for(var i = (start || 0), j = this.length; i < j; i++)
            if(this[i] === obj)
                return i;
        return -1;
    };
}

/**
 * Namespace for jGoBoard.
 * @namespace
 */
var JGO = JGO || {};

(function() {

    /**
     * Deep extend an object. Part of main JGO namespace for brevity, it feels
     * such a fundamental construct cannot be called JGO.util.extend.
     *
     * @function extend
     * @memberof JGO
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

})();
