import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    // Component tests opt into a DOM via a per-file `// @vitest-environment happy-dom`.
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    // Re-point Node 26's stub `localStorage` global at the DOM window's (see file).
    setupFiles: ['tests/setup/dom-localstorage.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // server-only throws outside an RSC; stub it so spine adapters/registry are testable.
      'server-only': path.resolve(__dirname, 'tests/stubs/server-only.ts'),
    },
  },
});
