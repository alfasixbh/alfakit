import {
  commandPaletteItems,
  filterCommandPalette,
  fuzzyScore,
  paletteGroupKey,
  scorePaletteItem,
} from '../src/command-palette'
import type { PageSchema, PanelSchema } from '../src/schema/panel'
import {
  bindingFromEvent,
  focusTableSearch,
  formatShortcut,
  isEditableTarget,
  isValidShortcut,
  shortcutOverlayGroups,
  ShortcutRegistry,
} from '../src/shortcuts'

const labels = { light: 'Light', dark: 'Dark', system: 'System', shortcuts: 'Keyboard shortcuts' }

const panel = (overrides: Partial<PanelSchema> = {}): PanelSchema =>
  ({
    id: 'admin',
    path: 'admin',
    brandName: 'Test',
    darkMode: { enabled: true, forced: false },
    sidebarCollapsibleOnDesktop: true,
    breadcrumbs: true,
    navigation: [
      {
        label: 'Shop',
        collapsible: true,
        items: [
          { label: 'Orders', url: '/admin/orders', icon: 'shopping-cart' },
          {
            label: 'Products',
            url: '/admin/products',
            children: [{ label: 'Brands', url: '/admin/brands' }],
          },
        ],
      },
    ],
    endpoints: { logout: '/logout' },
    auth: {},
    flashKey: 'n',
    commandPalette: {
      commands: [
        {
          type: 'Action',
          name: 'clear-cache',
          label: 'Clear cache',
          keywords: ['flush'],
          group: 'Maintenance',
          keyBindings: ['mod+shift+x'],
          hasAction: true,
        },
        { type: 'Action', name: 'docs', label: 'Documentation', url: 'https://alfakit.dev' },
      ],
      recentRecords: true,
    },
    ...overrides,
  }) as PanelSchema

const page: PageSchema = {
  class: 'App\\EditOrder',
  layout: 'app',
  title: 'Edit order',
  content: [],
  token: 'tok',
  headerActions: [
    { type: 'Action', name: 'delete', label: 'Delete', hasModal: true },
    { type: 'Action', name: 'save', label: 'Save', formId: 'form' },
    {
      type: 'ActionGroup',
      actions: [{ type: 'Action', name: 'replicate', label: 'Replicate', keyBindings: ['mod+d'] }],
    },
  ] as PageSchema['headerActions'],
}

describe('fuzzy matching', () => {
  it('ranks exact, prefix, word and subsequence matches', () => {
    const exact = fuzzyScore('orders', 'Orders')!
    const prefix = fuzzyScore('ord', 'Orders')!
    const word = fuzzyScore('cache', 'Clear cache')!
    const subsequence = fuzzyScore('clc', 'Clear cache')!

    expect(exact).toBeGreaterThan(prefix)
    expect(prefix).toBeGreaterThan(word)
    expect(word).toBeGreaterThan(subsequence)
    expect(fuzzyScore('xyz', 'Orders')).toBeNull()
    expect(fuzzyScore('cafe', 'Café')).toBe(1000)
  })
})

