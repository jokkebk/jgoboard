export class LayerRegistry {
  constructor() {
    this._layers = new Map();
  }

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

  remove(name) {
    this._layers.delete(name);
  }

  enable(name, enabled = true) {
    const layer = this._layers.get(name);
    if (!layer) {
      return;
    }

    layer.enabled = Boolean(enabled);
  }

  getOrdered() {
    return [...this._layers.entries()]
      .filter(([, layer]) => layer.enabled)
      .sort((a, b) => a[1].zIndex - b[1].zIndex)
      .map(([name, layer]) => ({ name, ...layer }));
  }
}
