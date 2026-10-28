import type { PageSchema, PanelSchema } from '@alfakit/core'
import { render } from '@testing-library/svelte'
import AppFullscreenHarness from './AppFullscreenHarness.svelte'
import ChromeHarness from './ChromeHarness.svelte'
import { panel, setPageProps } from './mocks'
import Wrapper from './Wrapper.svelte'

// The top bar must never make the page scroll sideways (768px window, sidebar open, an app's
// `topbar.end` item): these are the classes that keep it inside the screen.
const renderLayout = (layout: 'sidebar' | 'topbar') => {
  setPageProps({
    alfakit: {
      ...panel,
      theme: { ...panel.theme!, design: { ...panel.theme!.design, layout } },
      globalSearch: { keyBindings: ['mod+k'], placeholder: 'Search' },
      navigation: [{ items: [{ label: 'Dashboard', url: '/admin', active: true }] }],
      slots: { 'topbar.end': [{ type: 'html', html: '<span>Theme picker</span>' }] },
    } as PanelSchema,
  })

  return render(ChromeHarness, { props: { kind: 'app' } }).container
}

const fullscreenPage: PageSchema = {
  class: 'App\\Pages\\Pos',
  layout: 'fullscreen',
  title: 'Point of sale',
  token: 'page-token',
  fullscreen: { header: true, exitUrl: '/admin' },
  content: [],
}

afterEach(() => setPageProps({ alfakit: panel }))

describe('top bar overflow', () => {
  it.each(['sidebar', 'topbar'] as const)(
    'clips the %s bar and lets the slot items shrink first',
    (layout) => {
      const container = renderLayout(layout)
      const bar = container.querySelector('header[data-slot="topbar"]')!

      expect(bar).toHaveClass('overflow-x-clip')
      expect(
        bar.matches('.\\@container\\/topbar') || bar.querySelector('.\\@container\\/topbar'),
      ).toBeTruthy()

      const slot = bar.querySelector('[data-slot-name="topbar.end"]')!
      expect(slot).toHaveClass('flex', 'min-w-0', 'overflow-hidden')
      expect(slot).not.toHaveClass('contents')
      expect(slot.parentElement).toHaveClass('min-w-0')
      expect(slot.parentElement).not.toHaveClass('shrink-0')
    },
  )

  it.each(['sidebar', 'topbar'] as const)(
    'folds the search field into an icon button in a narrow %s bar',
    (layout) => {
      const search = renderLayout(layout).querySelector(
        'header[data-slot="topbar"] [data-variant="topbar"]',
      )!

      expect(search).toHaveClass('sm:w-56', '@max-4xl/topbar:w-8', '@max-4xl/topbar:px-0')
      expect(search.querySelector('span')).toHaveClass('@max-4xl/topbar:sr-only')
    },
  )

  it('moves the top navigation links into the drawer below lg', () => {
    const container = renderLayout('topbar')
    const nav = container.querySelector('[data-slot="topnav"]')!
    const menu = container.querySelector('header button[aria-label="Toggle sidebar"]')!
    const brand = container.querySelector('header a[href="http://localhost/admin"]')!

    expect(nav).toHaveClass('hidden', 'lg:flex')
    expect(nav).not.toHaveClass('md:flex')
    expect(menu).toHaveClass('lg:hidden')
    // The brand gives way on phones instead of pushing the user menu off screen.
    expect(brand).toHaveClass('min-w-0', 'sm:shrink-0')
  })

  it('clips the fullscreen layout bar the same way', () => {
    setPageProps({
      alfakit: {
        ...panel,
        slots: { 'topbar.end': [{ type: 'html', html: '<span>Badge</span>' }] },
      },
    })
    const { container } = render(Wrapper, {
      props: { component: AppFullscreenHarness, props: { page: fullscreenPage } },
    })

    const bar = container.querySelector('header[data-slot="topbar"][data-variant="fullscreen"]')!
    const slot = bar.querySelector('[data-slot-name="topbar.end"]')!

    expect(bar).toHaveClass('overflow-x-clip')
    expect(slot).toHaveClass('flex', 'min-w-0', 'overflow-hidden')
    expect(slot.parentElement).toHaveClass('min-w-0')
  })
})
