import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@alfakit/core': fileURLToPath(new URL('../core/src/index.ts', import.meta.url)),
    },
  },
  test: {
    name: 'vue',
    environment: 'jsdom',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    globalSetup: ['tests/ssr-global-setup.ts'],
    include: ['tests/**/*.test.ts'],
  },
})
