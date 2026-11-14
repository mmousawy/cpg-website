import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const svgMock = `
export default function SvgMock() {
  return null;
}
`;

/** Vitest config for scripts/generate-help-search-index.write.test.ts only (pnpm help:search-index). */
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'svg-mock',
      enforce: 'pre',
      resolveId(id) {
        const clean = id.split('?')[0];
        if (clean.endsWith('.svg')) return `\0svg:${clean}`;
        return null;
      },
      load(id) {
        if (id.startsWith('\0svg:')) return svgMock;
        return null;
      },
    },
  ],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['scripts/generate-help-search-index.write.test.ts'],
    exclude: ['**/node_modules/**', '**/.next/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      public: path.resolve(__dirname, './public'),
    },
  },
});
