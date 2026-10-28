import type { PageSchema } from '@alfakit/core'
import { h } from 'vue'
import AppLayout from '../src/layouts/AppLayout.vue'
import FullscreenLayout from '../src/layouts/FullscreenLayout.vue'
import { mountWithAlfakit, panel, setPageProps } from './mocks'

// The top bar must never make the page scroll sideways (768px window, sidebar open, an app's
// `topbar.end` item): these are the classes that keep it inside the screen.
const classes = (element: Element | null | undefined) => [...(element?.classList ?? [])]

const mountLayout = (layout: 'sidebar' | 'topbar') => {
  setPageProps({
    alfakit: {
      ...panel,
      theme: { ...panel.theme!, design: { ...panel.theme!.design, layout } },
      globalSearch: { keyBindings: ['mod+k'], placeholder: 'Search' },
      navigation: [
        { collapsible: false, items: [{ label: 'Dashboard', url: '/admin', active: true }] },
      ],
      slots: { 'topbar.end': [{ type: 'html', html: '<span>Theme picker</span>' }] },
    },
  })

  return mountWithAlfakit(() => h(AppLayout, null, () => h('p', 'Body')))
}

const fullscreenPage: PageSchema = {
  class: 'App\\Pages\\Pos',
  layout: 'fullscreen',
  title: 'Point of sale',
  token: 'page-token',
  fullscreen: { header: true, exitUrl: '/admin' },
  content: [],
}

afterEach(() => {
  setPageProps({ alfakit: panel })
  document.body.innerHTML = ''
})

describe('top bar overflow', () => {
  it.each(['sidebar', 'topbar'] as const)(
    'clips the %s bar and lets the slot items shrink first',
    (layout) => {
      const wrapper = mountLayout(layout)
      const bar = wrapper.element.ownerDocument.querySelector('header[data-slot="topbar"]')!

      expect(classes(bar)).toEqual(expect.arrayContaining(['overflow-x-clip']))
      expect(
        bar.matches('.\\@container\\/topbar') || bar.querySelector('.\\@container\\/topbar'),
      ).toBeTruthy()

      const slot = bar.querySelector('[data-slot-name="topbar.end"]')!
      expect(classes(slot)).toEqual(expect.arrayContaining(['flex', 'min-w-0', 'overflow-hidden']))
      expect(classes(slot)).not.toContain('contents')
      expect(classes(slot.parentElement)).toEqual(expect.arrayContaining(['min-w-0']))
      expect(classes(slot.parentElement)).not.toContain('shrink-0')
      wrapper.unmount()
    },
  )

  it.each(['sidebar', 'topbar'] as const)(
    'folds the search field into an icon button in a narrow %s bar',
    (layout) => {
      const wrapper = mountLayout(layout)
      const search = document.querySelector('header[data-slot="topbar"] [data-variant="topbar"]')!

      expect(classes(search)).toEqual(
        expect.arrayContaining(['sm:w-56', '@max-4xl/topbar:w-8', '@max-4xl/topbar:px-0']),
      )
      expect(classes(search.querySelector('span'))).toEqual(
        expect.arrayContaining(['@max-4xl/topbar:sr-only']),
      )
      wrapper.unmount()
    },
  )

  it('moves the top navigation links into the drawer below lg', () => {
    const wrapper = mountLayout('topbar')
    const nav = document.querySelector('[data-slot="topnav"]')!
    const menu = document.querySelector('header button[aria-label="Toggle sidebar"]')!
    const brand = document.querySelector('header a[href="http://localhost/admin"]')!

    expect(classes(nav)).toEqual(expect.arrayContaining(['hidden', 'lg:flex']))
    expect(classes(nav)).not.toContain('md:flex')
    expect(classes(menu)).toEqual(expect.arrayContaining(['lg:hidden']))
    // The brand gives way on phones instead of pushing the user menu off screen.
    expect(classes(brand)).toEqual(expect.arrayContaining(['min-w-0', 'sm:shrink-0']))
    wrapper.unmount()
  })

  it('clips the fullscreen layout bar the same way', () => {
    setPageProps({
      alfakit: {
        ...panel,
        slots: { 'topbar.end': [{ type: 'html', html: '<span>Badge</span>' }] },
      },
    })
    const wrapper = mountWithAlfakit(() =>
      h(FullscreenLayout, { page: fullscreenPage }, { default: () => h('p', 'Register') }),
    )

    const bar = document.querySelector('header[data-slot="topbar"][data-variant="fullscreen"]')!
    const slot = bar.querySelector('[data-slot-name="topbar.end"]')!

    expect(classes(bar)).toContain('overflow-x-clip')
    expect(classes(slot)).toEqual(expect.arrayContaining(['flex', 'min-w-0', 'overflow-hidden']))
    expect(classes(slot.parentElement)).toContain('min-w-0')
    wrapper.unmount()
  })
})
