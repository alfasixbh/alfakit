import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    server: 'src/server.tsx',
    // Subpath exports (`@alfakit/react/starter-kit`, `/kanban`, …): the same modules as the
    // root entry, for applications that import one area explicitly.
    'starter-kit/index': 'src/starter-kit/index.ts',
    'components/kanban/index': 'src/components/kanban/index.ts',
    'components/cms/index': 'src/components/cms/index.ts',
    'components/translation-manager/index': 'src/components/translation-manager/index.ts',
    'components/ai/index': 'src/components/ai/index.ts',
    'components/tree/index': 'src/components/tree/index.ts',
    'components/realtime/index': 'src/components/realtime/index.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  platform: 'browser',
  external: [/^react/, /^@inertiajs\//, /^@alfakit\/core/],
  // One output file per source module, so an application's bundler splits the renderer by
  // what each of its chunks uses: a starter kit host that only renders the navigation and
  // the header widgets must not pull the panel runtime into its main chunk.
  unbundle: true,
  report: { summary: true },
  copy: [
    { from: 'src/styles.css', to: 'dist' },
    { from: '../core/themes.css', to: 'dist' },
    { from: '../core/standalone.css', to: 'dist' },
  ],
})
