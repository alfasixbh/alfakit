import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'core',
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
})
