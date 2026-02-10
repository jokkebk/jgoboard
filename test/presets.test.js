import assert from 'node:assert/strict';
import test from 'node:test';

import { bwMedium, kayaMedium, resolveTheme, walnutLarge } from '../src/presets.js';

test('kaya-medium theme has expected texture paths', () => {
  assert.equal(kayaMedium.textures.black, 'medium/black.png');
  assert.equal(kayaMedium.textures.white, 'medium/white.png');
  assert.equal(kayaMedium.textures.shadow, 'medium/shadow.png');
  assert.equal(kayaMedium.textures.board, 'medium/shinkaya.jpg');
});

test('walnut-large theme uses walnut board and dark shadow textures', () => {
  assert.equal(walnutLarge.textures.board, 'large/walnut.jpg');
  assert.equal(walnutLarge.textures.shadow, 'large/shadow_dark.png');
});

test('bw-medium disables textures', () => {
  assert.equal(bwMedium.textures, false);
});

test('resolveTheme returns named presets', () => {
  const resolved = resolveTheme('kaya-medium');
  assert.equal(resolved, kayaMedium);
});
