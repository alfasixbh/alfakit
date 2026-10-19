import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const themes = readFileSync(resolve(__dirname, '../components.css'), 'utf8')

describe('calendar theme CSS', () => {
  // A Latin title in a right-to-left calendar lost its beginning ("ndup" for "Standup").
  it('keeps the start of clipped event titles, in either direction', () => {
    const rule =
      themes.match(/\.fc\[data-slot='calendar'\] \.fc-event-title \{([^}]*)\}/)?.[1] ?? ''

    expect(rule).toContain('unicode-bidi: plaintext')
    expect(rule).toContain('text-overflow: ellipsis')
  })
})
