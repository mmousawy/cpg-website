import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

const svgMock = `
export default function SvgMock() {
  return null;
}
`;

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
    // For integration tests hitting API routes
    testTimeout: 30000, // Increased for server startup
    // `.next/standalone` copies Next's own Jest tests; never run those.
    exclude: ['node_modules', '.next', 'e2e', '**/*.e2e.spec.ts', '**/*.e2e.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      public: path.resolve(__dirname, './public'),
    },
  },
});
