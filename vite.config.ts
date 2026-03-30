import { builtinModules } from 'node:module';
import path from 'node:path';
import { defineConfig } from 'vite';

const NODE_BUILTINS = new Set([
  ...builtinModules,
  ...builtinModules.map(moduleName => `node:${moduleName}`),
]);

function preserveCliShebang() {
  const shebang = '#!/usr/bin/env node';

  return {
    name: 'preserve-cli-shebang',
    renderChunk(code: string, chunk: { isEntry: boolean; name: string }) {
      if (!chunk.isEntry || chunk.name !== 'cli') {
        return null;
      }

      return {
        code: `${shebang}\n${code.replace(/^#!.*\n/, '')}`,
        map: null,
      };
    },
  };
}

export default defineConfig({
  build: {
    lib: {
      entry: {
        cli: path.resolve(__dirname, 'src/cli.ts'),
        main: path.resolve(__dirname, 'src/main.ts'),
      },
      formats: ['cjs'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    minify: 'esbuild',
    outDir: 'dist',
    reportCompressedSize: false,
    sourcemap: false,
    target: 'node20',
    rollupOptions: {
      external: source => NODE_BUILTINS.has(source),
      output: {
        chunkFileNames: 'chunks/[name]-[hash].js',
        entryFileNames: '[name].js',
        exports: 'named',
      },
      plugins: [preserveCliShebang()],
    },
  },
});
