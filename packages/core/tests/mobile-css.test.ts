import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const themes = readFileSync(resolve(__dirname, '../themes.css'), 'utf8')

describe('mobile bottom preset', () => {
  // W-V3-15: an app's CSS build dropped `translate: none`, so the shadcn
  // `translate-x/y-[-50%]` utilities pushed the slide-over half off the screen.
  it('resets the translate variables of the centred dialog it turns into a slide-over', () => {
    const block = themes.match(
      /:root\[data-mobile='bottom'\] \[data-slot='dialog-content'\] \{([^}]*)\}/,
    )?.[1]

    expect(block).toContain('--tw-translate-x: 0;')
    expect(block).toContain('--tw-translate-y: 0;')
    expect(block).toContain('translate: none;')
  })
})
