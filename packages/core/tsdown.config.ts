import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: { index: 'src/index.ts', 'schema/index': 'src/schema/index.ts' },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  platform: 'browser',
  external: ['@inertiajs/core'],
  // One output file per source module, so an application's bundler can split the code by
  // what each of its chunks uses (a host page reading the starter kit navigation must not
  // carry the panel's table, form and rich editor state).
  unbundle: true,
  // Only report the total: unbundled, the package emits a file per module.
  report: { summary: true },
})
