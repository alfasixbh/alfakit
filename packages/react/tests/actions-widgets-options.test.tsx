import type { ChartFiltersFormSchema, StatsOverviewWidgetSchema } from '@alfakit/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { toast } from 'sonner'
import { ActionList } from '../src/components/actions/action-list'
import { NotificationActionButton, showToast } from '../src/components/notifications/flash-toasts'
import { ChartFilters } from '../src/components/widgets/chart-filters'
import { WidgetRenderer } from '../src/components/widgets/widgets-block'
import { Wrapper } from './mocks'

function statWidget(position?: 'after'): StatsOverviewWidgetSchema {
  return {
    type: 'StatsOverviewWidget',
    key: 'stats',
    id: 'stats',
    columnSpan: { default: 1 },
    stats: [
      {
        label: 'Orders',
        value: '3',
        description: 'Up 3%',
        // Inline SVG renders synchronously (named icons load lazily).
        descriptionIcon: '<svg viewBox="0 0 1 1"></svg>',
        descriptionIconPosition: position,
      },
    ],
  }
}

function descriptionHtml(): string {
  return screen.getByText('Up 3%', { exact: false }).closest('span')!.innerHTML
}

describe('actions, notifications and widgets options', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('renders the stat description icon before or after the description', () => {
    const { unmount } = render(
      <Wrapper>
        <WidgetRenderer widget={statWidget()} />
      </Wrapper>,
    )
    const before = descriptionHtml()
    expect(before.indexOf('data-slot="icon"')).toBeGreaterThanOrEqual(0)
    expect(before.indexOf('data-slot="icon"')).toBeLessThan(before.indexOf('Up 3%'))
    unmount()

    render(
      <Wrapper>
        <WidgetRenderer widget={statWidget('after')} />
      </Wrapper>,
    )
    const after = descriptionHtml()
    expect(after.indexOf('data-slot="icon"')).toBeGreaterThan(after.indexOf('Up 3%'))
  })

  it('tints a toast with the notification colour', () => {
    const success = vi.spyOn(toast, 'success')

    showToast({ id: 'n1', title: 'Saved', status: 'success', color: 'success', format: 'alfakit' })

    const options = success.mock.calls[0]![1] as { style?: Record<string, string> }
    expect(options.style?.['--normal-bg']).toContain('var(--success)')
  })

  it('sizes notification action buttons', () => {
    render(
      <Wrapper>
        <NotificationActionButton
          action={{ name: 'view', label: 'View', variant: 'button', size: 'sm' }}
        />
        <NotificationActionButton action={{ name: 'open', label: 'Open', variant: 'button' }} />
      </Wrapper>,
    )

    expect(screen.getByRole('button', { name: 'View' }).className).toContain('h-8')
    expect(screen.getByRole('button', { name: 'Open' }).className).toContain('h-7')
  })

  it('renders a badge trigger with badge()', () => {
    render(
      <Wrapper>
        <ActionList
          actions={[
            {
              type: 'Action',
              name: 'edit',
              label: 'Edit',
              variant: 'badge',
              color: 'success',
              hasAction: true,
            },
          ]}
          context={{ token: 't', component: 'page' }}
        />
      </Wrapper>,
    )

    const button = screen.getByRole('button', { name: 'Edit' })
    expect(button.className).toContain('bg-success/10')
    expect(button.className).toContain('text-xs')
  })

  it('restyles and hides chart filter buttons from the server', () => {
    const form: ChartFiltersFormSchema = {
      components: [],
      state: {},
      queryKey: 'chartFilters',
      deferred: true,
      triggerActions: {
        filtersApply: { label: 'Update chart', variant: 'button', color: 'success' },
        filtersReset: { hidden: true },
      },
    }

    render(
      <Wrapper>
        <ChartFilters form={form} widgetId="orders" />
      </Wrapper>,
    )
    fireEvent.click(document.querySelector('[data-slot="chart-filters-trigger"]')!)

    expect(screen.getByRole('button', { name: 'Update chart' })).toBeInTheDocument()
    expect(document.querySelector('[data-slot="chart-filters-reset"]')).toBeNull()
  })
})
