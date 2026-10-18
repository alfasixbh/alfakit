import { hasIcon, resolveIcon } from '../src/lib/icons'

describe('icons', () => {
  it('resolves current Lucide names', async () => {
    expect(hasIcon('funnel')).toBe(true)
    // The name → chunk map loads on first use.
    await vi.waitFor(() => expect(resolveIcon('shopping-cart')).not.toBeNull())
  })

  // @lucide/vue ships legacy names only as index exports; PHP code (and the other renderers)
  // still use them, e.g. the dashboard's "Apply filters" action has icon('filter').
  it('resolves legacy Lucide aliases like React and Svelte do', () => {
    for (const name of ['filter', 'trash-2', 'home', 'alert-triangle', 'loader-2', 'edit']) {
      expect(hasIcon(name), name).toBe(true)
      expect(resolveIcon(name), name).not.toBeNull()
    }
  })

  it('returns null for unknown names', () => {
    expect(hasIcon('not-an-icon')).toBe(false)
    expect(resolveIcon('not-an-icon')).toBeNull()
  })
})
