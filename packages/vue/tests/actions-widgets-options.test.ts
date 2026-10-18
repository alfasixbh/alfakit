import type { ChartFiltersFormSchema, StatSchema } from '@alfakit/core'
import { h } from 'vue'
import { toast } from 'vue-sonner'
import ActionList from '../src/components/actions/ActionList.vue'
import NotificationActionButton from '../src/components/notifications/NotificationActionButton.vue'
import { showToast } from '../src/components/notifications/flash-toasts'
import ChartFilters from '../src/components/widgets/ChartFilters.vue'
import StatCard from '../src/components/widgets/StatCard.vue'
import { flush, mountWithAlfakit } from './mocks'

function stat(position?: 'after'): StatSchema {
  return {
    label: 'Orders',
    value: '3',
    description: 'Up 3%',
    // Inline SVG renders synchronously (named icons load lazily).
    descriptionIcon: '<svg viewBox="0 0 1 1"></svg>',
    descriptionIconPosition: position,
  }
}

function descriptionHtml(): string {
  const span = Array.from(document.body.querySelectorAll('span')).find(
    (element) =>
      element.textContent?.trim() === 'Up 3%' && element.querySelector('[data-slot="icon"]'),
  )

  return span?.innerHTML ?? ''
}

function button(name: string): HTMLButtonElement | undefined {
  return Array.from(document.body.querySelectorAll('button')).find(
    (element) => element.textContent?.trim() === name,
  )
}

describe('actions, notifications and widgets options', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('renders the stat description icon before or after the description', async () => {
    let wrapper = mountWithAlfakit(() => h(StatCard, { stat: stat() }))
    await flush()
    const before = descriptionHtml()
    expect(before.indexOf('data-slot="icon"')).toBeGreaterThanOrEqual(0)
    expect(before.indexOf('data-slot="icon"')).toBeLessThan(before.indexOf('Up 3%'))
    wrapper.unmount()

    wrapper = mountWithAlfakit(() => h(StatCard, { stat: stat('after') }))
    await flush()
    const after = descriptionHtml()
    expect(after.indexOf('data-slot="icon"')).toBeGreaterThan(after.indexOf('Up 3%'))
    wrapper.unmount()
  })

  it('tints a toast with the notification colour', () => {
    const success = vi.spyOn(toast, 'success')

    showToast({ id: 'n1', title: 'Saved', status: 'success', color: 'success', format: 'alfakit' })

    const options = success.mock.calls[0]![1] as { style?: Record<string, string> }
    expect(options.style?.['--normal-bg']).toContain('var(--success)')
  })

  it('sizes notification action buttons', async () => {
    const wrapper = mountWithAlfakit(() => [
      h(NotificationActionButton, {
        action: { name: 'view', label: 'View', variant: 'button', size: 'sm' },
      }),
      h(NotificationActionButton, { action: { name: 'open', label: 'Open', variant: 'button' } }),
    ])
    await flush()

    expect(button('View')?.className).toContain('h-8')
    expect(button('Open')?.className).toContain('h-7')
    wrapper.unmount()
  })

  it('renders a badge trigger with badge()', async () => {
    const wrapper = mountWithAlfakit(() =>
      h(ActionList, {
        actions: [
          {
            type: 'Action',
            name: 'edit',
            label: 'Edit',
            variant: 'badge',
            color: 'success',
            hasAction: true,
          },
        ],
        context: { token: 't', component: 'page' },
      }),
    )
    await flush()

    expect(button('Edit')?.className).toContain('bg-success/10')
    expect(button('Edit')?.className).toContain('text-xs')
    wrapper.unmount()
  })

  it('restyles and hides chart filter buttons from the server', async () => {
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

    const wrapper = mountWithAlfakit(() => h(ChartFilters, { form, widgetId: 'orders' }))
    await flush()
    document.body.querySelector<HTMLButtonElement>('[data-slot="chart-filters-trigger"]')?.click()
    await flush()
    await flush()

    expect(button('Update chart')).toBeDefined()
    expect(document.body.querySelector('[data-slot="chart-filters-reset"]')).toBeNull()
    wrapper.unmount()
  })
})
