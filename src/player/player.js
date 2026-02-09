import { MARK, STONE, createCursor } from '../core/index.js';
import { createRenderer } from '../renderer/index.js';
import { gameTreeFromSgf } from '../sgf/index.js';

const PLAYER_LABELS = {
  [STONE.BLACK]: 'Black',
  [STONE.WHITE]: 'White',
};

const DEFAULT_OPTIONS = Object.freeze({
  theme: 'kaya-medium',
  responsive: true,
  keyboard: true,
  playable: false,
  allowFileDrop: true,
  showCurrentMoveMarker: true,
  currentMoveMarker: MARK.CIRCLE,
  resultDisplay: 'comments',
  showPlayerNames: true,
  showPlayerRanks: true,
  showComments: true,
  controls: 'default',
});

const STYLE_ID = 'jgo-player-styles';

const PLAYER_STYLE_CSS = `
.jgo-player {
  display: grid;
  font-family: "Avenir Next", "Segoe UI", sans-serif;
  color: #241f18;
}

.jgo-player-surface {
  width: fit-content;
  max-width: 100%;
  margin: 0 auto;
  display: grid;
  gap: 0.75rem;
}

.jgo-player-head {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  width: 100%;
}

.jgo-player-side {
  border: 1px solid rgba(0, 0, 0, 0.14);
  border-radius: 0.6rem;
  background: #f9f4ea;
  padding: 0.45rem 0.55rem;
}

.jgo-player-side[data-color="black"] {
  background: #ece6da;
}

.jgo-player-side-name {
  font-weight: 700;
  font-size: 0.95rem;
  line-height: 1.15;
  min-width: 0;
  overflow-wrap: anywhere;
}

.jgo-player-side-rank {
  font-size: 0.8rem;
  color: #6c604f;
  margin-top: 0.18rem;
}

.jgo-player-side-captures {
  margin-top: 0.35rem;
  font-size: 0.85rem;
  color: #3f3629;
}

.jgo-player-board {
  width: max-content;
  max-width: 100%;
  min-height: 240px;
  display: grid;
  place-items: center;
  border-radius: 0.75rem;
  overflow: hidden;
  margin: 0 auto;
}

.jgo-player-result {
  border: 1px solid rgba(86, 69, 39, 0.25);
  border-radius: 0.55rem;
  background: rgba(255, 251, 240, 0.98);
  color: #3c3122;
  font-size: 0.9rem;
  font-weight: 600;
  padding: 0.45rem 0.6rem;
  text-align: center;
}

.jgo-player.jgo-player-drop-target .jgo-player-board {
  position: relative;
}

.jgo-player.jgo-player-drop-active .jgo-player-board {
  outline: 2px dashed rgba(112, 86, 49, 0.9);
  outline-offset: -2px;
}

.jgo-player.jgo-player-drop-active .jgo-player-board::after {
  content: 'Drop SGF file to load';
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(249, 244, 234, 0.85);
  color: #3e3223;
  font-weight: 600;
  font-size: 0.95rem;
  pointer-events: none;
}

.jgo-player-controls {
  display: grid;
  gap: 0.55rem;
  width: 100%;
}

.jgo-player-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.jgo-player-row button {
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 0.45rem;
  background: #fffdf9;
  color: #2b241b;
  padding: 0.32rem 0.54rem;
  cursor: pointer;
  font: inherit;
  font-size: 0.85rem;
  line-height: 1;
}

.jgo-player-row button:disabled {
  opacity: 0.44;
  cursor: default;
}

.jgo-player-kpi {
  margin-left: 0.22rem;
  font-size: 0.86rem;
  color: #4f4333;
}

.jgo-player-comments {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 0.6rem;
  background: #fffdf8;
  padding: 0.55rem 0.65rem;
  width: 100%;
  text-align: left;
}

.jgo-player-comments-title {
  font-size: 0.78rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #77664f;
  margin-bottom: 0.3rem;
}

.jgo-player-comments-body {
  margin: 0;
  white-space: pre-wrap;
  font-size: 0.9rem;
  color: #2f271e;
}

@media (max-width: 640px) {
  .jgo-player {
    gap: 0;
  }

  .jgo-player-surface {
    gap: 0.6rem;
  }

  .jgo-player-head {
    grid-template-columns: 1fr;
  }

  .jgo-player-row button {
    padding: 0.36rem 0.6rem;
  }
}
`;

