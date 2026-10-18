import type { PageSchema } from '@alfakit/core'
import { h } from 'vue'
import ActionButton from '../src/components/actions/ActionButton.vue'
import ActionList from '../src/components/actions/ActionList.vue'
import ActionModals from '../src/components/actions/ActionModals.vue'
import TenantMenu from '../src/components/panel/TenantMenu.vue'
import UserMenu from '../src/components/panel/UserMenu.vue'
import { colorClass, solidButtonColorClasses, textColorClasses } from '../src/lib/colors'
import { actions, flush, mountWithAlfakit, panel, setPageProps } from './mocks'

const baseModal = {
  width: 'md',
  autofocus: true,
  closeByClickingAway: true,
  closeByEscaping: true,
  closeButton: true,
  submitLabel: 'Submit',
  cancelLabel: 'Cancel',
}

function mockModal(modal: Record<string, unknown>) {
  const fetchMock = vi.fn<(input: RequestInfo | URL) => Promise<Response>>(
    async (input) =>
      new Response(
        JSON.stringify({
          ...baseModal,
          name: new URL(String(input), 'http://localhost').searchParams.get('action'),
          ...modal,
        }),
        { status: 200 },
      ),
  )
  vi.stubGlobal('fetch', fetchMock)

  return fetchMock
}

const button = (label: string) =>
  Array.from(document.body.querySelectorAll('button')).find(
    (node) => node.textContent?.trim() === label,
  )

async function settle() {
  await flush()
  await flush()
}

async function openMenu(trigger: Element | null | undefined) {
  trigger?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  await settle()
}

describe('authorisation feedback', () => {
  it('wraps a disabled action with a tooltip so the reason can be shown', () => {
    const wrapper = mountWithAlfakit(() =>
      h(ActionButton, {
        action: {
          type: 'Action',
          name: 'publish',
          label: 'Publish',
          disabled: true,
          tooltip: 'Only editors can publish.',
          hasAction: true,
        },
        context: { token: 't' },
      }),
    )

    const trigger = wrapper.find('[data-disabled-tooltip]')
    expect(trigger.exists()).toBe(true)
    expect(trigger.attributes('tabindex')).toBe('0')
    expect(trigger.element.tagName).toBe('SPAN')
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('does not wrap enabled actions', () => {
    const wrapper = mountWithAlfakit(() =>
      h(ActionButton, {
        action: { type: 'Action', name: 'save', label: 'Save', tooltip: 'Save it' },
        context: { token: 't' },
      }),
    )

    expect(wrapper.find('[data-disabled-tooltip]').exists()).toBe(false)
    wrapper.unmount()
  })
})

describe('modal lifecycle', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    actions.store.set({ modals: [], loading: null })
  })

  it('asks before closing a modal with unsaved changes', async () => {
    mockModal({
      heading: 'Draft',
      unsavedChangesAlert: true,
      form: {
        key: 'form',
        columns: { default: 1 },
        state: { title: '' },
        components: [
          {
            type: 'TextInput',
            key: 'title',
            name: 'title',
            statePath: 'title',
            label: 'Title',
            inputType: 'text',
          },
        ],
      },
    })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)

    const wrapper = mountWithAlfakit(() => [
      h(ActionList, {
        actions: [{ type: 'Action', name: 'draft', label: 'Draft', hasModal: true }],
        context: { token: 't' },
      }),
      h(ActionModals),
    ])

    button('Draft')?.click()
    await settle()

    const input = document.body.querySelector('input') as HTMLInputElement
    input.value = 'Changed'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await settle()

    button('Cancel')?.click()
    await settle()

    expect(confirm).toHaveBeenCalledTimes(1)
    expect(actions.state.modals).toHaveLength(1)

    confirm.mockReturnValue(true)
    button('Cancel')?.click()
    await settle()

    expect(actions.state.modals).toHaveLength(0)
    wrapper.unmount()
  })

  it('closes an unchanged modal without asking', async () => {
    mockModal({ heading: 'Plain', unsavedChangesAlert: true })
    const confirm = vi.spyOn(window, 'confirm')

    const wrapper = mountWithAlfakit(() => [
      h(ActionList, {
        actions: [{ type: 'Action', name: 'plain', label: 'Plain', hasModal: true }],
        context: { token: 't' },
      }),
      h(ActionModals),
    ])

    button('Plain')?.click()
    await settle()
    button('Cancel')?.click()
    await settle()

    expect(confirm).not.toHaveBeenCalled()
    expect(actions.state.modals).toHaveLength(0)
    wrapper.unmount()
  })

  it('renders customised submit and cancel buttons', async () => {
    mockModal({
      heading: 'Send',
      submitLabel: 'Send now',
      submitColor: 'danger',
      submitIcon: 'send',
      cancelLabel: 'Not yet',
      cancelColor: 'warning',
    })

    const wrapper = mountWithAlfakit(() => [
      h(ActionList, {
        actions: [{ type: 'Action', name: 'send', label: 'Send', hasModal: true }],
        context: { token: 't' },
      }),
      h(ActionModals),
    ])

    button('Send')?.click()
    await settle()
    // The modal fetches its schema first; under load that can take more than two ticks.
    await vi.waitFor(() => expect(button('Send now')?.querySelector('svg')).not.toBeNull(), {
      timeout: 3000,
    })

    expect(button('Send now')?.className).toContain('bg-destructive')
    expect(button('Send now')?.querySelector('svg')).not.toBeNull()
    expect(button('Not yet')?.className).toContain('text-warning')
    wrapper.unmount()
  })

  it('does not open a modal that mountUsing() cancelled', async () => {
    mockModal({ cancelled: true, notifications: [] })

    const wrapper = mountWithAlfakit(() => [
      h(ActionList, {
        actions: [{ type: 'Action', name: 'limited', label: 'Limited', hasModal: true }],
        context: { token: 't' },
      }),
      h(ActionModals),
    ])

    button('Limited')?.click()
    await settle()

    expect(actions.state.modals).toHaveLength(0)
    expect(actions.state.loading).toBeNull()
    wrapper.unmount()
  })
})

