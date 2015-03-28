(function(document, window) {
    'use strict';

    function process(div) {
        var lines = div.innerHTML.split('\n'), data = [];

        // Handle div contents as diagram contents
        for(var i = 0, len = lines.length; i < len; ++i) {
            var elems = [], line = lines[i];

            for(var j = 0, len2 = line.length; j < len2; ++j) {
                switch(line[j]) {
                    case '.':
                        elems.push({type: JGO.CLEAR}); break;
                    case 'o':
                        elems.push({type: JGO.WHITE}); break;
                    case 'x':
                        elems.push({type: JGO.BLACK}); break;
                    case ' ':
                        break; // ignore whitespace
                    default: // assume marker
                        if(!elems.length) break; // no intersection yet
                        // Append to mark so x123 etc. are possible
                        if(elems[elems.length - 1].mark)
                          elems[elems.length - 1].mark += line[j];
                        else
                          elems[elems.length - 1].mark = line[j];
                }
            }

            if(elems.length) data.push(elems);
        }

        if(!data.length) return; // do nothing if no data

        // Handle special jgo-* attributes
        var style, width, height, topleft = new JGO.Coordinate();

        if(div.getAttribute('data-jgostyle'))
            style = eval(div.getAttribute('data-jgostyle'));
        else
            style = JGO.BOARD.medium;

        if(div.getAttribute('data-jgosize')) {
            var size = div.getAttribute('data-jgosize');

            if(size.indexOf('x') != -1) {
                width = parseInt(size.substring(0, size.indexOf('x')));
                height = parseInt(size.substr(size.indexOf('x')+1));
            } else width = height = parseInt(size);
        } else {
            height = data.length;
            width = data[0].length;
        }

        var jboard = new JGO.Board(width, height);
        var jsetup = new JGO.Setup(jboard, style);

        if(div.getAttribute('data-jgotopleft'))
            topleft = jboard.getCoordinate(div.getAttribute('data-jgotopleft'));

        jsetup.view(topleft.i, topleft.j, data[0].length, data.length);

        div.innerHTML = '';
        var c = new JGO.Coordinate();

        for(c.j = topleft.j; c.j < topleft.j + data.length; ++c.j) {
            for(c.i = topleft.i; c.i < topleft.i + data[0].length; ++c.i) {
                var elem = data[c.j - topleft.j][c.i - topleft.i];
                jboard.setType(c, elem.type);
                if(elem.mark) jboard.setMark(c, elem.mark);
            }
        }

        jsetup.create(div);
    }

    window.onload = function() {
        var matches = document.querySelectorAll("div.jgoboard");

        for(var i = 0, len = matches.length; i < len; ++i)
            process(matches[i]);
    }

})(document, window);
