import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = join(__dirname, '..')

describe('package entry imports', () => {
  // svelte-package ships `src/index.ts` as is; an extensionless import of a folder that has a
  // same-named file next to it in dist (standalone/ and standalone.css) made Vite's dependency
  // optimizer pick the CSS file and crash `npm run dev` in every app.
  it('names the file of every folder import that shares its name with a shipped file', () => {
    const source = readFileSync(join(root, 'src/index.ts'), 'utf8')
    const shipped = ['standalone.css', 'components.css', 'themes.css', 'styles.css']
    const offending = [...source.matchAll(/from '\.\/([\w/-]+)'/g)]
      .map((match) => match[1] as string)
      .filter((path) => {
        const folder = join(root, 'src', path)

        return (
          existsSync(folder) &&
          statSync(folder).isDirectory() &&
          shipped.some((file) => file.replace(/\.css$/, '') === path)
        )
      })

    expect(offending).toEqual([])
  })
})
