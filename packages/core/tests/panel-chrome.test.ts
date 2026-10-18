import {
  applyBodyAttributes,
  filterTenants,
  globalSearchDebounce,
  globalSearchSuffix,
  hasThemeSwitcher,
  hasTopbar,
  slotItems,
} from '../src/panel-chrome'
import type { PanelSchema, SlotItemSchema } from '../src/schema/panel'
import { getStoredAppearance, panelAppearance } from '../src/theme'

const html = (text: string, scopes?: string[]): SlotItemSchema => ({
  type: 'html',
  html: text,
  ...(scopes ? { for: scopes } : {}),
})

describe('slotItems', () => {
  const slots = {
    'table.toolbar.start': [
      html('everywhere'),
      html('comments', ['relationManager:App\\Comments']),
      html('stats', ['widget:app-widgets-stats']),
    ],
  }

  it('returns unscoped items everywhere and scoped items only for their component', () => {
    expect(
      slotItems(slots, 'table.toolbar.start').map((item) => item.type === 'html' && item.html),
    ).toEqual(['everywhere'])
    expect(
      slotItems(slots, 'table.toolbar.start', 'relationManager:App\\Comments').map(
        (item) => item.type === 'html' && item.html,
      ),
    ).toEqual(['everywhere', 'comments'])
  })

  it('renders items with `when` only where the slot data matches', () => {
    const cells = {
      'table.header-cell': [
        html('all'),
        { ...html('title'), when: { column: 'title' } },
        { ...html('money'), when: { column: ['price', 'total'] } },
      ],
    }
    const texts = (data?: Record<string, unknown>) =>
      slotItems(cells, 'table.header-cell', null, data).map(
        (item) => item.type === 'html' && item.html,
      )

    expect(texts({ column: 'title' })).toEqual(['all', 'title'])
    expect(texts({ column: 'total' })).toEqual(['all', 'money'])
    expect(texts()).toEqual(['all'])
  })

  it('matches widgets made with properties by their id prefix', () => {
    expect(
      slotItems(slots, 'table.toolbar.start', 'widget:app-widgets-stats--1a2b3c4d'),
    ).toHaveLength(2)
    expect(slotItems(slots, 'table.toolbar.start', 'widget:app-widgets-statsx')).toHaveLength(1)
  })

  it('returns nothing for empty or missing slots', () => {
    expect(slotItems(undefined, 'footer')).toEqual([])
    expect(slotItems({ footer: [] }, 'footer')).toEqual([])
  })
})

describe('panel chrome flags', () => {
  const darkMode = (value: Partial<PanelSchema['darkMode']>): Pick<PanelSchema, 'darkMode'> => ({
    darkMode: { enabled: true, forced: false, ...value },
  })

  it('hides the top bar and theme switcher when the panel says so', () => {
    expect(hasTopbar({})).toBe(true)
    expect(hasTopbar({ topbar: false })).toBe(false)
    expect(hasThemeSwitcher(darkMode({}))).toBe(true)
    expect(hasThemeSwitcher(darkMode({ switcher: false }))).toBe(false)
    expect(hasThemeSwitcher(darkMode({ forced: true }))).toBe(false)
    expect(hasThemeSwitcher(darkMode({ enabled: false }))).toBe(false)
  })

  it('starts in the default theme mode until the user picks one', () => {
    localStorage.removeItem('alfakit_appearance')
    expect(getStoredAppearance()).toBe('system')
    expect(panelAppearance(darkMode({ default: 'dark' }))).toBe('dark')

    localStorage.setItem('alfakit_appearance', 'light')
    expect(panelAppearance(darkMode({ default: 'dark' }))).toBe('light')
    // Without the switcher the stored choice is ignored.
    expect(panelAppearance(darkMode({ default: 'dark', switcher: false }))).toBe('dark')
    localStorage.removeItem('alfakit_appearance')
  })
})

describe('filterTenants', () => {
  const tenants = [
    { id: 1, name: 'Acme', url: '/a' },
    { id: 2, name: 'Café Noir', url: '/b' },
  ]

  it('filters by name, ignoring case and accents', () => {
    expect(filterTenants(tenants, 'cafe').map((tenant) => tenant.id)).toEqual([2])
    expect(filterTenants(tenants, '  ')).toHaveLength(2)
  })
})

describe('global search field', () => {
  const config = { keyBindings: ['mod+k'], placeholder: 'Search' }

  it('uses the configured debounce or 250ms', () => {
    expect(globalSearchDebounce(config)).toBe(250)
    expect(globalSearchDebounce({ ...config, debounce: 600 })).toBe(600)
  })

  it('shows the custom suffix, the key binding or nothing', () => {
    expect(globalSearchSuffix(config)).toEqual({ type: 'keyBinding', keyBinding: 'mod+k' })
    expect(globalSearchSuffix({ ...config, suffix: 'Ctrl K' })).toEqual({
      type: 'text',
      text: 'Ctrl K',
    })
    expect(globalSearchSuffix({ ...config, keyBindingSuffix: false })).toBeNull()
  })
})

describe('applyBodyAttributes', () => {
  it('adds classes and attributes and restores the body afterwards', () => {
    document.body.className = 'own'
    const undo = applyBodyAttributes({
      class: 'settings own',
      'data-page': 'settings',
      onclick: 'x',
    })

    expect(document.body.className).toBe('own settings')
    expect(document.body.getAttribute('data-page')).toBe('settings')
    expect(document.body.hasAttribute('onclick')).toBe(false)

    undo()
    expect(document.body.className).toBe('own')
    expect(document.body.hasAttribute('data-page')).toBe(false)
  })
})
