import type { ActionSchema } from '@alfakit/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { ActionList } from '../src/components/actions/action-list'
import { ActionModals } from '../src/components/actions/action-modals'
import { Wrapper, actions } from './mocks'

describe('actions', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders links, buttons and groups', () => {
    const list: ActionSchema[] = [
      {
        type: 'Action',
        name: 'create',
        label: 'New post',
        url: '/posts/create',
        icon: 'plus',
        color: 'primary',
        variant: 'button',
      },
      {
        type: 'Action',
        name: 'delete',
        label: 'Delete',
        color: 'danger',
        hasModal: true,
        hasAction: true,
      },
    ]

    render(
      <Wrapper>
        <ActionList
          actions={[
            ...list,
            { type: 'ActionGroup', actions: [{ type: 'Action', name: 'x', label: 'Nested' }] },
          ]}
          context={{ token: 't', component: 'page' }}
        />
      </Wrapper>,
    )

    expect(screen.getByRole('link', { name: /New post/ })).toHaveAttribute('href', '/posts/create')
    expect(screen.getByRole('button', { name: /Delete/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Actions' })).toBeInTheDocument()
    // Link actions cancel the size variant's `has-[>svg]:px-*`, so an icon never pads them.
    expect(screen.getByRole('button', { name: /Delete/ }).className).toContain('has-[>svg]:px-0')
  })

  it('opens a confirmation modal fetched from the server and submits it', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            name: 'delete',
            heading: 'Delete A',
            description: 'Sure?',
            width: 'sm',
            autofocus: true,
            closeByClickingAway: true,
            closeByEscaping: true,
            closeButton: true,
            submitLabel: 'Confirm',
            cancelLabel: 'Cancel',
            requiresConfirmation: true,
          }),
          { status: 200 },
        ),
    )
    vi.stubGlobal('fetch', fetchMock)
    const execute = vi.spyOn(actions, 'execute').mockImplementation(() => undefined)

    render(
      <Wrapper>
        <ActionList
          actions={[
            { type: 'Action', name: 'delete', label: 'Delete', hasModal: true, hasAction: true },
          ]}
          context={{ token: 't', component: 'table', record: 1 }}
        />
        <ActionModals />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Delete/ }))

    expect(await screen.findByRole('heading', { name: 'Delete A' })).toBeInTheDocument()
    expect(fetchMock.mock.calls[0]?.[0]).toContain('action=delete')
    expect(fetchMock.mock.calls[0]?.[0]).toContain('record=1')

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'delete' }),
      expect.objectContaining({ record: 1 }),
      {},
    )
  })

  it('binds a record action shortcut only outside record rows', () => {
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue(undefined)
    const action: ActionSchema = {
      type: 'Action',
      name: 'archive',
      label: 'Archive',
      hasAction: true,
      keyBindings: ['shift+a'],
    }

    const { unmount } = render(
      <Wrapper>
        <ActionList actions={[action]} context={{ token: 't', component: 'table', record: 1 }} />
        <ActionList actions={[action]} context={{ token: 't', component: 'table', record: 2 }} />
      </Wrapper>,
    )

    fireEvent.keyDown(window, { key: 'A', shiftKey: true })
    expect(trigger).not.toHaveBeenCalled()
    unmount()

    render(
      <Wrapper>
        <ActionList actions={[action]} context={{ token: 't', component: 'page' }} />
      </Wrapper>,
    )

    fireEvent.keyDown(window, { key: 'A', shiftKey: true })
    expect(trigger).toHaveBeenCalledTimes(1)
  })

  it('renders a disabled URL action as a disabled button', () => {
    render(
      <Wrapper>
        <ActionList
          actions={[{ type: 'Action', name: 'go', label: 'Go', url: '/go', disabled: true }]}
          context={{ token: 't', component: 'page' }}
        />
      </Wrapper>,
    )

    expect(screen.queryByRole('link', { name: /Go/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Go/ })).toBeDisabled()
  })

  it('applies the action size', () => {
    render(
      <Wrapper>
        <ActionList
          actions={[
            {
              type: 'Action',
              name: 'big',
              label: 'Big',
              hasAction: true,
              variant: 'button',
              size: 'lg',
            },
          ]}
          context={{ token: 't', component: 'page' }}
          size="sm"
        />
      </Wrapper>,
    )

    expect(screen.getByRole('button', { name: /Big/ })).toHaveClass('h-10')
  })

  it('shows badges and shortcuts inside groups and binds their shortcuts', async () => {
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue(undefined)

    render(
      <Wrapper>
        <ActionList
          actions={[
            {
              type: 'ActionGroup',
              label: 'More',
              color: 'danger',
              dropdownPlacement: 'top-start',
              actions: [
                {
                  type: 'Action',
                  name: 'publish',
                  label: 'Publish',
                  hasAction: true,
                  badge: 3,
                  tooltip: 'Make it public',
                  keyBindings: ['shift+p'],
                },
              ],
            },
          ]}
          context={{ token: 't', component: 'page' }}
        />
      </Wrapper>,
    )

    const button = screen.getByRole('button', { name: 'More' })
    expect(button).toHaveClass('text-destructive')

    fireEvent.keyDown(window, { key: 'P', shiftKey: true })
    expect(trigger).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'publish' }),
      expect.objectContaining({ component: 'page' }),
    )

    fireEvent.pointerDown(button, { button: 0, ctrlKey: false, pointerType: 'mouse' })

    const item = await screen.findByRole('menuitem', { name: /Publish/ })
    expect(item).toHaveTextContent('3')
    expect(item).toHaveAttribute('title', 'Make it public')
    expect(item.querySelector('[data-slot="dropdown-menu-shortcut"]')).not.toBeNull()
  })
})
