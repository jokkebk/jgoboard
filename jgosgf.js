var jgo_sgfProperties = {
    'C': jgo_sgfComment,
    'B': jgo_sgfMove,
    'W': jgo_sgfMove,
    'TW': jgo_sgfMarker,
    'TB': jgo_sgfMarker,
    'CR': jgo_sgfMarker,
    'TR': jgo_sgfMarker,
    'MA': jgo_sgfMarker,
    'SQ': jgo_sgfMarker,
    'LB': jgo_sgfLabel,
    'AB': jgo_sgfSetup,
    'AW': jgo_sgfSetup,
    'AE': jgo_sgfSetup,
    'AN': jgo_sgfInfo,
    'CP': jgo_sgfInfo,
    'DT': jgo_sgfInfo,
    'EV': jgo_sgfInfo,
    'GN': jgo_sgfInfo,
    'OT': jgo_sgfInfo,
    'RO': jgo_sgfInfo,
    'RE': jgo_sgfInfo,
    'RU': jgo_sgfInfo,
    'SO': jgo_sgfInfo,
    'TM': jgo_sgfInfo,
    'PC': jgo_sgfInfo,
    'PB': jgo_sgfInfo,
    'PW': jgo_sgfInfo,
    'BR': jgo_sgfInfo,
    'WR': jgo_sgfInfo,
    'BT': jgo_sgfInfo,
    'WT': jgo_sgfInfo
};

function jgo_sgfComment(name, values) {
    this.state["comment"] = values[0];
}

function jgo_sgfMove(name, values) {
    var coord, own, enemy;

    if(name == "B") {
        own = JGO_BLACK;
        enemy = JGO_WHITE;
    } else if("W") {
        own = JGO_WHITE;
        enemy = JGO_BLACK;
    }

    this.state["move"] = own;

    if(values[0].length != 2) { // assume a pass
        return;
    }

    coord = new JGOCoordinate(values[0]);
    this.state["moveCoordinate"] = coord;

    var captures = this.board.play(coord, own);

    if(captures == -1) {
        this.state["error"] = "SGF move contained suicide!";
        return;
    }

    this.captures[own == JGO_BLACK ? 0 : 1] += captures;
    this.state["captures"] = captures;
}

function jgo_sgfMarker(name, values) {
    var markerMap = {"TW": ',', "TB": '.', "CR": '0', "TR": '/', "MA": '*', "SQ": '#'}, marker = markerMap[name];

    if(!("markers" in this.state))
        this.state["markers"] = {};

    this.state["markers"][marker] = jgo_explodeSGFList(values);
}

function jgo_sgfLabel(name, values) {
    var markers;

    if("markers" in this.state)
        markers = this.state["markers"];
    else
        markers = this.state["markers"] = {};

    $.each(values, function(i, v) {
        var tuple = v.split(":");

        if(!(tuple[1] in markers))
            markers[tuple[1]] = [];

        markers[tuple[1]].push(new JGOCoordinate(tuple[0]));
    });
}

function jgo_sgfSetup(name, values) {
    var setupMap = {"AB": JGO_BLACK, "AW": JGO_WHITE, "AE": JGO_CLEAR};

    this.board.set(jgo_explodeSGFList(values), setupMap[name]);
    this.state["setup"] = true;
}

function jgo_sgfInfo(name, values) {
    var fieldMap = {"AN": "annotator", "CP": "copyright", "DT": "date", "EV": "event", "GN": "gameName", "OT": "overtime",
        "RO": "round", "RE": "result", "RU": "rules", "SO": "source", "TM": "time", "PC": "location",
        "PB": "black", "PW": "white", "BR": "blackRank", "WR": "whiteRank", "BT": "blackTeam", "WT": "whiteTeam"},
        field = fieldMap[name];

    this.info[field] = values[0];

    if(!("info" in this.state))
        this.state["info"] = {};

    this.state["info"][field] = values[0];
}

/**
 * Helper function to handle single coordinates as well as coordinate lists.
 *
 * @param {object} propValues A property value array containing a mix of coordinates (aa) and lists (aa:bb)
 * @returns {array} An array of JGOCoordinate objects matching the given property values.
 */
