import type { AnalyticsBreakdownWidgetSchema } from '@alfakit/core'
import { createAnalyticsTracker, trackAnalyticsEvent } from '@alfakit/core'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { AlfakitAnalytics } from '../src/components/analytics'
import { WidgetRenderer } from '../src/components/widgets/widgets-block'
import { Wrapper } from './mocks'

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
          change: -10,
          changeDisplay: '−10%',
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
    render(<WidgetRenderer widget={widget()} />, { wrapper: Wrapper })

    const card = document.querySelector('[data-slot="analytics-breakdown"]') as HTMLElement
    const rows = within(card).getAllByRole('link')

    expect(within(card).getByRole('heading', { name: 'Pages' })).toBeInTheDocument()
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveAttribute('href', '/admin/analytics?filter%5Bpage%5D=%2F')
    expect(rows[0]).toHaveTextContent('Filter by /')
    expect(rows[0]).toHaveTextContent('+25%')
    expect(rows[1]).toHaveAttribute('aria-current', 'true')
    expect(rows[1]).toHaveTextContent('Remove filter /pricing')
    expect((rows[0].querySelector('[aria-hidden="true"]') as HTMLElement).style.width).toBe('100%')
    expect((rows[1].querySelector('[aria-hidden="true"]') as HTMLElement).style.width).toBe('50%')
  })

  it('switches tabs and shows the empty state', () => {
    render(<WidgetRenderer widget={widget()} />, { wrapper: Wrapper })

    const tab = screen.getByRole('tab', { name: 'Entry pages' })
    fireEvent.mouseDown(tab)
    fireEvent.click(tab)

    expect(screen.getByRole('tab', { name: 'Entry pages' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByText('No data for this period')).toBeInTheDocument()
  })

  it('opens the active tab and hides the tab list for a single tab', () => {
    const { unmount } = render(<WidgetRenderer widget={widget({ activeTab: 'entry_page' })} />, {
      wrapper: Wrapper,
    })

    expect(screen.getByRole('tab', { name: 'Entry pages' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    unmount()

    render(<WidgetRenderer widget={widget({ tabs: [widget().tabs[0]!] })} />, { wrapper: Wrapper })

    expect(screen.queryByRole('tablist')).toBeNull()
  })

  it('renders on the server', () => {
    const html = renderToString(
      <Wrapper>
        <WidgetRenderer widget={widget()} />
      </Wrapper>,
    )

    expect(html).toContain('data-slot="analytics-breakdown"')
    expect(html).toContain('/pricing')
  })
})

describe('analytics tracker', () => {
  const beacons: Array<{ url: string; body: string }> = []

  beforeEach(() => {
    beacons.length = 0
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      value: (url: string, body: string) => {
        beacons.push({ url, body })

        return true
      },
    })
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'doNotTrack', { configurable: true, value: null })
    Object.defineProperty(navigator, 'globalPrivacyControl', {
      configurable: true,
      value: undefined,
    })
  })

  it('sends a page view on mount and custom events, without cookies', () => {
    const cookie = document.cookie
    const { unmount } = render(<AlfakitAnalytics siteKey="k3y" trackLocalhost />)

    trackAnalyticsEvent('Signup', { plan: 'pro' })

    expect(beacons).toHaveLength(2)
    expect(beacons[0]!.url).toBe('/alfakit-analytics/event')
    expect(JSON.parse(beacons[0]!.body)).toMatchObject({ k: 'k3y', n: 'pageview', p: null })
    expect(JSON.parse(beacons[1]!.body)).toMatchObject({ n: 'Signup', p: { plan: 'pro' } })
    expect(document.cookie).toBe(cookie)

    unmount()
    trackAnalyticsEvent('After unmount')

    expect(beacons).toHaveLength(2)
  })

  it('does not track localhost by default, nor browsers that opt out', () => {
    render(<AlfakitAnalytics siteKey="k3y" />)
    expect(beacons).toHaveLength(0)

    Object.defineProperty(navigator, 'doNotTrack', { configurable: true, value: '1' })
    expect(createAnalyticsTracker({ siteKey: 'k3y', trackLocalhost: true }).enabled).toBe(false)

    Object.defineProperty(navigator, 'doNotTrack', { configurable: true, value: null })
    Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value: true })
    expect(createAnalyticsTracker({ siteKey: 'k3y', trackLocalhost: true }).enabled).toBe(false)
  })

  it('records one page view per path', () => {
    const tracker = createAnalyticsTracker({
      siteKey: 'k3y',
      trackLocalhost: true,
      endpoint: '/collect',
    })

    tracker.pageview()
    tracker.pageview()

    expect(beacons).toHaveLength(1)
    expect(beacons[0]!.url).toBe('/collect')
  })
})