function hasDocument() {
  return typeof document !== 'undefined';
}

function isHtmlElement(value) {
  return typeof HTMLElement !== 'undefined' && value instanceof HTMLElement;
}

function ensurePlayerStyles() {
  if (!hasDocument()) {
    return;
  }

  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = PLAYER_STYLE_CSS;
  document.head.appendChild(style);
}

function resolveTargetElement(target) {
  if (!hasDocument()) {
    throw new Error('Player UI requires a browser-like document environment');
  }

  if (typeof target === 'string') {
    const found = document.querySelector(target);
    if (!found) {
      throw new Error(`target not found for selector: ${target}`);
    }
    return found;
  }

  if (isHtmlElement(target)) {
    return target;
  }

  throw new Error('createPlayer target must be a selector string or DOM element');
}

function readProperty(properties, key) {
  const values = properties?.[key];

  if (!Array.isArray(values) || values.length === 0) {
    return '';
  }

  return String(values[0] || '').trim();
}

function normalizeResultDisplay(value) {
  if (value === 'top' || value === 'comments' || value === 'none') {
    return value;
  }

  return 'comments';
}

function rootPlayerMeta(tree) {
  const root = tree.getNode(tree.rootId);
  const properties = root.properties || {};

  return {
    blackName: readProperty(properties, 'PB'),
    blackRank: readProperty(properties, 'BR'),
    whiteName: readProperty(properties, 'PW'),
    whiteRank: readProperty(properties, 'WR'),
    result: readProperty(properties, 'RE'),
  };
}

function resolveTree(options = {}) {
  if (options.tree) {
    return options.tree;
  }

  if (options.gameTree) {
    return options.gameTree;
  }

  if (typeof options.sgf === 'string') {
    return gameTreeFromSgf(options.sgf, options.sgfOptions || {});
  }

  throw new Error('createPlayer requires one of options.tree, options.gameTree, or options.sgf');
}

function isTypingTarget(target) {
  if (!target || !isHtmlElement(target)) {
    return false;
  }

  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}

function getFirstComment(properties) {
  const commentValues = properties?.C;
  if (!Array.isArray(commentValues) || commentValues.length === 0) {
    return '';
  }

  return String(commentValues[0] || '');
}

function safeUnsubscribe(unsubscribe) {
  if (typeof unsubscribe === 'function') {
    unsubscribe();
  }
}

function hasFilePayload(event) {
  const dataTransfer = event?.dataTransfer;
  if (!dataTransfer) {
    return false;
  }

  if (Array.isArray(dataTransfer.types) && dataTransfer.types.includes('Files')) {
    return true;
  }

  if (typeof dataTransfer.types?.contains === 'function' && dataTransfer.types.contains('Files')) {
    return true;
  }

  return false;
}

function pickSgfFile(files) {
  const list = Array.from(files || []);
  if (list.length === 0) {
    return null;
  }

  const namedMatch = list.find((file) => /\.sgf$/i.test(file.name || ''));
  return namedMatch || list[0] || null;
}

