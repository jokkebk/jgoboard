import { defineConfig } from 'vite';
import { resolve } from 'path';

// This config is used for the dev server only
// Production builds are handled by scripts/build.js
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './JGO')
    }
  }
});
