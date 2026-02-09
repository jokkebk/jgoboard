# jGoBoard v5 Player API

Embeddable player built from `core + renderer + sgf`.

## Modules

```js
import { createPlayer } from 'jgoboard/player';
```

In this repo, local demos import from `./src/index.js`.

## Quick Start

```js
import { createPlayer } from './src/index.js';

const player = createPlayer('#player', {
  sgf,
  theme: 'kaya-medium',
});

await player.whenReady();
```

## Input Options

- `sgf: string` SGF text to load
- `tree` or `gameTree`: existing `GameTree` instance
- `theme`: renderer theme (`'kaya-medium'`, `'walnut-medium'`, ...)
- `showPlayerNames` (default `true`)
- `showPlayerRanks` (default `true`)
- `showComments` (default `true`)
- `showCurrentMoveMarker` (default `true`)
- `currentMoveMarker` (default `MARK.CIRCLE`)
- `resultDisplay` (`'comments' | 'top' | 'none'`, default `'comments'`)
- `responsive` (default `true`)
- `keyboard` (default `true`)
- `playable` (default `false`) enables board-click play attempts
- `allowFileDrop` (default `true`) enables drag-and-drop SGF loading over the player

`createPlayer` requires one of `sgf`, `tree`, or `gameTree`.

## Built-In UI

- Black and white name/rank/captures
- Move number
- Navigation: `|<`, `<<`, `<`, `>`, `>>`, `>|`
- Variation up/down (enabled only when current node has siblings)
- Keyboard (when player is focused):
  - `Left/Right`: previous/next move
  - `Shift+Left/Right`: back/forward 5 moves
  - `Cmd+Left/Right` (macOS) or `Ctrl+Left/Right` (Windows/Linux): start/end
  - `Home/End`: start/end
  - `Up/Down`: previous/next sibling variation
- Comments panel
- Current move is marked with a circle by default
- SGF result (`RE`) is shown automatically at terminal move (in comments by default)
- Drag and drop an SGF file over the player to replace the game

## Instance Methods

- `player.whenReady()`
- `player.getState()`
- `player.loadSgf(sgfText, options?)`
- `player.loadFile(file, options?)`
- `player.openFilePicker(options?)`
- `player.gotoNode(nodeId)`
- `player.first()`
- `player.prev(count?)`
- `player.next(count?, variationIndex?)`
- `player.last()`
- `player.setTheme(theme)`
- `player.setCommentsVisible(boolean)`
- `player.setPlayerNamesVisible(boolean)`
- `player.setPlayerRanksVisible(boolean)`
- `player.setCurrentMoveMarkerVisible(boolean)`
- `player.setResultDisplay('comments' | 'top' | 'none')`
- `player.destroy()`

## Events

`player.on(event, listener)` supports:

- `ready`
- `moveChange`
- `variationChange`
- `playAttempt`
- `illegalMove`
- `sgfLoad`
- `sgfLoadError`

## Notes

- The default player is currently uncontrolled (it owns its internal cursor).
- Variation switching uses sibling branches of the current node's parent.
