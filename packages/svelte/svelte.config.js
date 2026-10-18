import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/package').Config & { preprocess: unknown }} */
export default {
  preprocess: vitePreprocess({ script: true }),
  compilerOptions: { runes: true },
}
