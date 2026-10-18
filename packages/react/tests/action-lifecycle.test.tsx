import type { ActionModalSchema, PageSchema } from '@alfakit/core'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ActionButton } from '../src/components/actions/action-button'
import { ActionList } from '../src/components/actions/action-list'
import { ActionModals } from '../src/components/actions/action-modals'
import { TenantMenu } from '../src/components/panel/tenant-menu'
import { UserMenu } from '../src/components/panel/user-menu'
import { colorClass, solidButtonColorClasses, textColorClasses } from '../src/lib/colors'
import { Wrapper, actions, panel, setPageProps } from './mocks'

const baseModal = {
  width: 'md',
  autofocus: true,
  closeByClickingAway: true,
  closeByEscaping: true,
  closeButton: true,
  submitLabel: 'Submit',
  cancelLabel: 'Cancel',
} as const

function mockModal(modal: Partial<ActionModalSchema> | Record<string, unknown>) {
  const fetchMock = vi.fn(
    async (url: string) =>
      new Response(
        JSON.stringify({
          ...baseModal,
          name: new URL(url, 'http://localhost').searchParams.get('action'),
          ...modal,
        }),
        { status: 200 },
      ),
  )
  vi.stubGlobal('fetch', fetchMock)

  return fetchMock
}

function openMenu(trigger: HTMLElement) {
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' })
}

describe('authorisation feedback', () => {
  it('wraps a disabled action with a tooltip so the reason can be shown', () => {
    const { container } = render(
      <Wrapper>
        <ActionButton
          action={{
            type: 'Action',
            name: 'publish',
            label: 'Publish',
            disabled: true,
            tooltip: 'Only editors can publish.',
            hasAction: true,
          }}
          context={{ token: 't' }}
        />
      </Wrapper>,
    )

    const wrapper = container.querySelector('[data-slot="action-disabled-tooltip"]')
    expect(wrapper).not.toBeNull()
    expect(wrapper).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled()
  })

  it('does not wrap enabled actions', () => {
    const { container } = render(
      <Wrapper>
        <ActionButton
          action={{ type: 'Action', name: 'save', label: 'Save', tooltip: 'Save it' }}
          context={{ token: 't' }}
        />
      </Wrapper>,
    )

    expect(container.querySelector('[data-slot="action-disabled-tooltip"]')).toBeNull()
  })
})

describe('modal lifecycle', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    act(() => actions.store.set({ modals: [], loading: null }))
  })

  const form = {
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
  }

  it('asks before closing a modal with unsaved changes', async () => {
    mockModal({ heading: 'Draft', unsavedChangesAlert: true, form })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(
      <Wrapper>
        <ActionList
          actions={[{ type: 'Action', name: 'draft', label: 'Draft', hasModal: true }]}
          context={{ token: 't' }}
        />
        <ActionModals />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Draft' }))
    expect(await screen.findByRole('heading', { name: 'Draft' })).toBeInTheDocument()

    // Unchanged: closes without asking.
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(actions.state.modals).toHaveLength(0))
    expect(confirm).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Draft' }))
    fireEvent.change(await screen.findByLabelText('Title'), { target: { value: 'Changed' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(confirm).toHaveBeenCalledTimes(1)
    expect(actions.state.modals).toHaveLength(1)

    confirm.mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(actions.state.modals).toHaveLength(0))
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

    render(
      <Wrapper>
        <ActionList
          actions={[{ type: 'Action', name: 'send', label: 'Send', hasModal: true }]}
          context={{ token: 't' }}
        />
        <ActionModals />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    const submit = await screen.findByRole('button', { name: 'Send now' })
    expect(submit.className).toContain('bg-destructive')
    // Named icons load on demand (`lucide-react/dynamic`, then the icon).
    await waitFor(() => expect(submit.querySelector('svg')).not.toBeNull())
    expect(screen.getByRole('button', { name: 'Not yet' }).className).toContain('text-warning')
  })

  it('does not open a modal that mountUsing() cancelled', async () => {
    mockModal({ cancelled: true, notifications: [] })

    render(
      <Wrapper>
        <ActionList
          actions={[{ type: 'Action', name: 'limited', label: 'Limited', hasModal: true }]}
          context={{ token: 't' }}
        />
        <ActionModals />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Limited' }))

    await waitFor(() => expect(actions.state.loading).toBeNull())
    expect(actions.state.modals).toHaveLength(0)
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

    render(
      <Wrapper>
        <UserMenu variant="topbar" />
        <ActionModals />
      </Wrapper>,
    )

    openMenu(screen.getByRole('button', { name: 'Ann' }))

    expect(await screen.findByText('Edit profile')).toBeInTheDocument()
    expect(screen.getByText('Log out')).toBeInTheDocument()
    expect(screen.queryByText('Sign out')).toBeNull()
    expect(screen.queryByText('Profile')).toBeNull()

    // Header, profile/items, the group divider and the logout separator.
    expect(document.querySelectorAll('[data-slot="dropdown-menu-separator"]')).toHaveLength(3)

    fireEvent.click(screen.getByText('Feedback'))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const query = new URL(String(fetchMock.mock.calls[0]?.[0]), 'http://localhost').searchParams
    expect(query.get('component')).toBe('userMenu')
    expect(query.get('token')).toBe('page-token')
    expect(query.get('action')).toBe('feedback')
  })

  it('hides the logout entry when the server says so', async () => {
    setPageProps({
      alfakit: {
        ...panel,
        user: { id: 1, name: 'Ann' },
        userMenu: { logoutUrl: '/admin/logout', logout: false, items: [] },
      },
    })

    render(
      <Wrapper>
        <UserMenu variant="topbar" />
      </Wrapper>,
    )

    openMenu(screen.getByRole('button', { name: 'Ann' }))

    expect(await screen.findByText('Ann', { selector: 'span' })).toBeInTheDocument()
    expect(screen.queryByText('Sign out')).toBeNull()
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

    render(
      <Wrapper>
        <TenantMenu variant="topbar" />
      </Wrapper>,
    )

    openMenu(document.querySelector('[data-slot="tenant-menu"]') as HTMLElement)

    expect(await screen.findByText('Add a team')).toBeInTheDocument()
    expect(screen.getByText('Plans')).toBeInTheDocument()
    expect(screen.queryByText('New')).toBeNull()
  })
})

describe('custom colours', () => {
  it('falls back to the generic utilities for custom colour names', () => {
    expect(colorClass(solidButtonColorClasses, 'brand')).toBe('alfakit-solid alfakit-color-brand')
    expect(colorClass(textColorClasses, 'brand')).toBe('alfakit-text alfakit-color-brand')
    expect(colorClass(solidButtonColorClasses, 'danger')).toContain('bg-destructive')
    expect(colorClass(solidButtonColorClasses, '#fff', 'primary')).toContain('bg-primary')
  })
})
