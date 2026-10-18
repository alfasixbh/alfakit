import { describe, expect, it, vi } from 'vitest'
import { ComponentDiscovery, discoveryKey, schemaComponentNames } from '../src/discovery'

describe('discoveryKey', () => {
  it.each([
    ['./fields/ColorWheel.tsx', 'ColorWheel', 'components'],
    ['./fields/shop/ColorWheel.vue', 'ColorWheel', 'components'],
    ['./fields/ColorWheel/index.svelte', 'ColorWheel', 'components'],
    ['./columns/ProgressBar.tsx', 'column:ProgressBar', 'components'],
    ['./entries/StarRating.tsx', 'StarRating', 'components'],
    ['./widgets/RevenueChart.tsx', 'RevenueChart', 'components'],
    ['./components/map-picker.tsx', 'map-picker', 'components'],
    ['./blocks/pricing.tsx', 'cms:block:pricing', 'components'],
    ['./pages/Settings.tsx', 'Pages/Settings', 'pages'],
    ['./pages/Billing/Invoices.tsx', 'Pages/Billing/Invoices', 'pages'],
    ['./alfakit/fields/ColorWheel.tsx', 'ColorWheel', 'components'],
    ['/resources/js/alfakit/fields/ColorWheel.tsx', 'ColorWheel', 'components'],
  ])('%s → %s', (path, key, section) => {
    expect(discoveryKey(path)).toMatchObject({ key, section })
  })

  it.each([
    './app.tsx',
    './lib/helpers.tsx',
    './fields/_shared/Base.tsx',
    './fields/_Base.tsx',
    './fields/ColorWheel.test.tsx',
    './fields/ColorWheel.stories.tsx',
    './fields/types.d.ts',
  ])('ignores %s', (path) => {
    expect(discoveryKey(path)).toBeNull()
  })
})

describe('ComponentDiscovery', () => {
  it('loads lazy files on demand and takes their default export', async () => {
    const ColorWheel = { name: 'ColorWheel' }
    const loader = vi.fn(() => Promise.resolve({ default: ColorWheel }))
    const discovery = new ComponentDiscovery({ './fields/ColorWheel.tsx': loader })
    const entry = discovery.components.get('ColorWheel')!

    expect(loader).not.toHaveBeenCalled()
    expect(entry.current).toBeUndefined()
    expect(await entry.load()).toBe(ColorWheel)
    expect(entry.current).toBe(ColorWheel)
    await entry.load()
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('uses eager modules straight away', () => {
    const Page = { name: 'Settings' }
    const discovery = new ComponentDiscovery({ './pages/Settings.tsx': { default: Page } })

    expect(discovery.pages.get('Pages/Settings')?.current).toBe(Page)
  })

  it('reports a missing default export when the file loads', async () => {
    const discovery = new ComponentDiscovery({
      './fields/Named.tsx': () => Promise.resolve({ Named: {} }),
    })

    await expect(discovery.components.get('Named')!.load()).rejects.toThrow(
      './fields/Named.tsx has no default export',
    )
  })

  it('warns about collisions and keeps the first file', () => {
    const warn = vi.fn()
    const discovery = new ComponentDiscovery(
      {
        './fields/shop/ColorWheel.tsx': () => Promise.resolve({ default: 'b' }),
        './fields/ColorWheel.tsx': () => Promise.resolve({ default: 'a' }),
        './entries/ColorWheel.tsx': () => Promise.resolve({ default: 'c' }),
      },
      { warn },
    )

    expect(discovery.components.get('ColorWheel')?.path).toBe('./entries/ColorWheel.tsx')
    expect(warn).toHaveBeenCalledTimes(2)
    expect(warn.mock.calls[0]![0]).toContain(
      '"./entries/ColorWheel.tsx" and "./fields/ColorWheel.tsx" both auto-register the component "ColorWheel"',
    )
  })

  it('preloads only what a page uses', async () => {
    const loaders = {
      './fields/ColorWheel.tsx': vi.fn(() => Promise.resolve({ default: 'wheel' })),
      './columns/ProgressBar.tsx': vi.fn(() => Promise.resolve({ default: 'bar' })),
      './blocks/pricing.tsx': vi.fn(() => Promise.resolve({ default: 'pricing' })),
      './pages/Settings.tsx': vi.fn(() => Promise.resolve({ default: 'settings' })),
      './widgets/Unused.tsx': vi.fn(() => Promise.resolve({ default: 'unused' })),
    }
    const discovery = new ComponentDiscovery(loaders)
    const page = {
      component: 'Alfakit/Page',
      props: {
        page: {
          view: { component: 'Pages/Settings' },
          content: [
            { type: 'Form', components: [{ type: 'ColorWheel', key: 'color' }] },
            { type: 'Table', columns: [{ type: 'ProgressBar', name: 'progress' }] },
          ],
        },
        cms: { blocks: [{ type: 'pricing', id: 'b1', data: {} }] },
      },
    }

    await discovery.preloadFor(page)

    expect(loaders['./fields/ColorWheel.tsx']).toHaveBeenCalled()
    expect(loaders['./columns/ProgressBar.tsx']).toHaveBeenCalled()
    expect(loaders['./blocks/pricing.tsx']).toHaveBeenCalled()
    expect(loaders['./pages/Settings.tsx']).toHaveBeenCalled()
    expect(loaders['./widgets/Unused.tsx']).not.toHaveBeenCalled()
    // Everything it needs is loaded now: nothing to wait for.
    expect(discovery.preloadFor(page)).toBeUndefined()
  })

  it('collects schema names from nested props', () => {
    expect([
      ...schemaComponentNames({ a: [{ type: 'X', b: { component: 'Y', view: 'Z' } }], type: 1 }),
    ]).toEqual(expect.arrayContaining(['X', 'Y', 'Z']))
  })
})