describe('command palette items', () => {
  const items = commandPaletteItems({
    panel: panel(),
    page,
    labels,
    shortcutsOverlay: true,
    loaded: {
      create: [{ label: 'New order', url: '/admin/orders/create', keywords: ['orders'] }],
      recent: [{ title: 'Order #7', url: '/admin/orders/7/edit', group: 'Order' }],
    },
  })

  it('collects page actions, commands, create links, navigation, recent records, theme and help', () => {
    expect(items.map((item) => item.id)).toEqual([
      'recent:/admin/orders/7/edit',
      'actions:delete',
      'actions:replicate',
      'commands:Maintenance:clear-cache',
      'commands:docs',
      'create:/admin/orders/create',
      'navigation:/admin/orders',
      'navigation:/admin/products',
      'navigation:/admin/brands',
      'theme:light',
      'theme:dark',
      'theme:system',
      'help:shortcuts',
    ])

    const replicate = items.find((item) => item.id === 'actions:replicate')!
    expect(replicate.context).toEqual({ token: 'tok', component: 'page' })
    expect(replicate.shortcut).toBe('mod+d')

    const command = items.find((item) => item.id === 'commands:Maintenance:clear-cache')!
    expect(command.context).toEqual({ token: 'tok', component: 'commands' })
    expect(command.groupLabel).toBe('Maintenance')
    expect(items.find((item) => item.id === 'navigation:/admin/brands')?.groupLabel).toBe(
      'Products',
    )
  })

  it('filters on labels and keywords and keeps the group order', () => {
    const groups = filterCommandPalette(items, 'flush')

    expect(groups.map((group) => group.id)).toEqual(['commands:Maintenance'])
    expect(groups[0]!.label).toBe('Maintenance')
    expect(filterCommandPalette(items, 'ord').map((group) => group.id)).toEqual([
      'recent',
      'create',
      'navigation',
      'help',
    ])
    expect(filterCommandPalette(items, 'dark')[0]!.items.map((item) => item.id)).toEqual([
      'theme:dark',
    ])
    expect(scorePaletteItem(items[0]!, '')).toBe(0)
    expect(paletteGroupKey('commands:Maintenance')).toBe('palette.groups.commands')
  })

  it('limits each group without a query', () => {
    const many = Array.from({ length: 9 }, (_, index) => ({
      label: `Item ${index}`,
      url: `/i/${index}`,
    }))
    const groups = filterCommandPalette(
      commandPaletteItems({
        panel: panel({ navigation: [{ collapsible: false, items: many }] }),
        labels,
      }),
      '',
    )

    expect(groups.find((group) => group.id === 'navigation')!.items).toHaveLength(5)
  })

  it('offers nothing without the palette and no theme items without the switcher', () => {
    expect(commandPaletteItems({ panel: panel({ commandPalette: undefined }), labels })).toEqual([])
    expect(
      commandPaletteItems({
        panel: panel({ darkMode: { enabled: true, forced: false, switcher: false } }),
        labels,
      }).some((item) => item.group === 'theme'),
    ).toBe(false)
  })
})

const keydown = (key: string, init: KeyboardEventInit = {}, target?: Element) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })

  if (target) {
    target.dispatchEvent(event)
  } else {
    window.dispatchEvent(event)
  }

  return event
}

describe('shortcut registry', () => {
  let registry: ShortcutRegistry
  let disposers: Array<() => void>

  beforeEach(() => {
    registry = new ShortcutRegistry({ sequenceTimeout: 50 })
    disposers = []
  })

  afterEach(() => {
    disposers.forEach((dispose) => dispose())
    document.body.innerHTML = ''
  })

  const add = (id: string, keys: string[], extra: Record<string, unknown> = {}) => {
    const handler = vi.fn()
    disposers.push(registry.register({ id, keys, label: id, handler, ...extra }))
    return handler
  }

  it('runs single keys, punctuation with Shift, and modifier bindings', () => {
    const help = add('help.overlay', ['?'])
    const palette = add('palette.open', ['ctrl+k'])

    expect(keydown('?', { shiftKey: true }).defaultPrevented).toBe(true)
    keydown('k', { ctrlKey: true, code: 'KeyK' })

    expect(help).toHaveBeenCalledTimes(1)
    expect(palette).toHaveBeenCalledTimes(1)
  })

  it('does not fire while typing, except bindings with a modifier', () => {
    const help = add('help.overlay', ['?'])
    const search = add('search.focus', ['/'])
    const palette = add('palette.open', ['ctrl+k'])
    const input = document.createElement('input')
    const editor = document.createElement('div')
    editor.setAttribute('contenteditable', 'true')
    const inside = document.createElement('span')
    editor.append(inside)
    document.body.append(input, editor)

    keydown('?', { shiftKey: true }, input)
    keydown('/', {}, inside)
    keydown('k', { ctrlKey: true }, input)

    expect(help).not.toHaveBeenCalled()
    expect(search).not.toHaveBeenCalled()
    expect(palette).toHaveBeenCalledTimes(1)
    expect(isEditableTarget(input)).toBe(true)
    expect(isEditableTarget(inside)).toBe(true)
    expect(isEditableTarget(document.createElement('button'))).toBe(false)
  })

  it('runs sequences and forgets a started sequence after the timeout', async () => {
    const dashboard = add('go.dashboard', ['g d'])

    keydown('g')
    keydown('d')
    expect(dashboard).toHaveBeenCalledTimes(1)

    keydown('g')
    await new Promise((resolve) => setTimeout(resolve, 80))
    keydown('d')
    expect(dashboard).toHaveBeenCalledTimes(1)

    keydown('g')
    keydown('x')
    keydown('d')
    expect(dashboard).toHaveBeenCalledTimes(1)
  })

  it('applies user overrides, turns shortcuts off and keeps essential ones', () => {
    const dashboard = add('go.dashboard', ['g d'])
    const palette = add('palette.open', ['ctrl+k'], { essential: true })

    registry.setOverrides({ 'go.dashboard': ['shift+h'], 'palette.open': ['bad key'] })
    keydown('g')
    keydown('d')
    keydown('h', { shiftKey: true })
    expect(dashboard).toHaveBeenCalledTimes(1)
    expect(registry.keysFor('palette.open')).toEqual([])
    expect(registry.list().find((entry) => entry.id === 'go.dashboard')).toMatchObject({
      keys: ['shift+h'],
      defaultKeys: ['g d'],
      customized: true,
    })

    registry.setOverrides({})
    registry.setEnabled(false)
    keydown('g')
    keydown('d')
    keydown('k', { ctrlKey: true })
    expect(dashboard).toHaveBeenCalledTimes(1)
    expect(palette).toHaveBeenCalledTimes(1)
    expect(registry.list().map((entry) => entry.id)).toEqual(['palette.open'])
  })

  it('triggers by id, reports conflicts and stops listening when empty', () => {
    const help = add('help.overlay', ['?'])

    expect(registry.trigger('help.overlay')).toBe(true)
    expect(registry.trigger('missing')).toBe(false)
    expect(registry.conflict(['?'], 'other')?.id).toBe('help.overlay')
    expect(registry.conflict(['?'], 'help.overlay')).toBeUndefined()

    disposers.forEach((dispose) => dispose())
    disposers = []
    keydown('?', { shiftKey: true })
    expect(help).toHaveBeenCalledTimes(1)
  })
})

