// Import or create JGO namespace
var JGO = JGO || {};

(function() {
    /**
     * Enum for intersection types. Aliased in JGO namespace, e.g. JGO.BLACK.
     * @memberof JGO
     * @enum
     * @readonly
     */
    JGO.INTERSECTION = {
        CLEAR: 0,
        /** Black stone */
        BLACK: 1,
        /** White stone */
        WHITE: 2,
        /** Semi-transparent black stone */
        DIM_BLACK: 3,
        /** Semi-transparent white stone */
        DIM_WHITE: 4
    };

    JGO.extend(JGO, JGO.INTERSECTION);

    /**
     * Enum for marker types.
     * @readonly
     * @enum
     */
    JGO.MARK = {
        /** No marker ('') */
        NONE: '',
        /** Square */
        SQUARE: '#',
        /** Triangle */
        TRIANGLE: '/',
        /** Circle */
        CIRCLE: '0',
        /** Cross */
        CROSS: '*',
        /** Black territory */
        BLACK_TERRITORY: ',',
        /** White territory */
        WHITE_TERRITORY: '.'
    };

    /**
     * Board coordinate array.
     * @constant
     */
    JGO.COORDINATES = "ABCDEFGHJKLMNOPQRSTUVWXYZ".split('');
})();
