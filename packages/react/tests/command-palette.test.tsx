import type { PageSchema, PanelSchema, RecordVersionsSchema } from '@alfakit/core'
import { shortcuts } from '@alfakit/core'
import { router } from '@inertiajs/react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { GlobalSearch } from '../src/components/panel/global-search'
import { KeyboardShortcuts } from '../src/components/panel/keyboard-shortcuts'
import { RecordVersionsComponent } from '../src/components/versions/record-versions'
import { actions, panel, setPageProps, Wrapper } from './mocks'

const page: PageSchema = {
  class: 'App\\EditOrder',
  layout: 'app',
  title: 'Edit order',
  content: [],
  token: 'tok',
  headerActions: [
    {
      type: 'Action',
      name: 'delete',
      label: 'Delete order',
      hasModal: true,
      keyBindings: ['mod+backspace'],
    },
  ],
}

const paletteProps: Partial<PanelSchema> = {
  navigation: [
    { label: 'Shop', collapsible: false, items: [{ label: 'Orders', url: '/admin/orders' }] },
  ],
  endpoints: { ...panel.endpoints, commandPalette: '/palette', shortcuts: '/shortcuts' },
  commandPalette: {
    commands: [
      {
        type: 'Action',
        name: 'clear-cache',
        label: 'Clear cache',
        keywords: ['flush'],
        keyBindings: ['g c'],
        hasAction: true,
      },
    ],
    recentRecords: true,
  },
  keyboardShortcuts: { customizable: true },
}

const respond = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  Element.prototype.scrollIntoView ??= () => {}
})

beforeEach(() => {
  setPageProps({ alfakit: { ...panel, ...paletteProps }, page })
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(async (url: string) =>
      url.startsWith('/palette')
        ? respond({
            create: [{ label: 'New order', url: '/admin/orders/create' }],
            recent: [{ title: 'Order #7', url: '/admin/orders/7/edit', group: 'Order' }],
          })
        : respond({ shortcuts: { 'command:clear-cache': ['mod+j'] } }),
    ),
  )
})

afterEach(() => {
  setPageProps({ alfakit: panel, page: undefined })
  shortcuts.setOverrides({})
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('command palette', () => {
  it('lists page actions, commands, navigation, create links and recent records in groups', async () => {
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue()

    render(
      <Wrapper>
        <GlobalSearch />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Type a command or search/ }))

    await waitFor(() => expect(screen.getByText('Order #7')).toBeInTheDocument())

    const dialog = screen.getByRole('dialog')
    for (const heading of ['Recent', 'Actions', 'Commands', 'Create', 'Go to', 'Theme', 'Help']) {
      expect(within(dialog).getByText(heading)).toBeInTheDocument()
    }
    expect(screen.getByText('New order')).toBeInTheDocument()
    expect(screen.getByText('Orders')).toBeInTheDocument()

    // Fuzzy matching on keywords.
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'flsh' } })
    expect(screen.queryByText('Orders')).toBeNull()
    fireEvent.click(screen.getByText('Clear cache'))

    expect(trigger).toHaveBeenCalledWith(expect.objectContaining({ name: 'clear-cache' }), {
      token: 'tok',
      component: 'commands',
    })
  })

  it('runs page header actions with the page context and visits links', async () => {
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue()

    render(
      <Wrapper>
        <GlobalSearch />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Type a command or search/ }))
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'delete' } })
    fireEvent.click(screen.getByText('Delete order'))

    expect(trigger).toHaveBeenCalledWith(expect.objectContaining({ name: 'delete' }), {
      token: 'tok',
      component: 'page',
    })

    fireEvent.click(screen.getByRole('button', { name: /Type a command or search/ }))
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'orders' } })
    fireEvent.click(screen.getByText('Orders'))

    expect(router.visit).toHaveBeenCalledWith('/admin/orders')
  })

  it('opens with mod+k from anywhere, also while typing', () => {
    render(
      <Wrapper>
        <input aria-label="Name" />
        <GlobalSearch />
      </Wrapper>,
    )

    fireEvent.keyDown(screen.getByLabelText('Name'), { key: 'k', code: 'KeyK', ctrlKey: true })

    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })
})

