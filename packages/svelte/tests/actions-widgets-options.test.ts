import type { ChartFiltersFormSchema, StatSchema } from '@alfakit/core'
import { fireEvent, render, screen } from '@testing-library/svelte'
import { toast } from 'svelte-sonner'
import ActionList from '../src/components/actions/ActionList.svelte'
import AlfakitToast from '../src/components/notifications/AlfakitToast.svelte'
import NotificationActionButton from '../src/components/notifications/NotificationActionButton.svelte'
import { showToast } from '../src/components/notifications/toast'
import ChartFilters from '../src/components/widgets/ChartFilters.svelte'
import StatCard from '../src/components/widgets/StatCard.svelte'
import Wrapper from './Wrapper.svelte'

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

describe('actions, notifications and widgets options', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('renders the stat description icon before or after the description', () => {
    const { unmount } = render(Wrapper, { props: { component: StatCard, props: { stat: stat() } } })
    const before = descriptionHtml()
    expect(before.indexOf('data-slot="icon"')).toBeGreaterThanOrEqual(0)
    expect(before.indexOf('data-slot="icon"')).toBeLessThan(before.indexOf('Up 3%'))
    unmount()

    render(Wrapper, { props: { component: StatCard, props: { stat: stat('after') } } })
    const after = descriptionHtml()
    expect(after.indexOf('data-slot="icon"')).toBeGreaterThan(after.indexOf('Up 3%'))
  })

  it('tints a toast with the notification colour', () => {
    const custom = vi.spyOn(toast, 'custom')

    showToast({ id: 'n1', title: 'Saved', status: 'success', color: 'success', format: 'alfakit' })
    expect(custom).toHaveBeenCalledWith(AlfakitToast, expect.anything())

    render(Wrapper, {
      props: {
        component: AlfakitToast,
        props: {
          notification: { id: 'n2', title: 'Saved', color: 'success', format: 'alfakit' },
        },
      },
    })

    const style = document.querySelector('[data-slot="alfakit-toast"]')?.getAttribute('style')
    expect(style).toContain('--normal-bg')
    expect(style).toContain('var(--success)')
  })

  it('sizes notification action buttons', () => {
    render(Wrapper, {
      props: {
        component: NotificationActionButton,
        props: { action: { name: 'view', label: 'View', variant: 'button', size: 'sm' } },
      },
    })
    render(Wrapper, {
      props: {
        component: NotificationActionButton,
        props: { action: { name: 'open', label: 'Open', variant: 'button' } },
      },
    })

    expect(screen.getByRole('button', { name: 'View' }).className).toContain('h-8')
    expect(screen.getByRole('button', { name: 'Open' }).className).toContain('h-6')
  })

  it('renders a badge trigger with badge()', () => {
    render(Wrapper, {
      props: {
        component: ActionList,
        props: {
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
        },
      },
    })

    const button = screen.getByRole('button', { name: 'Edit' })
    expect(button.className).toContain('bg-success/10')
    expect(button.className).toContain('text-xs')
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

    render(Wrapper, { props: { component: ChartFilters, props: { form, widgetId: 'orders' } } })
    await fireEvent.click(screen.getByRole('button', { name: 'Filters' }))

    expect(await screen.findByRole('button', { name: 'Update chart' })).toBeInTheDocument()
    expect(document.querySelector('[data-slot="chart-filters-reset"]')).toBeNull()
  })
})
