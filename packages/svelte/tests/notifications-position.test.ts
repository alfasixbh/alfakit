import { render } from '@testing-library/svelte'
import { panel, setPageProps } from './mocks'
import NotificationsChromeHarness from './NotificationsChromeHarness.svelte'

function renderChrome(position?: 'sidebar', open = true) {
  setPageProps({
    alfakit: {
      ...panel,
      sidebarCollapsibleOnDesktop: true,
      databaseNotifications: { unreadCount: 3, ...(position ? { position } : {}) },
    },
  })

  return render(NotificationsChromeHarness, { props: { open } })
}

afterEach(() => setPageProps({ alfakit: panel }))

describe('database notifications position', () => {
  it('keeps the bell in the top bar by default', () => {
    const { container } = renderChrome()

    const triggers = container.querySelectorAll('[data-slot="notifications-trigger"]')
    expect(triggers).toHaveLength(1)
    expect(triggers[0]!.closest('[data-slot="topbar"]')).not.toBeNull()
  })

  it('moves the bell into the sidebar and out of the top bar', () => {
    const { container } = renderChrome('sidebar')

    const triggers = container.querySelectorAll('[data-slot="notifications-trigger"]')
    expect(triggers).toHaveLength(1)
    expect(triggers[0]!.closest('[data-slot="topbar"]')).toBeNull()
    expect(triggers[0]).toHaveAttribute('data-variant', 'sidebar')
    expect(triggers[0]).toHaveTextContent('Notifications')
    expect(triggers[0]).toHaveTextContent('3')
  })

  it('keeps the badge and an accessible name in a collapsed sidebar', () => {
    const { container } = renderChrome('sidebar', false)

    const trigger = container.querySelector('[data-variant="sidebar"]')!
    expect(trigger.closest('[data-collapsible="icon"]')).not.toBeNull()
    expect(trigger.className).toContain('group-data-[collapsible=icon]:size-8')
    expect(
      trigger.querySelector('.group-data-\\[collapsible\\=icon\\]\\:sr-only'),
    ).toHaveTextContent('Notifications')
    expect(trigger).toHaveTextContent('3')
  })
})
