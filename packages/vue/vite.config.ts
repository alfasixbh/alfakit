import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// Every runtime dependency stays external (the consuming app bundles it); only the lazily
// loaded Lucide icon files, which are imported by path, are emitted (under `dist/lucide/`).
const EXTERNAL = [
  /^vue$/,
  /^vue\/server-renderer$/,
  /^@inertiajs\//,
  /^@alfakit\/core/,
  /^reka-ui/,
  /^@vueuse\//,
  /^@tiptap\//,
  /^chart\.js/,
  /^@fullcalendar\//,
  /^vue-sonner/,
  /^class-variance-authority/,
  /^clsx/,
  /^tailwind-merge/,
  /^date-fns/,
  /^@internationalized\//,
  /^@lucide\/vue$/,
]

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: {
        index: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
        // `@alfakit/vue/server`: the SSR entry, sharing chunks with the browser entry.
        server: fileURLToPath(new URL('./src/server.ts', import.meta.url)),
        // Subpath exports (`@alfakit/vue/starter-kit`, `/kanban`, …): the same modules as the
        // root entry, for applications that import one area explicitly.
        ...Object.fromEntries(
          [
            'starter-kit',
            'components/kanban',
            'components/cms',
            'components/translation-manager',
            'components/ai',
            'components/tree',
            'components/realtime',
          ].map((area) => [
            `${area}/index`,
            fileURLToPath(new URL(`./src/${area}/index.ts`, import.meta.url)),
          ]),
        ),
      },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
      cssFileName: 'vendor',
    },
    sourcemap: true,
    rolldownOptions: {
      external: EXTERNAL,
      output: {
        // One output file per source module (like `svelte-package`), so an application's
        // bundler splits the renderer by what each of its chunks uses: a starter kit host
        // that only renders the navigation and the header widgets must not pull the panel
        // runtime into its main chunk.
        preserveModules: true,
        preserveModulesRoot: fileURLToPath(new URL('./src', import.meta.url)),
        entryFileNames: (chunk) => {
          const lucide = chunk.facadeModuleId?.match(/@lucide\/vue\/dist\/esm\/(.+)\.mjs$/)

          if (lucide) return `lucide/${lucide[1]}.js`

          return chunk.name.includes('node_modules')
            ? `vendor/${chunk.name.replace(/^.*node_modules\//, '')}.js`
            : '[name].js'
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    },
  },
})
