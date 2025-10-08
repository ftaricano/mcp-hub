import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: ['tests/performance/**/*.test.ts'],
    testTimeout: 60000,
    maxConcurrency: 1,
  },
});