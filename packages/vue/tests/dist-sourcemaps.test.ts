import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// W-V-01: apps scan `dist` with Tailwind's `@source`; the JSON-escaped classes in the maps'
// `sourcesContent` produced invalid CSS ("Unexpected token String") on every app build.
it('builds source maps without the sources', () => {
  const config = readFileSync(resolve(__dirname, '../vite.config.ts'), 'utf8')

  expect(config).toMatch(/sourcemapExcludeSources:\s*true/)
})