describe('keyboard shortcuts', () => {
  it('opens the overlay with ? and lists the page shortcuts by group', async () => {
    render(
      <Wrapper>
        <KeyboardShortcuts />
      </Wrapper>,
    )

    fireEvent.keyDown(document.body, { key: '?', shiftKey: true })

    // The overlay's code loads on first open.
    const overlay = await screen.findByRole('dialog', { name: 'Keyboard shortcuts' })
    expect(within(overlay).getByText('General')).toBeInTheDocument()
    expect(within(overlay).getByText('Go to the dashboard')).toBeInTheDocument()
    expect(within(overlay).getByText('Clear cache')).toBeInTheDocument()
    // Action key bindings are listed (not customisable).
    expect(within(overlay).getByText('Actions on this page')).toBeInTheDocument()
    expect(within(overlay).getByText('Delete order')).toBeInTheDocument()
  })

  it('sends G then D to dashboardUrl when the panel has one (a starter kit app dashboard)', () => {
    setPageProps({
      alfakit: { ...panel, ...paletteProps, url: '/admin/posts', dashboardUrl: '/dashboard' },
      page,
    })

    render(
      <Wrapper>
        <KeyboardShortcuts />
      </Wrapper>,
    )

    fireEvent.keyDown(document.body, { key: 'g' })
    fireEvent.keyDown(document.body, { key: 'd' })

    expect(router.visit).toHaveBeenCalledWith('/dashboard')
  })

  it('does not run shortcuts while typing in a field', () => {
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue()

    render(
      <Wrapper>
        <textarea aria-label="Notes" />
        <KeyboardShortcuts />
      </Wrapper>,
    )

    const notes = screen.getByLabelText('Notes')
    fireEvent.keyDown(notes, { key: '?', shiftKey: true })
    fireEvent.keyDown(notes, { key: 'g' })
    fireEvent.keyDown(notes, { key: 'c' })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(trigger).not.toHaveBeenCalled()

    // Outside the field the `g c` sequence runs the command.
    fireEvent.keyDown(document.body, { key: 'g' })
    fireEvent.keyDown(document.body, { key: 'c' })
    expect(trigger).toHaveBeenCalledWith(expect.objectContaining({ name: 'clear-cache' }), {
      token: 'tok',
      component: 'commands',
    })
  })

  it('records a new binding and stores it on the server', async () => {
    render(
      <Wrapper>
        <KeyboardShortcuts />
      </Wrapper>,
    )

    fireEvent.keyDown(document.body, { key: '?', shiftKey: true })
    fireEvent.click(
      await screen.findByRole('button', { name: 'Change the shortcut for Clear cache' }),
    )
    fireEvent.keyDown(window, { key: 'j', code: 'KeyJ', ctrlKey: true })

    await waitFor(() => expect(shortcuts.keysFor('command:clear-cache')).toEqual(['mod+j']))

    const [url, init] = vi.mocked(fetch).mock.calls.at(-1)! as [string, RequestInit]
    expect(url).toBe('/shortcuts')
    expect(JSON.parse(String(init.body))).toEqual({
      shortcuts: { 'command:clear-cache': ['mod+j'] },
    })
    expect(screen.getByRole('status')).toHaveTextContent('Shortcut saved.')
  })

  it('registers nothing when the panel turns shortcuts off', () => {
    setPageProps({ alfakit: { ...panel, ...paletteProps, keyboardShortcuts: false }, page })

    render(
      <Wrapper>
        <KeyboardShortcuts />
      </Wrapper>,
    )

    act(() => {
      fireEvent.keyDown(document.body, { key: '?', shiftKey: true })
    })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(shortcuts.isEnabled()).toBe(false)
    shortcuts.setEnabled(true)
  })
})

describe('record history', () => {
  const versions: RecordVersionsSchema = {
    type: 'RecordVersions',
    key: 'versions',
    emptyLabel: 'No versions yet.',
    actionPath: ['history'],
    restoreAction: {
      type: 'Action',
      name: 'restoreVersion',
      label: 'Restore this version',
      hasModal: true,
    },
    versions: [
      {
        id: 2,
        event: 'updated',
        eventLabel: 'Updated',
        author: 'Ada',
        current: true,
        changes: [
          {
            attribute: 'body',
            label: 'Body',
            old: 'The quick brown fox',
            new: 'The quick red fox',
            diff: [
              { type: 'equal', text: 'The quick ' },
              { type: 'delete', text: 'brown ' },
              { type: 'insert', text: 'red ' },
              { type: 'equal', text: 'fox' },
            ],
          },
          { attribute: 'status', label: 'Status', old: 'draft', new: 'published' },
        ],
      },
      { id: 1, event: 'created', eventLabel: 'Created', changes: [] },
    ],
  }

  it('shows each version with a field-by-field diff', () => {
    const { container } = render(
      <Wrapper>
        <RecordVersionsComponent component={versions} />
      </Wrapper>,
    )

    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(container.querySelector('del')).toHaveTextContent('Removed: brown')
    expect(container.querySelector('ins')).toHaveTextContent('Added: red')
    expect(screen.getByText('draft')).toBeInTheDocument()
    expect(screen.getByText('published')).toBeInTheDocument()
    expect(screen.getByText('Current')).toBeInTheDocument()
  })

  it('restores an older version through the nested action', () => {
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue()

    render(
      <Wrapper>
        <RecordVersionsComponent component={versions} />
      </Wrapper>,
    )

    // The current version can't be restored.
    const buttons = screen.getAllByRole('button', { name: /Restore the version/ })
    expect(buttons).toHaveLength(1)

    fireEvent.click(buttons[0]!)

    expect(trigger).toHaveBeenCalledWith(expect.objectContaining({ name: 'restoreVersion' }), {
      token: 'tok',
      component: 'page',
      parents: ['history'],
      arguments: { version: 1 },
    })
  })

  it('says when there are no versions', () => {
    render(
      <Wrapper>
        <RecordVersionsComponent component={{ ...versions, versions: [] }} />
      </Wrapper>,
    )

    expect(screen.getByText('No versions yet.')).toBeInTheDocument()
  })
})
