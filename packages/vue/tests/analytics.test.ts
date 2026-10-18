import type { AnalyticsBreakdownWidgetSchema } from '@alfakit/core'
import { Translator, trackAnalyticsEvent } from '@alfakit/core'
import { mount } from '@vue/test-utils'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import AlfakitAnalytics from '../src/components/analytics/AlfakitAnalytics.vue'
import WidgetRenderer from '../src/components/widgets/WidgetRenderer.vue'
import { ALFAKIT_KEY } from '../src/context'
import { actions, flush, mountWithAlfakit, panel, registry } from './mocks'

const widget = (
  extra: Partial<AnalyticsBreakdownWidgetSchema> = {},
): AnalyticsBreakdownWidgetSchema => ({
  type: 'AnalyticsBreakdown',
  key: 'top-pages',
  id: 'top-pages',
  component: 'analytics:breakdown',
  columnSpan: { default: 1 },
  heading: 'Pages',
  panel: 'pages',
  tabs: [
    {
      key: 'page',
      label: 'Top pages',
      columns: ['Top pages', 'Visitors', 'Page views'],
      rows: [
        {
          key: 'page:/',
          value: '/',
          label: '/',
          visitors: 10,
          display: ['10', '14'],
          bar: 1,
          change: 25,
          changeDisplay: '+25%',
          url: '/admin/analytics?filter%5Bpage%5D=%2F',
          active: false,
        },
        {
          key: 'page:/pricing',
          value: '/pricing',
          label: '/pricing',
          visitors: 5,
          display: ['5', '6'],
          bar: 0.5,
          url: '/admin/analytics',
          active: true,
        },
      ],
    },
    {
      key: 'entry_page',
      label: 'Entry pages',
      columns: ['Entry pages', 'Visitors', 'Bounce rate'],
      rows: [],
    },
  ],
  emptyLabel: 'No data for this period',
  ...extra,
})

describe('analytics top lists', () => {
  it('renders rows as filter links with bars, numbers and changes', async () => {
    const wrapper = mountWithAlfakit(() => h(WidgetRenderer, { widget: widget() }))
    await flush()

    const card = document.querySelector('[data-slot="analytics-breakdown"]')!
    const rows = [...card.querySelectorAll('a[data-slot="analytics-row"]')] as HTMLElement[]

    expect(card.querySelector('h3')?.textContent).toBe('Pages')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.getAttribute('href')).toBe('/admin/analytics?filter%5Bpage%5D=%2F')
    expect(rows[0]!.textContent).toContain('Filter by /')
    expect(rows[0]!.textContent).toContain('+25%')
    expect(rows[1]!.getAttribute('aria-current')).toBe('true')
    expect(rows[1]!.textContent).toContain('Remove filter /pricing')
    expect((rows[1]!.querySelector('[aria-hidden="true"]') as HTMLElement).style.width).toBe('50%')
    wrapper.unmount()
  })

  it('opens the active tab, shows the empty state and hides a single tab list', async () => {
    let wrapper = mountWithAlfakit(() =>
      h(WidgetRenderer, { widget: widget({ activeTab: 'entry_page' }) }),
    )
    await flush()

    expect(document.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim()).toBe(
      'Entry pages',
    )
    expect(document.body.textContent).toContain('No data for this period')
    wrapper.unmount()

    wrapper = mountWithAlfakit(() =>
      h(WidgetRenderer, { widget: widget({ tabs: [widget().tabs[0]!] }) }),
    )
    await flush()

    expect(document.querySelector('[role="tablist"]')).toBeNull()
    wrapper.unmount()
  })

  it('renders on the server', async () => {
    const app = createSSRApp({ render: () => h(WidgetRenderer, { widget: widget() }) })
    app.provide(ALFAKIT_KEY, {
      registry,
      pages: {},
      actions,
      translator: new Translator(panel.translations),
    })
    const html = await renderToString(app)

    expect(html).toContain('data-slot="analytics-breakdown"')
    expect(html).toContain('/pricing')
  })
})

describe('analytics tracker', () => {
  it('sends a page view on mount and custom events until unmounted', () => {
    const beacons: string[] = []
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      value: (_url: string, body: string) => beacons.push(body) > 0,
    })

    const wrapper = mount(AlfakitAnalytics, { props: { siteKey: 'k3y', trackLocalhost: true } })
    trackAnalyticsEvent('Signup', { plan: 'pro' })

    expect(beacons.map((body) => JSON.parse(body).n)).toEqual(['pageview', 'Signup'])

    wrapper.unmount()
    trackAnalyticsEvent('Later')

    expect(beacons).toHaveLength(2)
  })
})
