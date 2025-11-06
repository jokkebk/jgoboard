import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'main.js'),
      name: 'JGO',
      formats: ['es', 'umd', 'cjs'],
      fileName: (format) => {
        if (format === 'es') return 'jgoboard.js';
        if (format === 'cjs') return 'jgoboard.cjs';
        if (format === 'umd') return 'jgoboard.umd.js';
      }
    },
    outDir: 'dist',
    sourcemap: true,
    minify: false, // We'll create separate minified versions
    rollupOptions: {
      // Externalize dependencies that shouldn't be bundled
      external: [],
      output: {
        // Provide global variables for UMD build
        globals: {
          // Add any external dependencies here if needed
        },
        exports: 'named'
      }
    }
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      outDir: 'dist',
      include: ['JGO/**/*.js', 'main.js']
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './JGO')
    }
  }
});