function jgo_explodeSGFList(propValues) {
    var coords = [];

    $.each(propValues, function(i, val) {
        if(val.indexOf(":") == -1) { // single coordinate
            coords.push(new JGOCoordinate(val));
        } else {
            var tuple = v.split(":"), c1, c2;

            c1 = new JGOCoordinate(tuple[0]);
            c2 = new JGOCoordinate(tuple[1]);
            coord = new JGOCoordinate();

            for(coord.i=c1.i; coord.i<=c2.i; ++coord.i)
                for(coord.j=c1.j; coord.j<=c2.j; ++coord.j)
                    coords.push(coord.copy());
        }
    });

    return coords;
}

/**
 * Parse SGF string into object tree representation:
 *
 * tree = { sequence: [ <node(s)> ], leaves: [ <subtree(s), if any> ] }
 *
 * Each node is an object containing property identifiers and associated values in array:
 *
 * node = {"B": ["nn"], "C": ["This is a comment"]}
 *
 * @param {String} sgf The SGF in string format, whitespace allowed.
 */
function jgo_parseSGF(sgf) {
    var tokens, i, len, token, // for loop vars
        lastBackslash = false, // flag to note if last string ended in escape
        bracketOpen = -1, // the index where bracket opened
        processed = [];

    if("a~b".split(/(~)/).length === 3) {
        tokens = sgf.split(/([\[\]\(\);])/); // split into an array at "[", "]", "(", ")", and ";", and include separators in array
    } else { // Thank you IE for not working
        var blockStart = 0, delimiters = "[]();";

        tokens = [];

        for(i=0, len=sgf.length; i<len; ++i) {
            if(delimiters.indexOf(sgf.charAt(i)) !== -1) {
                if(blockStart < i)
                    tokens.push(sgf.substring(blockStart, i));
                tokens.push(sgf.charAt(i));
                blockStart = i+1;
            }
        }

        if(blockStart < i) // leftovers
            tokens.push(sgf.substr(blockStart, i));
    }

    // process through tokens and push everything into processed, but merge stuff between square brackets into one element, unescaping escaped brackets
    // i.e. ["(", ";", "C", "[", "this is a comment containing brackets ", "[", "\\", "]", "]"] becomes:
    // ["(", ";", "C", "[", "this is a comment containing brackets []]"]
    // after this transformation, it's just "(", ")", ";", "ID", and "[bracket stuff]" elements in the processed array
    for(i=0, len=tokens.length; i<len; ++i) {
        token = tokens[i];

        if(bracketOpen == -1) { // handling elements outside property values (i.e. square brackets)
            token = jQuery.trim(token); // trim whitespace, it is irrelevant here
            if(token == "[") // found one
                bracketOpen = i;
            else if(token != "") // we are outside brackets, so just push everything nonempty as it is into 'processed'
                processed.push(token);
        } else { // bracket is open, we're now looking for a ] without preceding \
            if(token != "]") { // a text segment
                lastBackslash = (token.charAt(token.length-1) == "\\"); // true if string ends in \
            } else { // a closing bracket
                if(lastBackslash) { // it's escaped - we continue
                    lastBackslash = false;
                } else { // it's not escaped - we close the segment
                    processed.push(tokens.slice(bracketOpen, i+1).join('').replace(/\\\]/g, "]")); // push the whole thing including brackets, and unescape the inside closing brackets
                    bracketOpen = -1;
                }
            }
        }
    }

    // basic error checking
    if(processed.length == 0) {
        jgo_errorStr = "SGF was empty!";
        return false;
    } else if(processed[0] != "(" || processed[1] != ";" || processed[processed.length-1] != ")") {
        jgo_errorStr = "SGF did not start with \"(;\" or end with \")\"!";
        return false;
    }

    // collect "XY", "[AB]", "[CD]" sequences (properties) in a node into {"XY": ["AB", "CD"]} type of associative array
    // effectively parsing "(;GM[1]FF[4];B[pd])" into ["(", {"GM": ["1"], "FF": ["4"]}, {"B": ["pd"]}, ")"]

    // start again with "tokens" and process into "processed"
    tokens = processed;
    processed = [];

    var node, propertyId = ""; // node under construction, and current property identifier

    // the following code is not strict on format, so let's hope it's well formed
    for(i=0, len=tokens.length; i<len; ++i) {
        token = tokens[i];

        if(token == "(" || token == ")") {
            if(node) { // flush and reset node if necessary
                if(propertyId != "" && node[propertyId].length == 0) { // last property was missing value
                    jgo_errorStr = "Missing property value at " + token + "!";
                    return false;
                }
                processed.push(node);
                node = undefined;
            }

            processed.push(token); // push this token also
        } else if(token == ";") { // new node
            if(node) { // flush if necessary
                if(propertyId != "" && node[propertyId].length == 0) { // last property was missing value
                    jgo_errorStr = "Missing property value at " + token + "!";
                    return false;
                }
                processed.push(node);
            }

            node = {}; propertyId = ""; // initialize the new node
        } else { // it's either a property identifier or a property value
            if(token.indexOf("[") != 0) { // it's property identifier
                if(propertyId != "" && node[propertyId].length == 0) { // last property was missing value
                    jgo_errorStr = "Missing property value at " + token + "!";
                    return false;
                }

                if(token in node) { // duplicate key
                    jgo_errorStr = "Duplicate property identifier " + token + "!";
                    return false;
                }

                propertyId = token;
                node[propertyId] = []; // initialize new property with empty value array
            } else { // it's property value
                if(propertyId == "") { // we're missing the identifier
                    jgo_errorStr = "Missing property identifier at " + token + "!";
                    return false;
                }

                node[propertyId].push(token.substring(1, token.length-1)); // remove enclosing brackets
            }
        }
    }

    tokens = processed;

    // finally, construct a game tree from "(", ")", and sequence arrays - each leaf is {sequence: [ <list of nodes> ], leaves: [ <list of leaves> ]}
    var stack = [], currentRoot = {sequence: [], leaves: []}, lastRoot; // we know first element already: "("

    for(i=1, len=tokens.length; i<len-1; ++i) {
        token = tokens[i];

        if(token == "(") { // enter a subleaf
            if(currentRoot.sequence.length == 0) { // consecutive parenthesis without node sequence in between will throw an error
                jgo_errorStr = "SGF contains a game tree without a sequence!";
                return false;
            }
            stack.push(currentRoot); // save current leaf for when we return
            currentRoot = {sequence: [], leaves: []};
        } else if(token == ")") { // return from subleaf
            if(currentRoot.sequence.length == 0) { // consecutive parenthesis without node sequence in between will throw an error
                jgo_errorStr = "SGF contains a game tree without a sequence!";
                return false;
            }
            lastRoot = currentRoot;
            currentRoot = stack.pop();
            currentRoot.leaves.push(lastRoot);
        } else { // if every "(" is not followed by exactly one array of nodes (as it should), this code fails
            currentRoot.sequence.push(token);
        }
    }

    if(stack.length > 0) {
        jgo_errorStr = "Invalid number of parentheses in the SGF!";
        return null;
    }

    return currentRoot;
}

