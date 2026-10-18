import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['packages/core', 'packages/react', 'packages/vue', 'packages/svelte'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['packages/*/src/**'],
    },
  },
})
