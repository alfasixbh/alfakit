import { svelte } from '@sveltejs/vite-plugin-svelte'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [svelte({ compilerOptions: { runes: true } })],
  resolve: {
    conditions: ['browser'],
    alias: {
      '@alfakit/core': fileURLToPath(new URL('../core/src/index.ts', import.meta.url)),
    },
  },
  test: {
    name: 'svelte',
    environment: 'jsdom',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    globalSetup: ['tests/ssr-global-setup.ts'],
    include: ['tests/**/*.test.ts'],
  },
})
