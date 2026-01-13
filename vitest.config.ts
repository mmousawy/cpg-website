import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    // For integration tests hitting API routes
    testTimeout: 30000, // Increased for server startup
    exclude: ['node_modules', 'e2e', '**/*.e2e.spec.ts', '**/*.e2e.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  esbuild: {
    target: 'node18',
  },
});
