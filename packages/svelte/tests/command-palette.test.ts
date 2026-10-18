import type { PageSchema, PanelSchema, RecordVersionsSchema } from '@alfakit/core'
import { shortcuts } from '@alfakit/core'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte'
import GlobalSearch from '../src/components/panel/GlobalSearch.svelte'
import KeyboardShortcuts from '../src/components/panel/KeyboardShortcuts.svelte'
import RecordVersionsComponent from '../src/components/versions/RecordVersionsComponent.svelte'
import { actions, panel, setPageProps } from './mocks'
import TypingProbe from './TypingProbe.svelte'
import Wrapper from './Wrapper.svelte'

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

const keydown = (target: EventTarget, key: string, init: KeyboardEventInit = {}) =>
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
  )

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
  shortcuts.setEnabled(true)
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('command palette', () => {
  it('lists page actions, commands, navigation, create links and recent records, and runs them', async () => {
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue()

    render(Wrapper, { props: { component: GlobalSearch } })

    await fireEvent.click(screen.getByRole('button', { name: /Type a command or search/ }))
    await waitFor(() => expect(screen.getByText('Order #7')).toBeInTheDocument())

    const dialog = screen.getByRole('dialog')
    for (const text of [
      'Recent',
      'Actions',
      'Commands',
      'Create',
      'Go to',
      'Theme',
      'Help',
      'New order',
      'Orders',
      'Delete order',
    ]) {
      expect(dialog.textContent).toContain(text)
    }

    const input = document.querySelector<HTMLInputElement>('[role="dialog"] input')!
    await fireEvent.input(input, { target: { value: 'flsh' } })

    await waitFor(() => expect(dialog.textContent).not.toContain('Orders'))
    await fireEvent.click(within(dialog).getByText('Clear cache'))

    expect(trigger).toHaveBeenCalledWith(expect.objectContaining({ name: 'clear-cache' }), {
      token: 'tok',
      component: 'commands',
    })
  })

  it('opens with mod+k, also while typing', async () => {
    render(Wrapper, { props: { component: GlobalSearch, extra: [TypingProbe] } })

    keydown(screen.getByLabelText('Notes'), 'k', { ctrlKey: true, code: 'KeyK' })

    await waitFor(() => expect(document.querySelector('[role="dialog"] input')).not.toBeNull())
  })
})

describe('keyboard shortcuts', () => {
  it('opens the overlay with ? and lists the page shortcuts by group', async () => {
    render(Wrapper, { props: { component: KeyboardShortcuts } })

    keydown(document.body, '?', { shiftKey: true })

    await waitFor(() =>
      expect(document.querySelector('[data-slot="shortcuts-overlay"]')).not.toBeNull(),
    )

    const overlay = document.querySelector('[data-slot="shortcuts-overlay"]')!
    for (const text of [
      'Keyboard shortcuts',
      'General',
      'Go to the dashboard',
      'Clear cache',
      'Actions on this page',
      'Delete order',
    ]) {
      expect(overlay.textContent).toContain(text)
    }
  })

  it('does not run shortcuts while typing in a field', async () => {
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue()

    render(Wrapper, { props: { component: KeyboardShortcuts, extra: [TypingProbe] } })

    const notes = screen.getByLabelText('Notes')
    keydown(notes, '?', { shiftKey: true })
    keydown(notes, 'g')
    keydown(notes, 'c')
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(document.querySelector('[data-slot="shortcuts-overlay"]')).toBeNull()
    expect(trigger).not.toHaveBeenCalled()

    keydown(document.body, 'g')
    keydown(document.body, 'c')
    expect(trigger).toHaveBeenCalledWith(expect.objectContaining({ name: 'clear-cache' }), {
      token: 'tok',
      component: 'commands',
    })
  })

  it('records a new binding and stores it on the server', async () => {
    render(Wrapper, { props: { component: KeyboardShortcuts } })

    keydown(document.body, '?', { shiftKey: true })
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Change the shortcut for Clear cache' }),
      ).toBeInTheDocument(),
    )

    await fireEvent.click(
      screen.getByRole('button', { name: 'Change the shortcut for Clear cache' }),
    )
    keydown(window, 'j', { ctrlKey: true, code: 'KeyJ' })

    await waitFor(() => expect(shortcuts.keysFor('command:clear-cache')).toEqual(['mod+j']))

    const [url, init] = vi.mocked(fetch).mock.calls.at(-1)! as [string, RequestInit]
    expect(url).toBe('/shortcuts')
    expect(JSON.parse(String(init.body))).toEqual({
      shortcuts: { 'command:clear-cache': ['mod+j'] },
    })
  })

  it('registers nothing when the panel turns shortcuts off', async () => {
    setPageProps({ alfakit: { ...panel, ...paletteProps, keyboardShortcuts: false }, page })

    render(Wrapper, { props: { component: KeyboardShortcuts } })

    keydown(document.body, '?', { shiftKey: true })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(document.querySelector('[data-slot="shortcuts-overlay"]')).toBeNull()
    expect(shortcuts.isEnabled()).toBe(false)
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
    const { container } = render(Wrapper, {
      props: { component: RecordVersionsComponent, props: { component: versions } },
    })

    expect(container.querySelectorAll('[data-slot="record-version"]')).toHaveLength(2)
    expect(container.querySelector('[data-slot="record-version-diff"] del')).toHaveTextContent(
      'Removed: brown',
    )
    expect(container.querySelector('[data-slot="record-version-diff"] ins')).toHaveTextContent(
      'Added: red',
    )
    expect(screen.getByText('draft')).toBeInTheDocument()
    expect(screen.getByText('published')).toBeInTheDocument()
    expect(screen.getByText('Current')).toBeInTheDocument()
  })

  it('restores an older version through the nested action', async () => {
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue()

    render(Wrapper, {
      props: { component: RecordVersionsComponent, props: { component: versions } },
    })

    const buttons = screen.getAllByRole('button', { name: /Restore the version/ })
    expect(buttons).toHaveLength(1)
    await fireEvent.click(buttons[0]!)

    expect(trigger).toHaveBeenCalledWith(expect.objectContaining({ name: 'restoreVersion' }), {
      token: 'tok',
      component: 'page',
      parents: ['history'],
      arguments: { version: 1 },
    })
  })

  it('says when there are no versions', () => {
    render(Wrapper, {
      props: {
        component: RecordVersionsComponent,
        props: { component: { ...versions, versions: [] } },
      },
    })

    expect(screen.getByText('No versions yet.')).toBeInTheDocument()
  })
})
