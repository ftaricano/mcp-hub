import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: ['tests/e2e/**/*.test.ts'],
    testTimeout: 30000,
    maxConcurrency: 2,
  },
});