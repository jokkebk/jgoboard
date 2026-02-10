# Framework Integration

jGoBoard is a vanilla JavaScript library with an imperative API. It works with any framework — mount it into a DOM ref and clean up on unmount.

## React

```jsx
import { useRef, useEffect } from 'react';
import { createPlayer } from 'jgoboard/player';

function GoPlayer({ sgf }) {
  const ref = useRef(null);

  useEffect(() => {
    const player = createPlayer(ref.current, {
      sgf,
      theme: 'bw-medium',
    });
    player.whenReady();
    return () => player.destroy();
  }, [sgf]);

  return <div ref={ref} />;
}
```

## Vue

```vue
<template>
  <div ref="container" />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { createPlayer } from 'jgoboard/player';

const props = defineProps({ sgf: String });
const container = ref(null);
let player;

onMounted(() => {
  player = createPlayer(container.value, {
    sgf: props.sgf,
    theme: 'bw-medium',
  });
  player.whenReady();
});

onBeforeUnmount(() => {
  player?.destroy();
});
</script>
```

## Svelte

```svelte
<script>
  import { onMount } from 'svelte';
  import { createPlayer } from 'jgoboard/player';

  export let sgf;
  let container;

  onMount(() => {
    const player = createPlayer(container, {
      sgf,
      theme: 'bw-medium',
    });
    player.whenReady();
    return () => player.destroy();
  });
</script>

<div bind:this={container} />
```

## Using the Renderer Directly

If you need lower-level control (e.g. a board editor), use `createRenderer` instead of `createPlayer`:

```js
import { createBoard, createRenderer, STONE } from 'jgoboard';

const board = createBoard({ size: 19 });
const renderer = createRenderer(containerElement, {
  board,
  theme: 'bw-medium',
});

await renderer.whenReady();
renderer.render();

// Update the board programmatically — the renderer auto-updates via onChange
board.setStone('D4', STONE.BLACK);
```

Call `renderer.destroy()` on unmount, same as with the player.

## Notes

- Both `createPlayer` and `createRenderer` accept a CSS selector string or a DOM element as the first argument.
- The `bw-medium` theme needs no texture images. Textured themes (`kaya-*`, `walnut-*`) resolve asset URLs relative to the jGoBoard module/script location.
- If you host texture files in a custom location, pass `assetBaseUrl` in renderer/player options.
- The library is tree-shakeable: import only the subpath you need (`jgoboard/player`, `jgoboard/core`, etc.) to minimize bundle size.
