#!/usr/bin/env node

import { build } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const entry = resolve(__dirname, '../main.js');

async function buildAll() {
  try {
    console.log('🔨 Building ESM + CJS (unminified)...');

    // 1) ESM + CJS (unminified; let app bundlers minify)
    await build({
      build: {
        lib: {
          entry,
          formats: ['es', 'cjs']
        },
        rollupOptions: {
          external: [],
          output: [
            {
              format: 'es',
              entryFileNames: 'jgoboard.js',
              preserveModules: false
            },
            {
              format: 'cjs',
              entryFileNames: 'jgoboard.cjs',
              exports: 'named',
              interop: 'auto',
              preserveModules: false
            }
          ]
        },
        minify: false,
        sourcemap: true,
        emptyOutDir: true,
        outDir: 'dist'
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
          '@': resolve(__dirname, '../JGO')
        }
      }
    });

    console.log('✅ ESM + CJS complete\n');

    console.log('🔨 Building UMD (minified)...');

    // 2) UMD (minified + sourcemap for browsers/CDNs)
    await build({
      build: {
        lib: {
          entry,
          name: 'JGO',
          formats: ['umd'],
          fileName: () => 'jgoboard.umd.min.js'
        },
        rollupOptions: {
          external: [],
          output: {
            globals: {}
          }
        },
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: false,
            drop_debugger: true
          },
          format: {
            comments: false,
            preamble:
              '/*! jGoBoard - (c) Joonas Pihlajamaa - Licensed under CC-BY-NC-4.0 */'
          }
        },
        sourcemap: true,
        emptyOutDir: false,
        outDir: 'dist'
      },
      resolve: {
        alias: {
          '@': resolve(__dirname, '../JGO')
        }
      }
    });

    console.log('✅ UMD complete\n');
    console.log('🎉 All builds completed successfully!');
    console.log('\nGenerated files:');
    console.log('  - jgoboard.js (ESM, unminified)');
    console.log('  - jgoboard.cjs (CJS, unminified)');
    console.log('  - jgoboard.umd.min.js (UMD, minified)');
    console.log('  - Source maps for all formats');
    console.log('  - index.d.ts (TypeScript definitions)');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildAll();