describe('shortcut helpers', () => {
  it('validates bindings like the server', () => {
    expect(isValidShortcut('mod+shift+k')).toBe(true)
    expect(isValidShortcut('g d')).toBe(true)
    expect(isValidShortcut('?')).toBe(true)
    expect(isValidShortcut('Mod+K')).toBe(false)
    expect(isValidShortcut('a b c d')).toBe(false)
    expect(isValidShortcut('<script>')).toBe(false)
  })

  it('records bindings from key presses', () => {
    const event = (key: string, init: KeyboardEventInit = {}) =>
      new KeyboardEvent('keydown', { key, ...init })

    expect(bindingFromEvent(event('k', { ctrlKey: true, shiftKey: true }))).toBe('mod+shift+k')
    expect(bindingFromEvent(event('?', { shiftKey: true }))).toBe('?')
    expect(bindingFromEvent(event('Shift', { shiftKey: true }))).toBeNull()
    expect(bindingFromEvent(event('å', { altKey: true, code: 'KeyA' }))).toBe('alt+a')
    expect(formatShortcut('g d')).toBe('G D')
  })

  it('groups the overlay entries and lists page action key bindings', () => {
    const groups = shortcutOverlayGroups(
      [
        {
          id: 'go.dashboard',
          keys: ['g d'],
          defaultKeys: ['g d'],
          customized: false,
          label: 'Dashboard',
          group: 'navigation',
          handler: () => {},
        },
        {
          id: 'help.overlay',
          keys: ['?'],
          defaultKeys: ['?'],
          customized: false,
          label: 'Shortcuts',
          handler: () => {},
        },
      ],
      [
        { name: 'save', label: 'Save', keyBindings: ['mod+s'] },
        { name: 'none', label: 'None' },
      ],
    )

    expect(groups.map((group) => group.group)).toEqual(['general', 'navigation', 'actions'])
    expect(groups[2]!.items[0]).toMatchObject({ id: 'action:save', customizable: false })
  })

  it('focuses the table search in the page content', () => {
    document.body.innerHTML =
      '<input type="search" id="outside"><main data-slot="content"><input type="search" id="table"></main>'

    expect(focusTableSearch()).toBe(true)
    expect(document.activeElement?.id).toBe('table')

    document.body.innerHTML = ''
    expect(focusTableSearch()).toBe(false)
  })
})
