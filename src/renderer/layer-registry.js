/**
 * @typedef {import('./board-renderer.js').RendererLayer} RendererLayer
 */

export class LayerRegistry {
  constructor() {
    /** @type {Map<string, RendererLayer & { zIndex: number, enabled: boolean }>} */
    this._layers = new Map();
  }

  /**
   * @param {string} name
   * @param {RendererLayer} layer
   * @returns {void}
   */
  add(name, layer) {
    if (!name || typeof name !== 'string') {
      throw new Error('layer name must be a non-empty string');
    }

    if (!layer || typeof layer.draw !== 'function') {
      throw new Error(`layer ${name} must provide a draw(ctx, frame) function`);
    }

    const zIndex = Number.isFinite(layer.zIndex) ? layer.zIndex : 0;

    this._layers.set(name, {
      ...layer,
      zIndex,
      enabled: layer.enabled !== false,
    });
  }

  /**
   * @param {string} name
   * @returns {void}
   */
  remove(name) {
    this._layers.delete(name);
  }

  /**
   * @param {string} name
   * @param {boolean} [enabled]
   * @returns {void}
   */
  enable(name, enabled = true) {
    const layer = this._layers.get(name);
    if (!layer) {
      return;
    }

    layer.enabled = Boolean(enabled);
  }

  /**
   * @returns {(RendererLayer & { name: string, zIndex: number, enabled: boolean })[]}
   */
  getOrdered() {
    return [...this._layers.entries()]
      .filter(([, layer]) => layer.enabled)
      .sort((a, b) => a[1].zIndex - b[1].zIndex)
      .map(([name, layer]) => ({ name, ...layer }));
  }
}
