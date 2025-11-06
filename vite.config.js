import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

const isMinify = process.env.MINIFY === 'true';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'main.js'),
      name: 'JGO',
      formats: ['es', 'umd', 'cjs'],
      fileName: (format) => {
        const suffix = isMinify ? '.min' : '';
        if (format === 'es') return `jgoboard${suffix}.js`;
        if (format === 'cjs') return `jgoboard${suffix}.cjs`;
        if (format === 'umd') return `jgoboard.umd${suffix}.js`;
      }
    },
    outDir: 'dist',
    emptyOutDir: !isMinify, // Don't clear dist on minified build
    sourcemap: true,
    minify: isMinify ? 'terser' : false,
    terserOptions: isMinify ? {
      compress: {
        drop_console: false,
        drop_debugger: true
      },
      format: {
        comments: false,
        preamble: '/*! jGoBoard - (c) Joonas Pihlajamaa - Licensed under CC-BY-NC-4.0 */'
      }
    } : undefined,
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
