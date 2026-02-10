import assert from 'node:assert/strict';
import test from 'node:test';

import { getAssetBaseUrl, setAssetBaseUrl } from '../src/renderer.js';

test('setAssetBaseUrl stores global asset base URL', () => {
  setAssetBaseUrl('https://cdn.jsdelivr.net/npm/jgoboard@5.0.0/');
  assert.equal(getAssetBaseUrl(), 'https://cdn.jsdelivr.net/npm/jgoboard@5.0.0/');
});

test('setAssetBaseUrl clears global asset base URL with null-ish values', () => {
  setAssetBaseUrl('https://example.com/assets/');
  setAssetBaseUrl(null);
  assert.equal(getAssetBaseUrl(), null);
});
