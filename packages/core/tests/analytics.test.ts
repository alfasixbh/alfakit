import { describe, expect, it } from 'vitest'
import { analyticsChangeColor, analyticsInitialTab, createAnalyticsTracker } from '../src/analytics'
import type { AnalyticsBreakdownWidgetSchema } from '../src/schema/analytics'

const widget = (activeTab?: string | null): AnalyticsBreakdownWidgetSchema => ({
  type: 'AnalyticsBreakdown',
  key: 'w',
  id: 'w',
  component: 'analytics:breakdown',
  columnSpan: { default: 1 },
  heading: 'Events',
  panel: 'events',
  activeTab,
  tabs: [
    { key: 'event', label: 'Event', columns: [], rows: [] },
    { key: 'prop:Signup:plan', label: 'Property: plan', columns: [], rows: [] },
  ],
})

describe('analytics helpers', () => {
  it('opens the active tab when it exists, else the first', () => {
    expect(analyticsInitialTab(widget('prop:Signup:plan'))).toBe('prop:Signup:plan')
    expect(analyticsInitialTab(widget('gone'))).toBe('event')
    expect(analyticsInitialTab(widget(null))).toBe('event')
  })

  it('colours changes', () => {
    expect(analyticsChangeColor(12)).toBe('success')
    expect(analyticsChangeColor(-3)).toBe('danger')
    expect(analyticsChangeColor(0)).toBeNull()
    expect(analyticsChangeColor(null)).toBeNull()
  })

  it('is disabled without a site key', () => {
    expect(createAnalyticsTracker({ siteKey: '', trackLocalhost: true }).enabled).toBe(false)
  })
})