function readFileAsText(file) {
  if (!file) {
    return Promise.reject(new Error('No file provided'));
  }

  if (typeof file.text === 'function') {
    return file.text();
  }

  return new Promise((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      reject(new Error('FileReader is not available in this environment'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Unable to read SGF file'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsText(file);
  });
}

function isMacLikePlatform() {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const platform = navigator.userAgentData?.platform || navigator.platform || '';
  return /Mac|iPhone|iPad|iPod/i.test(platform);
}

export class Player {
  constructor(target, options = {}) {
    const element = resolveTargetElement(target);
    const tree = resolveTree(options);
    const mergedOptions = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    ensurePlayerStyles();

    this.options = mergedOptions;
    this.options.resultDisplay = normalizeResultDisplay(mergedOptions.resultDisplay);
    this.target = element;
    this.tree = tree;
    this.cursor = createCursor(tree, {
      ...(options.nodeId ? { nodeId: options.nodeId } : {}),
    });
    this.meta = rootPlayerMeta(tree);

    this._listeners = {
      moveChange: new Set(),
      variationChange: new Set(),
      playAttempt: new Set(),
      illegalMove: new Set(),
      sgfLoad: new Set(),
      sgfLoadError: new Set(),
      ready: new Set(),
    };
    this._unsubscribers = [];
    this._destroyed = false;
    this._createdRoot = false;
    this._resizeHandler = null;
    this._keydownHandler = null;
    this._keyboardFocusHandler = null;
    this._addedTabIndex = false;
    this._fileDropHandler = null;
    this._dragDepth = 0;
    this._currentMoveMarker = null;
    this._isMacLikePlatform = isMacLikePlatform();

    this.root = this._mountRoot(element);
    this._buildUi();

    this.renderer = createRenderer(this.ui.board, {
      board: this.cursor.board,
      theme: this.options.theme,
      interactions: {
        enabled: this.options.playable === true,
      },
    });

    if (this.options.playable === true) {
      this._wirePlayableBoard();
    }

    this._wireControls();
    this._wireKeyboard();
    this._wireResize();
    this._wireFileDrop();

    this._ready = this.renderer.whenReady().then(() => {
      if (this._destroyed) {
        return;
      }

      this.renderer.render();
      this._syncSurfaceWidth();
      this._updateUi();
      this._emit('ready', {
        state: this.cursor.getState(),
      });
    });
  }

  _mountRoot(element) {
    if (element.childElementCount === 0 && element.textContent.trim() === '') {
      element.classList.add('jgo-player');
      return element;
    }

    const root = document.createElement('div');
    root.className = 'jgo-player';
    element.appendChild(root);
    this._createdRoot = true;
    return root;
  }

  _buildUi() {
    this.root.textContent = '';
    const surface = document.createElement('div');
    surface.className = 'jgo-player-surface';

    const head = document.createElement('div');
    head.className = 'jgo-player-head';

    const black = this._buildPlayerSide('black');
    const white = this._buildPlayerSide('white');
    head.append(black.root, white.root);

    const board = document.createElement('div');
    board.className = 'jgo-player-board';

    const result = document.createElement('div');
    result.className = 'jgo-player-result';
    result.hidden = true;

    const controls = document.createElement('div');
    controls.className = 'jgo-player-controls';

    const navRow = document.createElement('div');
    navRow.className = 'jgo-player-row';

    const firstButton = this._button('|<', 'First move');
    const backFiveButton = this._button('<<', 'Back 5');
    const prevButton = this._button('<', 'Previous move');
    const nextButton = this._button('>', 'Next move');
    const nextFiveButton = this._button('>>', 'Forward 5');
    const lastButton = this._button('>|', 'To end');
    const moveNumber = document.createElement('span');
    moveNumber.className = 'jgo-player-kpi';

    navRow.append(
      firstButton,
      backFiveButton,
      prevButton,
      nextButton,
      nextFiveButton,
      lastButton,
      moveNumber
    );

    const variationRow = document.createElement('div');
    variationRow.className = 'jgo-player-row';
    const variationUpButton = this._button('Var ↑', 'Previous sibling variation');
    const variationDownButton = this._button('Var ↓', 'Next sibling variation');
    const variationLabel = document.createElement('span');
    variationLabel.className = 'jgo-player-kpi';
    variationRow.append(variationUpButton, variationDownButton, variationLabel);

    controls.append(navRow, variationRow);

    const comments = document.createElement('section');
    comments.className = 'jgo-player-comments';
    const commentsTitle = document.createElement('div');
    commentsTitle.className = 'jgo-player-comments-title';
    commentsTitle.textContent = 'Comments';
    const commentsBody = document.createElement('p');
    commentsBody.className = 'jgo-player-comments-body';
    comments.append(commentsTitle, commentsBody);

    surface.append(head, result, board, controls, comments);
    this.root.append(surface);

    this.ui = {
      surface,
      black,
      white,
      result,
      board,
      firstButton,
      backFiveButton,
      prevButton,
      nextButton,
      nextFiveButton,
      lastButton,
      moveNumber,
      variationUpButton,
      variationDownButton,
      variationLabel,
      comments,
      commentsBody,
    };
  }

  _buildPlayerSide(color) {
    const root = document.createElement('section');
    root.className = 'jgo-player-side';
    root.dataset.color = color;

    const name = document.createElement('div');
    name.className = 'jgo-player-side-name';

    const rank = document.createElement('div');
    rank.className = 'jgo-player-side-rank';

    const captures = document.createElement('div');
    captures.className = 'jgo-player-side-captures';

    root.append(name, rank, captures);

    return {
      root,
      name,
      rank,
      captures,
    };
  }

  _button(label, title) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.title = title;
    return button;
  }

  _wireControls() {
    this.ui.firstButton.addEventListener('click', () => {
      const result = this.cursor.gotoNode(this.tree.rootId);
      if (!result.ok) {
        return;
      }
      this._updateUi();
      this._emitMoveChange('first');
    });

    this.ui.backFiveButton.addEventListener('click', () => {
      this.prev(5);
    });

    this.ui.prevButton.addEventListener('click', () => {
      this.prev();
    });

    this.ui.nextButton.addEventListener('click', () => {
      this.next();
    });

    this.ui.nextFiveButton.addEventListener('click', () => {
      this.next(5);
    });

    this.ui.lastButton.addEventListener('click', () => {
      this.last();
    });

    this.ui.variationUpButton.addEventListener('click', () => {
      this._switchSiblingVariation(-1);
    });

    this.ui.variationDownButton.addEventListener('click', () => {
      this._switchSiblingVariation(1);
    });
  }

  _wirePlayableBoard() {
    const unsubscribe = this.renderer.on('click', ({ vertex }) => {
      if (!vertex) {
        return;
      }

      this._emit('playAttempt', {
        vertex,
        player: this.cursor.game.currentPlayer,
      });

      const result = this.cursor.play(vertex);
      if (!result.ok) {
        this._emit('illegalMove', {
          vertex,
          result,
          player: this.cursor.game.currentPlayer,
        });
        return;
      }

      this._updateUi();
      this._emitMoveChange('play');
    });

    this._unsubscribers.push(unsubscribe);
  }

  _wireKeyboard() {
    if (!this.options.keyboard || !hasDocument()) {
      return;
    }

    if (!this.root.hasAttribute('tabindex')) {
      this.root.setAttribute('tabindex', '0');
      this._addedTabIndex = true;
    }

    this._keyboardFocusHandler = () => {
      if (typeof this.root.focus === 'function') {
        this.root.focus({ preventScroll: true });
      }
    };

    this._keydownHandler = (event) => {
      if (this._destroyed) {
        return;
      }

      if (isTypingTarget(event.target)) {
        return;
      }

      const primaryModifier = this._isMacLikePlatform ? event.metaKey : event.ctrlKey;

      if (event.key === 'Home') {
        event.preventDefault();
        this.first();
        return;
      }

      if (event.key === 'End') {
        event.preventDefault();
        this.last();
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (primaryModifier) {
          this.first();
          return;
        }

        if (event.shiftKey) {
          this.prev(5);
          return;
        }

        this.prev();
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (primaryModifier) {
          this.last();
          return;
        }

        if (event.shiftKey) {
          this.next(5);
          return;
        }

        this.next();
        return;
      }

      if (event.key === 'ArrowUp') {
        if (event.shiftKey || primaryModifier || event.altKey) {
          return;
        }

        event.preventDefault();
        this._switchSiblingVariation(-1);
        return;
      }

      if (event.key === 'ArrowDown') {
        if (event.shiftKey || primaryModifier || event.altKey) {
          return;
        }

        event.preventDefault();
        this._switchSiblingVariation(1);
      }
    };

    this.root.addEventListener('pointerdown', this._keyboardFocusHandler);
    this.root.addEventListener('keydown', this._keydownHandler);
  }

  _wireResize() {
    if (!this.options.responsive) {
      return;
    }

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        this.renderer.render();
        this._syncSurfaceWidth();
      });

      observer.observe(this.root);
      this._resizeHandler = () => observer.disconnect();
      return;
    }

    if (typeof window !== 'undefined') {
      const listener = () => {
        this.renderer.render();
        this._syncSurfaceWidth();
      };

      window.addEventListener('resize', listener);
      this._resizeHandler = () => {
        window.removeEventListener('resize', listener);
      };
    }
  }

  _wireFileDrop() {
    if (!this.options.allowFileDrop || !hasDocument()) {
      return;
    }

    this.root.classList.add('jgo-player-drop-target');

    const onDragEnter = (event) => {
      if (!hasFilePayload(event)) {
        return;
      }

      event.preventDefault();
      this._dragDepth += 1;
      this.root.classList.add('jgo-player-drop-active');
    };

    const onDragOver = (event) => {
      if (!hasFilePayload(event)) {
        return;
      }

      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy';
      }
    };

    const onDragLeave = (event) => {
      if (!hasFilePayload(event)) {
        return;
      }

      event.preventDefault();
      this._dragDepth = Math.max(0, this._dragDepth - 1);
      if (this._dragDepth === 0) {
        this.root.classList.remove('jgo-player-drop-active');
      }
    };

    const onDrop = async (event) => {
      if (!hasFilePayload(event)) {
        return;
      }

      event.preventDefault();
      this._dragDepth = 0;
      this.root.classList.remove('jgo-player-drop-active');

      const file = pickSgfFile(event.dataTransfer?.files);
      if (!file) {
        this._emit('sgfLoadError', {
          source: 'drop',
          error: new Error('No files found in drop payload'),
        });
        return;
      }

      try {
        await this.loadFile(file, { source: 'drop' });
      } catch (error) {
        this._emit('sgfLoadError', { source: 'drop', error });
      }
    };

    this.root.addEventListener('dragenter', onDragEnter);
    this.root.addEventListener('dragover', onDragOver);
    this.root.addEventListener('dragleave', onDragLeave);
    this.root.addEventListener('drop', onDrop);

    this._fileDropHandler = () => {
      this.root.removeEventListener('dragenter', onDragEnter);
      this.root.removeEventListener('dragover', onDragOver);
      this.root.removeEventListener('dragleave', onDragLeave);
      this.root.removeEventListener('drop', onDrop);
      this.root.classList.remove('jgo-player-drop-target');
      this.root.classList.remove('jgo-player-drop-active');
    };
  }

  _emit(event, payload) {
    const listeners = this._listeners[event];
    if (!listeners) {
      return;
    }

    for (const listener of listeners) {
      listener(payload);
    }
  }

  _emitMoveChange(source) {
    this._emit('moveChange', {
      source,
      state: this.cursor.getState(),
    });
  }

  _syncSurfaceWidth() {
    if (!this.ui || !this.ui.surface || !this.ui.board) {
      return;
    }

    const boardWidth = this.ui.board.getBoundingClientRect().width;
    if (boardWidth <= 0) {
      return;
    }

    this.ui.surface.style.width = `${Math.round(boardWidth)}px`;
  }

  _clearCurrentMoveMarker() {
    if (!this._currentMoveMarker || !this.cursor?.board) {
      return;
    }

    const { vertex, previousMark, marker } = this._currentMoveMarker;

    try {
      const currentMark = this.cursor.board.getMark(vertex);
      if (currentMark === marker) {
        this.cursor.board.setMark(vertex, previousMark);
      }
    } catch {
      this._currentMoveMarker = null;
      return;
    }

    this._currentMoveMarker = null;
  }

  _updateCurrentMoveMarker() {
    this._clearCurrentMoveMarker();

    if (!this.options.showCurrentMoveMarker) {
      return;
    }

    const marker =
      typeof this.options.currentMoveMarker === 'string'
        ? this.options.currentMoveMarker
        : MARK.CIRCLE;
    const currentNode = this.cursor.getCurrentNode();

    if (!currentNode?.action || currentNode.action.type !== 'play' || !currentNode.action.vertex) {
      return;
    }

    const vertex = currentNode.action.vertex;
    const previousMark = this.cursor.board.getMark(vertex);

    this._currentMoveMarker = {
      vertex,
      previousMark,
      marker,
    };

    if (previousMark !== marker) {
      this.cursor.board.setMark(vertex, marker);
    }
  }

  _applyLoadedTree(tree, options = {}) {
    this._clearCurrentMoveMarker();

    this.tree = tree;
    this.cursor = createCursor(tree, {
      ...(options.nodeId ? { nodeId: options.nodeId } : {}),
    });
    this.meta = rootPlayerMeta(tree);
    this.renderer.setBoard(this.cursor.board);
    this.renderer.render();
    this._syncSurfaceWidth();
    this._updateUi();
  }

  _switchSiblingVariation(delta) {
    const state = this.cursor.getState();

    if (state.ply === 0 || state.variationIndex < 0) {
      return false;
    }

    const parentLevel = state.ply - 1;
    const parentId = state.path[parentLevel];
    const siblingCount = this.cursor.getVariations(parentId).length;
    const targetIndex = state.variationIndex + delta;

    if (siblingCount <= 1 || targetIndex < 0 || targetIndex >= siblingCount) {
      return false;
    }

    const result = this.cursor.setVariation(parentLevel, targetIndex);
    if (!result.ok) {
      return false;
    }

    this._updateUi();
    this._emit('variationChange', {
      from: state.variationIndex,
      to: targetIndex,
      level: parentLevel,
      state: this.cursor.getState(),
    });
    this._emitMoveChange('variation');
    return true;
  }

  _setPlayerDisplay(side, name, rank, captures, showName, showRank) {
    side.name.textContent = showName && name ? name : PLAYER_LABELS[captures.color];

    if (showRank && rank) {
      side.rank.hidden = false;
      side.rank.textContent = rank;
    } else {
      side.rank.hidden = true;
      side.rank.textContent = '';
    }

    side.captures.textContent = `Captures: ${captures.value}`;
  }

  _updateUi() {
    this._updateCurrentMoveMarker();

    const state = this.cursor.getState();
    const currentNode = this.cursor.getCurrentNode();
    const comments = getFirstComment(currentNode.properties);
    const hasResult = Boolean(this.meta.result);
    const atTerminalMove = state.variations.length === 0 && state.game.moveNumber > 0;
    const showResult = hasResult && atTerminalMove;
    const resultDisplay = normalizeResultDisplay(this.options.resultDisplay);
    const showResultTop = showResult && resultDisplay === 'top';
    const showResultInComments = showResult && resultDisplay === 'comments';

    this._setPlayerDisplay(
      this.ui.black,
      this.meta.blackName,
      this.meta.blackRank,
      { color: STONE.BLACK, value: state.game.captures.black },
      this.options.showPlayerNames,
      this.options.showPlayerRanks
    );
    this._setPlayerDisplay(
      this.ui.white,
      this.meta.whiteName,
      this.meta.whiteRank,
      { color: STONE.WHITE, value: state.game.captures.white },
      this.options.showPlayerNames,
      this.options.showPlayerRanks
    );

    this.ui.moveNumber.textContent = `Move ${state.game.moveNumber}`;

    const canGoNext = state.variations.length > 0;
    this.ui.firstButton.disabled = state.ply === 0;
    this.ui.backFiveButton.disabled = state.ply === 0;
    this.ui.prevButton.disabled = state.ply === 0;
    this.ui.nextButton.disabled = !canGoNext;
    this.ui.nextFiveButton.disabled = !canGoNext;
    this.ui.lastButton.disabled = !canGoNext;

    const siblingInfo = this._getSiblingInfo(state);
    const hasSiblingSwitch = siblingInfo.total > 1;
    this.ui.variationUpButton.disabled = !hasSiblingSwitch || siblingInfo.index <= 0;
    this.ui.variationDownButton.disabled = !hasSiblingSwitch || siblingInfo.index + 1 >= siblingInfo.total;
    this.ui.variationLabel.textContent = hasSiblingSwitch
      ? `Variation ${siblingInfo.index + 1}/${siblingInfo.total}`
      : 'Variation 1/1';

    this.ui.result.hidden = !showResultTop;
    this.ui.result.textContent = showResultTop ? `Result: ${this.meta.result}` : '';

    const showCommentsPanel = this.options.showComments || showResultInComments;
    this.ui.comments.hidden = !showCommentsPanel;

    let commentText = this.options.showComments ? comments || 'No comments on this move.' : '';
    if (showResultInComments) {
      commentText = commentText
        ? `Result: ${this.meta.result}\n\n${commentText}`
        : `Result: ${this.meta.result}`;
    }

    this.ui.commentsBody.textContent = commentText;
  }

  _getSiblingInfo(state) {
    if (state.ply === 0 || state.variationIndex < 0) {
      return { index: 0, total: 1 };
    }

    const parentLevel = state.ply - 1;
    const parentId = state.path[parentLevel];
    const siblings = this.cursor.getVariations(parentId);

    return {
      index: state.variationIndex,
      total: siblings.length || 1,
    };
  }

  on(event, listener) {
    if (!this._listeners[event]) {
      throw new Error(`unsupported player event: ${event}`);
    }

    this._listeners[event].add(listener);
    return () => {
      this._listeners[event].delete(listener);
    };
  }

  whenReady() {
    return this._ready;
  }

  getState() {
    return this.cursor.getState();
  }

  loadTree(tree, options = {}) {
    try {
      this._applyLoadedTree(tree, options);
    } catch (error) {
      this._emit('sgfLoadError', {
        source: options.source || 'api',
        fileName: options.fileName || null,
        error,
      });

      return {
        ok: false,
        error,
      };
    }

    this._emit('sgfLoad', {
      source: options.source || 'api',
      fileName: options.fileName || null,
      state: this.cursor.getState(),
    });

    this._emitMoveChange('load');

    return {
      ok: true,
      tree: this.tree,
      state: this.cursor.getState(),
    };
  }

  loadSgf(sgf, options = {}) {
    let tree;

    try {
      tree = gameTreeFromSgf(sgf, options.sgfOptions || this.options.sgfOptions || {});
    } catch (error) {
      this._emit('sgfLoadError', {
        source: options.source || 'api',
        fileName: options.fileName || null,
        error,
      });

      return {
        ok: false,
        error,
      };
    }

    return this.loadTree(tree, options);
  }

  async loadFile(file, options = {}) {
    let text;

    try {
      text = await readFileAsText(file);
    } catch (error) {
      this._emit('sgfLoadError', {
        source: options.source || 'file',
        fileName: file?.name || null,
        error,
      });

      return {
        ok: false,
        error,
      };
    }

    return this.loadSgf(text, {
      ...options,
      source: options.source || 'file',
      fileName: options.fileName || file?.name || null,
    });
  }

  async openFilePicker(options = {}) {
    if (!hasDocument()) {
      return {
        ok: false,
        error: new Error('openFilePicker requires a browser document'),
      };
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.sgf,text/plain';
    input.style.display = 'none';
    document.body.appendChild(input);

    return new Promise((resolve) => {
      let settled = false;

      const finish = (result) => {
        if (settled) {
          return;
        }

        settled = true;
        if (input.parentNode) {
          input.parentNode.removeChild(input);
        }
        resolve(result);
      };

      input.addEventListener(
        'change',
        async () => {
          try {
            const file = pickSgfFile(input.files);

            if (!file) {
              finish({
                ok: false,
                error: new Error('No file selected'),
              });
              return;
            }

            const result = await this.loadFile(file, {
              ...options,
              source: options.source || 'picker',
              fileName: options.fileName || file.name,
            });

            finish(result);
          } catch (error) {
            finish({ ok: false, error });
          }
        },
        { once: true }
      );

      if (typeof window !== 'undefined') {
        const onWindowFocus = () => {
          window.setTimeout(() => {
            if (settled) {
              return;
            }

            // If a file was selected, the change handler will resolve the
            // promise. Only finish here when the picker was cancelled.
            const file = pickSgfFile(input.files);
            if (!file) {
              finish({
                ok: false,
                error: new Error('No file selected'),
              });
            }
          }, 0);
        };

        window.addEventListener('focus', onWindowFocus, { once: true });
      }

      input.click();
    });
  }

  setTheme(theme) {
    this.options.theme = theme;
    this.renderer.setTheme(theme);
    this._syncSurfaceWidth();
    this._updateUi();
    return this;
  }

  setCommentsVisible(visible) {
    this.options.showComments = visible !== false;
    this._updateUi();
    return this;
  }

  setPlayerNamesVisible(visible) {
    this.options.showPlayerNames = visible !== false;
    this._updateUi();
    return this;
  }

  setPlayerRanksVisible(visible) {
    this.options.showPlayerRanks = visible !== false;
    this._updateUi();
    return this;
  }

  setCurrentMoveMarkerVisible(visible) {
    this.options.showCurrentMoveMarker = visible !== false;
    this._updateUi();
    return this;
  }

  setResultDisplay(mode = 'comments') {
    this.options.resultDisplay = normalizeResultDisplay(mode);
    this._updateUi();
    return this;
  }

  gotoNode(nodeId) {
    const result = this.cursor.gotoNode(nodeId);
    if (!result.ok) {
      return result;
    }

    this._updateUi();
    this._emitMoveChange('gotoNode');
    return result;
  }

  first() {
    const result = this.cursor.gotoNode(this.tree.rootId);
    if (!result.ok) {
      return result;
    }

    this._updateUi();
    this._emitMoveChange('first');
    return result;
  }

  prev(count = 1) {
    const steps = Number.isInteger(count) && count > 0 ? count : 1;
    let moved = 0;
    let lastResult = null;

    for (let i = 0; i < steps; i += 1) {
      const result = this.cursor.prev();
      if (!result.ok) {
        lastResult = result;
        break;
      }

      moved += 1;
      lastResult = result;
    }

    if (moved > 0) {
      this._updateUi();
      this._emitMoveChange(steps === 1 ? 'prev' : 'prevMany');
    }

    return {
      ok: moved > 0,
      moved,
      result: lastResult,
    };
  }

  next(count = 1, variationIndex = 0) {
    const steps = Number.isInteger(count) && count > 0 ? count : 1;
    let moved = 0;
    let lastResult = null;

    for (let i = 0; i < steps; i += 1) {
      const result = this.cursor.next({ variationIndex });
      if (!result.ok) {
        lastResult = result;
        break;
      }

      moved += 1;
      lastResult = result;
    }

    if (moved > 0) {
      this._updateUi();
      this._emitMoveChange(steps === 1 ? 'next' : 'nextMany');
    }

    return {
      ok: moved > 0,
      moved,
      result: lastResult,
    };
  }

  last() {
    let moved = 0;

    while (true) {
      const result = this.cursor.next({ variationIndex: 0 });
      if (!result.ok) {
        break;
      }

      moved += 1;
    }

    if (moved > 0) {
      this._updateUi();
      this._emitMoveChange('last');
    }

    return moved > 0 ? moved : 0;
  }

  destroy() {
    if (this._destroyed) {
      return;
    }

    this._destroyed = true;

    for (const unsubscribe of this._unsubscribers) {
      safeUnsubscribe(unsubscribe);
    }
    this._unsubscribers = [];

    if (this._resizeHandler) {
      this._resizeHandler();
      this._resizeHandler = null;
    }

    if (this._keydownHandler) {
      this.root.removeEventListener('keydown', this._keydownHandler);
      this._keydownHandler = null;
    }

    if (this._keyboardFocusHandler) {
      this.root.removeEventListener('pointerdown', this._keyboardFocusHandler);
      this._keyboardFocusHandler = null;
    }

    if (this._addedTabIndex) {
      this.root.removeAttribute('tabindex');
      this._addedTabIndex = false;
    }

    if (this._fileDropHandler) {
      this._fileDropHandler();
      this._fileDropHandler = null;
    }

    this._clearCurrentMoveMarker();

    if (this.renderer) {
      this.renderer.destroy();
    }

    if (this._createdRoot && this.root.parentElement) {
      this.root.parentElement.removeChild(this.root);
    } else {
      this.root.textContent = '';
      this.target.classList.remove('jgo-player');
    }
  }
}

export function createPlayer(target, options = {}) {
  return new Player(target, options);
}
