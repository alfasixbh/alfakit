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

  // FullCalendar's `opacity: 0.3` on other months' dates failed axe colour contrast (W-V4-20).
  it("shows other months' dates at full opacity in the muted colour", () => {
    const rule =
      themes.match(
        /\.fc\[data-slot='calendar'\] \.fc-day-other \.fc-daygrid-day-top \{([^}]*)\}/,
      )?.[1] ?? ''

    expect(rule).toContain('opacity: 1')
  })

  // The dev buttons covered the helpdesk inbox's Send button (W-S4-09).
  it('lifts the floating dev-tool buttons above the helpdesk composer', () => {
    expect(themes).toMatch(
      /body:has\(\[data-slot='helpdesk-inbox'\]\) \[data-slot='dev-tools-toggle'\],\s*body:has\(\[data-slot='helpdesk-inbox'\]\) \[data-slot='starter-kit-debug-panel'\] \{\s*bottom: 14rem;/,
    )
  })
})