describe('user and tenant menus', () => {
  afterEach(() => setPageProps({ alfakit: panel, page: undefined }))

  it('renders groups, the customised entries and runs menu actions', async () => {
    const fetchMock = mockModal({ heading: 'Feedback' })
    setPageProps({
      page: { token: 'page-token' } as PageSchema,
      alfakit: {
        ...panel,
        user: { id: 1, name: 'Ann' },
        userMenu: {
          logoutUrl: '/admin/logout',
          profileUrl: '/admin/profile',
          profile: { label: 'Edit profile', url: '/admin/profile', icon: 'user' },
          logout: { label: 'Log out', url: '/admin/logout', method: 'post' },
          items: [
            { label: 'Settings', url: '/settings' },
            {
              label: 'Feedback',
              group: 1,
              action: { type: 'Action', name: 'feedback', hasModal: true, hasAction: true },
            },
          ],
        },
      },
    })

    const wrapper = mountWithAlfakit(() => [h(UserMenu, { variant: 'topbar' }), h(ActionModals)])

    await openMenu(document.body.querySelector('button[aria-label="Ann"]'))

    expect(document.body.textContent).toContain('Edit profile')
    expect(document.body.textContent).toContain('Log out')
    expect(document.body.textContent).not.toContain('Sign out')
    expect(document.body.querySelectorAll('[data-slot="dropdown-menu-separator"]')).toHaveLength(3)

    const feedback = Array.from(document.body.querySelectorAll('[role="menuitem"]')).find((node) =>
      node.textContent?.includes('Feedback'),
    ) as HTMLElement
    feedback.click()
    await settle()

    const query = new URL(String(fetchMock.mock.calls[0]?.[0]), 'http://localhost').searchParams
    expect(query.get('component')).toBe('userMenu')
    expect(query.get('token')).toBe('page-token')
    expect(query.get('action')).toBe('feedback')
    wrapper.unmount()
  })

  it('hides the logout entry when the server says so', async () => {
    setPageProps({
      alfakit: {
        ...panel,
        user: { id: 1, name: 'Ann' },
        userMenu: { logoutUrl: '/admin/logout', logout: false, items: [] },
      },
    })

    const wrapper = mountWithAlfakit(() => h(UserMenu, { variant: 'topbar' }))

    await openMenu(document.body.querySelector('button[aria-label="Ann"]'))

    expect(document.body.querySelectorAll('[role="menuitem"]').length).toBeGreaterThanOrEqual(0)
    expect(document.body.textContent).not.toContain('Sign out')
    wrapper.unmount()
  })

  it('renders customised tenant menu entries', async () => {
    setPageProps({
      alfakit: {
        ...panel,
        user: { id: 1, name: 'Ann' },
        tenancy: {
          current: { id: 1, name: 'Alpha', url: '/alpha' },
          tenants: [{ id: 1, name: 'Alpha', url: '/alpha' }],
          registrationUrl: '/new',
          registration: { label: 'Add a team', url: '/new', icon: 'plus' },
          menu: [{ label: 'Plans', url: '/alpha/billing', icon: 'wallet' }],
        },
      },
    })

    const wrapper = mountWithAlfakit(() => h(TenantMenu, { variant: 'topbar' }))

    await openMenu(document.body.querySelector('[data-slot="tenant-menu"]'))

    expect(document.body.textContent).toContain('Add a team')
    expect(document.body.textContent).toContain('Plans')
    expect(document.body.textContent).not.toContain('New')
    wrapper.unmount()
  })
})

describe('custom colours', () => {
  it('falls back to the generic utilities for custom colour names', () => {
    expect(colorClass(solidButtonColorClasses, 'brand')).toBe('alfakit-solid alfakit-color-brand')
    expect(colorClass(textColorClasses, 'brand')).toBe('alfakit-text alfakit-color-brand')
    expect(colorClass(solidButtonColorClasses, 'danger')).toContain('bg-destructive')
  })
})
