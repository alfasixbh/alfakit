import type { PageSchema, PanelSchema, RecordVersionsSchema } from '@alfakit/core'
import { shortcuts } from '@alfakit/core'
import { h } from 'vue'
import GlobalSearch from '../src/components/panel/GlobalSearch.vue'
import KeyboardShortcuts from '../src/components/panel/KeyboardShortcuts.vue'
import RecordVersionsComponent from '../src/components/versions/RecordVersionsComponent.vue'
import { actions, flush, mountWithAlfakit, panel, setPageProps } from './mocks'

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

const until = async (check: () => boolean) => {
  for (let attempt = 0; attempt < 50 && !check(); attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 10))
    await flush()
  }
}

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
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('command palette', () => {
  it('lists page actions, commands, navigation, create links and recent records, and runs them', async () => {
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue()
    const wrapper = mountWithAlfakit(() => h(GlobalSearch))
    const input = () => document.querySelector<HTMLInputElement>('[role="dialog"] input')

    await wrapper.find('button').trigger('click')
    await until(() => document.body.textContent?.includes('Order #7') ?? false)

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
      expect(document.querySelector('[role="dialog"]')?.textContent).toContain(text)
    }

    input()!.value = 'flsh'
    input()!.dispatchEvent(new Event('input', { bubbles: true }))
    await flush()

    expect(document.querySelector('[role="dialog"]')?.textContent).not.toContain('Orders')

    const item = [...document.querySelectorAll<HTMLElement>('[data-slot="command-item"]')].find(
      (element) => element.textContent?.includes('Clear cache'),
    )!
    item.click()
    await flush()

    expect(trigger).toHaveBeenCalledWith(expect.objectContaining({ name: 'clear-cache' }), {
      token: 'tok',
      component: 'commands',
    })
    wrapper.unmount()
  })

  it('opens with mod+k, also while typing', async () => {
    const wrapper = mountWithAlfakit(() => [h('input', { 'aria-label': 'Name' }), h(GlobalSearch)])

    keydown(document.querySelector('input[aria-label="Name"]')!, 'k', {
      ctrlKey: true,
      code: 'KeyK',
    })
    await until(() => document.querySelector('[role="dialog"] input') !== null)

    expect(document.querySelector('[role="dialog"] input')).not.toBeNull()
    wrapper.unmount()
  })
})

describe('keyboard shortcuts', () => {
  it('opens the overlay with ? and lists the page shortcuts by group', async () => {
    const wrapper = mountWithAlfakit(() => h(KeyboardShortcuts))

    keydown(document.body, '?', { shiftKey: true })
    await until(() => document.querySelector('[data-slot="shortcuts-overlay"]') !== null)

    const overlay = document.querySelector('[data-slot="shortcuts-overlay"]')!
    expect(overlay.textContent).toContain('Keyboard shortcuts')
    expect(overlay.textContent).toContain('General')
    expect(overlay.textContent).toContain('Go to the dashboard')
    expect(overlay.textContent).toContain('Clear cache')
    expect(overlay.textContent).toContain('Actions on this page')
    expect(overlay.textContent).toContain('Delete order')
    wrapper.unmount()
  })

  it('does not run shortcuts while typing in a field', async () => {
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue()
    const wrapper = mountWithAlfakit(() => [
      h('textarea', { 'aria-label': 'Notes' }),
      h(KeyboardShortcuts),
    ])
    const notes = document.querySelector('textarea')!

    keydown(notes, '?', { shiftKey: true })
    keydown(notes, 'g')
    keydown(notes, 'c')
    await flush()

    expect(document.querySelector('[data-slot="shortcuts-overlay"]')).toBeNull()
    expect(trigger).not.toHaveBeenCalled()

    keydown(document.body, 'g')
    keydown(document.body, 'c')
    expect(trigger).toHaveBeenCalledWith(expect.objectContaining({ name: 'clear-cache' }), {
      token: 'tok',
      component: 'commands',
    })
    wrapper.unmount()
  })

  it('records a new binding and stores it on the server', async () => {
    const wrapper = mountWithAlfakit(() => h(KeyboardShortcuts))

    keydown(document.body, '?', { shiftKey: true })
    await until(() => document.querySelector('[data-slot="shortcuts-overlay"]') !== null)

    document
      .querySelector<HTMLElement>('[aria-label="Change the shortcut for Clear cache"]')!
      .click()
    await flush()
    keydown(window, 'j', { ctrlKey: true, code: 'KeyJ' })
    await until(() => shortcuts.keysFor('command:clear-cache')[0] === 'mod+j')

    expect(shortcuts.keysFor('command:clear-cache')).toEqual(['mod+j'])
    const [url, init] = vi.mocked(fetch).mock.calls.at(-1)! as [string, RequestInit]
    expect(url).toBe('/shortcuts')
    expect(JSON.parse(String(init.body))).toEqual({
      shortcuts: { 'command:clear-cache': ['mod+j'] },
    })
    wrapper.unmount()
  })

  it('registers nothing when the panel turns shortcuts off', async () => {
    setPageProps({ alfakit: { ...panel, ...paletteProps, keyboardShortcuts: false }, page })
    const wrapper = mountWithAlfakit(() => h(KeyboardShortcuts))

    keydown(document.body, '?', { shiftKey: true })
    await flush()

    expect(document.querySelector('[data-slot="shortcuts-overlay"]')).toBeNull()
    expect(shortcuts.isEnabled()).toBe(false)
    wrapper.unmount()
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
    const wrapper = mountWithAlfakit(() => h(RecordVersionsComponent, { component: versions }))

    expect(wrapper.findAll('[data-slot="record-version"]')).toHaveLength(2)
    expect(wrapper.find('[data-slot="record-version-diff"] del').text()).toBe('Removed: brown')
    expect(wrapper.find('[data-slot="record-version-diff"] ins').text()).toBe('Added: red')
    expect(wrapper.text()).toContain('draft')
    expect(wrapper.text()).toContain('published')
    expect(wrapper.text()).toContain('Current')
    wrapper.unmount()
  })

  it('restores an older version through the nested action', async () => {
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue()
    const wrapper = mountWithAlfakit(() => h(RecordVersionsComponent, { component: versions }))
    const buttons = wrapper.findAll('button')

    expect(buttons).toHaveLength(1)
    await buttons[0]!.trigger('click')

    expect(trigger).toHaveBeenCalledWith(expect.objectContaining({ name: 'restoreVersion' }), {
      token: 'tok',
      component: 'page',
      parents: ['history'],
      arguments: { version: 1 },
    })
    wrapper.unmount()
  })

  it('says when there are no versions', () => {
    const wrapper = mountWithAlfakit(() =>
      h(RecordVersionsComponent, { component: { ...versions, versions: [] } }),
    )

    expect(wrapper.text()).toContain('No versions yet.')
    wrapper.unmount()
  })
})