function jgo_gameTreeToRecord(gameTree) {
    var jrecord, root = gameTree.sequence[0];

    if("SZ" in root) {
        var size = root.SZ[0];

        if(size.indexOf(':') != -1) {
            width = parseInt(size.substring(0, size.indexOf(':')));
            height = parseInt(size.substr(size.indexOf(':')+1));
        } else width = height = parseInt(size);
    } else
        width = height = 19;

    alert(width + ' x ' + height);
}

// Apply SGF nodes recursively to create a game tree
function jgo_recurseRecord(jrecord, gameTree) {
    for(var i=0; i<gameTree.sequence.length; i++) {
        var node = gameTree.sequence[i];
        for(var key in node) {
            if(!node.hasOwnProperty(key))
                continue;
            jgo_sgfProperties[key].call(me, name, values);
        }
    }
}

/**
 * Parse SGF and return JGORecord object(s).
 *
 * @returns {Object} JGORecord object, array of them, or null on error.
 */
function JGO_LoadSGF(sgf) {
    var gameTree = jgo_parseSGF(sgf);

    if(gameTree.sequence.length == 0) { // potentially multiple game records
        var ret = [];

        if(gameTree.leaves.length == 0)
            return null;

        for(var i=0; i<gameTree.leaves.length; i++)
            ret.push(jgo_gameTreeToRecord(gameTree)); // return each leaf as separate record

        return ret;
    }

    return jgo_gameTreeToRecord(gameTree);
}
