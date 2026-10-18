import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@alfakit/core': fileURLToPath(new URL('../core/src/index.ts', import.meta.url)),
    },
  },
  test: {
    name: 'react',
    environment: 'jsdom',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    globalSetup: ['tests/ssr-global-setup.ts'],
    include: ['tests/**/*.test.tsx', 'tests/**/*.test.ts'],
  },
})
