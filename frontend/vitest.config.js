/// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,      // allow `describe`, `it`, `expect` globally
    environment: 'jsdom' // simulate browser environment
  },
});
