import { defineConfig } from 'vite';

// base './' lets the build work on GitHub Pages under /<repo>/
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 1500 },
  server: { port: 5173 },
  test: { include: ['tests/unit/**/*.test.ts'] },
} as Parameters<typeof defineConfig>[0]);
