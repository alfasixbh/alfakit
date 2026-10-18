import type { AnalyticsBreakdownWidgetSchema } from '@alfakit/core'
import { trackAnalyticsEvent } from '@alfakit/core'
import { fireEvent, render, screen, within } from '@testing-library/svelte'
import AlfakitAnalytics from '../src/components/analytics/AlfakitAnalytics.svelte'
import WidgetRenderer from '../src/components/widgets/WidgetRenderer.svelte'
import Wrapper from './Wrapper.svelte'

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
  it('renders rows as filter links with bars, numbers and changes', () => {
    render(Wrapper, { props: { component: WidgetRenderer, props: { widget: widget() } } })

    const card = document.querySelector('[data-slot="analytics-breakdown"]') as HTMLElement
    const rows = within(card).getAllByRole('link')

    expect(within(card).getByRole('heading', { name: 'Pages' })).toBeInTheDocument()
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveAttribute('href', '/admin/analytics?filter%5Bpage%5D=%2F')
    expect(rows[0]).toHaveTextContent('Filter by /')
    expect(rows[0]).toHaveTextContent('+25%')
    expect(rows[1]).toHaveAttribute('aria-current', 'true')
    expect(rows[1]).toHaveTextContent('Remove filter /pricing')
    expect((rows[1]!.querySelector('[aria-hidden="true"]') as HTMLElement).style.width).toBe('50%')
  })

  it('switches tabs and shows the empty state', async () => {
    render(Wrapper, { props: { component: WidgetRenderer, props: { widget: widget() } } })

    const tab = screen.getByRole('tab', { name: 'Entry pages' })
    await fireEvent.pointerDown(tab)
    await fireEvent.mouseDown(tab)
    await fireEvent.click(tab)

    expect(screen.getByRole('tab', { name: 'Entry pages' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByText('No data for this period')).toBeInTheDocument()
  })

  it('opens the active tab and hides the tab list for a single tab', () => {
    const { unmount } = render(Wrapper, {
      props: { component: WidgetRenderer, props: { widget: widget({ activeTab: 'entry_page' }) } },
    })

    expect(screen.getByRole('tab', { name: 'Entry pages' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    unmount()

    render(Wrapper, {
      props: {
        component: WidgetRenderer,
        props: { widget: widget({ tabs: [widget().tabs[0]!] }) },
      },
    })

    expect(screen.queryByRole('tablist')).toBeNull()
  })
})

describe('analytics tracker', () => {
  it('sends a page view on mount and custom events until unmounted', () => {
    const beacons: string[] = []
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      value: (_url: string, body: string) => beacons.push(body) > 0,
    })

    const { unmount } = render(AlfakitAnalytics, {
      props: { siteKey: 'k3y', trackLocalhost: true },
    })
    trackAnalyticsEvent('Signup', { plan: 'pro' })

    expect(beacons.map((body) => JSON.parse(body).n)).toEqual(['pageview', 'Signup'])

    unmount()
    trackAnalyticsEvent('Later')

    expect(beacons).toHaveLength(2)
  })
})
