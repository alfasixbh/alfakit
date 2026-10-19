import type { ActionSchema } from '@alfakit/core'
import { fireEvent, render, screen } from '@testing-library/svelte'
import ActionButton from '../src/components/actions/ActionButton.svelte'
import ActionList from '../src/components/actions/ActionList.svelte'
import ActionModals from '../src/components/actions/ActionModals.svelte'
import { actions } from './mocks'
import Wrapper from './Wrapper.svelte'

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

    render(Wrapper, {
      props: {
        component: ActionList,
        props: {
          actions: [
            ...list,
            { type: 'ActionGroup', actions: [{ type: 'Action', name: 'x', label: 'Nested' }] },
          ],
          context: { token: 't', component: 'page' },
        },
      },
    })

    expect(screen.getByRole('link', { name: /New post/ })).toHaveAttribute('href', '/posts/create')
    expect(screen.getByRole('button', { name: /Delete/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Actions' })).toBeInTheDocument()
  })

  it('keeps link actions with an icon unpadded, so record action columns never grow', () => {
    render(Wrapper, {
      props: {
        component: ActionButton,
        props: {
          action: { type: 'Action', name: 'edit', label: 'Edit', icon: 'pencil', hasAction: true },
          context: { token: 't', component: 'table' },
        },
      },
    })

    // The size variants add `has-[>svg]:px-*`, which beats `p-0` once the icon is in the
    // button: the link must cancel it, or the padding appears later (after a re-style).
    expect(screen.getByRole('button', { name: /Edit/ }).className).toMatch(
      /(^| )has-\[>svg\]:px-0( |$)/,
    )
  })

  it('still runs the action when it has a keyboard shortcut tooltip', async () => {
    const onTrigger = vi.fn()

    render(Wrapper, {
      props: {
        component: ActionButton,
        props: {
          action: {
            type: 'Action',
            name: 'create',
            label: 'Create',
            keyBindings: ['mod+s'],
            hasAction: true,
            variant: 'button',
          },
          context: { token: 't', component: 'form' },
          onTrigger,
        },
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: /Create/ }))

    expect(onTrigger).toHaveBeenCalledTimes(1)
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

    render(Wrapper, {
      props: {
        component: ActionList,
        props: {
          actions: [
            { type: 'Action', name: 'delete', label: 'Delete', hasModal: true, hasAction: true },
          ],
          context: { token: 't', component: 'table', record: 1 },
        },
        extra: [ActionModals],
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: /Delete/ }))

    expect(await screen.findByRole('heading', { name: 'Delete A' })).toBeInTheDocument()
    expect(fetchMock.mock.calls[0]?.[0]).toContain('action=delete')
    expect(fetchMock.mock.calls[0]?.[0]).toContain('record=1')

    await fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'delete' }),
      expect.objectContaining({ record: 1 }),
      {},
    )
  })
})
