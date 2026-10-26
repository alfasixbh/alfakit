import { describe, expect, it, vi } from 'vitest'
import {
  applyPanelTheme,
  isStarterKitPanel,
  loadStarterKitPanel,
  loadedStarterKitPanel,
  resetStarterKitPanels,
  standaloneWidgetCount,
  starterKitBreadcrumbsFromProps,
  starterKitDashboardWidgets,
  starterKitNavigation,
  starterKitPanelLocale,
  starterKitWidgets,
  toStarterKitBreadcrumbs,
  toStarterKitNavGroups,
  type PanelSchema,
  type StandaloneComponentSchema,
  type StarterKitNavigationSchema,
} from '../src'
import { toStarterKitUserMenuItems } from '../src/starter-kit'
import dashboard from './fixtures/standalone/starter-kit-dashboard.json'

const navigation: StarterKitNavigationSchema = {
  id: 'admin',
  url: 'http://app.test/admin',
  brandName: 'Admin',
  groups: [
    {
      label: null,
      collapsible: false,
      items: [{ label: 'Posts', url: '/admin/posts', icon: 'newspaper', active: true, badge: 3 }],
    },
    {
      label: 'Shop',
      collapsible: true,
      items: [
        {
          label: '<b>Orders</b>',
          labelHtml: true,
          url: '/admin/orders',
          children: [{ label: 'Returns', url: '/admin/returns', openInNewTab: true }],
        },
      ],
    },
  ],
}

describe('starter kit mode', () => {
  it('detects starter kit panels', () => {
    expect(isStarterKitPanel({ starterKit: true })).toBe(true)
    expect(isStarterKitPanel({})).toBe(false)
    expect(isStarterKitPanel(undefined)).toBe(false)
  })

  it('maps breadcrumbs to the starter kits shape', () => {
    expect(
      toStarterKitBreadcrumbs([{ label: 'Posts', url: '/admin/posts' }, { label: 'Edit' }]),
    ).toEqual([
      { title: 'Posts', href: '/admin/posts' },
      { title: 'Edit', href: '' },
    ])
    // The kits key breadcrumbs by href: crumbs without (or with a repeated) URL stay unique.
    expect(
      toStarterKitBreadcrumbs([
        { label: 'Posts', url: '/admin/posts' },
        { label: '1' },
        { label: 'Again', url: '/admin/posts' },
        { label: 'Edit' },
      ]).map((crumb) => crumb.href),
    ).toEqual(['/admin/posts', '#1', '/admin/posts#2', ''])
    expect(
      starterKitBreadcrumbsFromProps({ page: { breadcrumbs: [{ label: 'A', url: '/a' }] } }),
    ).toEqual([{ title: 'A', href: '/a' }])
    expect(starterKitBreadcrumbsFromProps({})).toEqual([])
  })

  it('reads the shared navigation of a panel', () => {
    const props = { alfakitNavigation: [navigation, { ...navigation, id: 'app' }] }

    expect(starterKitNavigation(props)?.id).toBe('admin')
    expect(starterKitNavigation(props, 'app')?.id).toBe('app')
    expect(starterKitNavigation(props, 'missing')).toBeNull()
    expect(starterKitNavigation({ alfakitNavigation: null })).toBeNull()
  })

  it("follows the open AlfaKit page's panel when no id is given", () => {
    const app = { ...navigation, id: 'app' }
    const props = { alfakitNavigation: [navigation, app], alfakit: { id: 'app' } }

    expect(starterKitNavigation(props)?.id).toBe('app')
    expect(starterKitNavigation(props, 'admin')?.id).toBe('admin')
    expect(starterKitNavigation({ ...props, alfakit: { id: 'other' } })?.id).toBe('admin')
  })

  it('picks the panel that has a header component part', () => {
    const widgets = {
      endpoint: '/admin/_alfakit/starter-kit',
      search: { keyBindings: [], placeholder: 'S' },
    }
    const app = {
      ...navigation,
      id: 'app',
      widgets: { endpoint: '/app/_alfakit/starter-kit', tenancy: { current: null, tenants: [] } },
    }
    const props = { alfakitNavigation: [{ ...navigation, widgets }, app] }

    expect(starterKitWidgets(props)?.navigation.id).toBe('admin')
    expect(starterKitWidgets(props, undefined, 'tenancy')?.navigation.id).toBe('app')
    expect(starterKitWidgets(props, 'admin', 'tenancy')?.navigation.id).toBe('admin')
    expect(starterKitWidgets({ ...props, alfakit: { id: 'app' } })?.navigation.id).toBe('app')
  })

  it('keys sidebar items by URL, so a reordered list keeps each link with its entry (W-S4-08)', () => {
    const item = (label: string, url: string) => ({ label, url, icon: null, active: false })
    const english = toStarterKitNavGroups([
      { label: null, items: [item('Forms', '/admin/forms'), item('Pages', '/admin/cms/pages')] },
    ] as never)
    const arabic = toStarterKitNavGroups([
      {
        label: null,
        items: [item('الصفحات', '/admin/cms/pages'), item('النماذج', '/admin/forms')],
      },
    ] as never)
    const keyOf = (groups: typeof english, href: string) =>
      groups[0]!.items.find((entry) => entry.href === href)!.key

    expect(keyOf(english, '/admin/cms/pages')).toBe(keyOf(arabic, '/admin/cms/pages'))
    expect(keyOf(english, '/admin/forms')).toBe(keyOf(arabic, '/admin/forms'))

    // Same labels, another tenant's URLs: new keys, so no link keeps the old tenant (W-S5-02).
    const acme = toStarterKitNavGroups([
      { label: null, items: [item('Projects', '/app/acme/projects')] },
    ] as never)
    const beta = toStarterKitNavGroups([
      { label: null, items: [item('Projects', '/app/beta/projects')] },
    ] as never)
    expect(acme[0]!.items[0]!.key).not.toBe(beta[0]!.items[0]!.key)

    // A repeated URL still gets a unique key.
    const twice = toStarterKitNavGroups([
      { label: null, items: [item('A', '/x'), item('B', '/x')] },
    ] as never)
    expect(new Set(twice[0]!.items.map((entry) => entry.key)).size).toBe(2)
  })

  it('flattens groups into host sidebar items', () => {
    const groups = toStarterKitNavGroups(navigation.groups)

    expect(groups).toHaveLength(2)
    expect(groups[0]).toMatchObject({ label: null })
    expect(groups[0]!.items[0]).toMatchObject({
      title: 'Posts',
      href: '/admin/posts',
      icon: 'newspaper',
      isActive: true,
      badge: 3,
      children: [],
    })
    expect(groups[1]!.items[0]!.title).toBe('Orders')
    expect(groups[1]!.items[0]!.children[0]).toMatchObject({ title: 'Returns', openInNewTab: true })
    expect(new Set(groups.flatMap((group) => group.items.map((item) => item.key))).size).toBe(2)
  })

  it('leaves the host document theme alone', () => {
    const root = document.documentElement
    root.removeAttribute('data-alfakit-theme')
    root.style.removeProperty('--radius')

    applyPanelTheme({
      id: 'admin',
      starterKit: true,
      colors: { success: 'oklch(0.6 0.2 150)' },
      theme: { attribute: 'alfakit', sidebar: 'default', density: 'default', radius: '1rem' },
    } as unknown as PanelSchema)

    expect(root.hasAttribute('data-alfakit-theme')).toBe(false)
    expect(root.hasAttribute('data-panel')).toBe(false)
    expect(root.style.getPropertyValue('--radius')).toBe('')
    expect(root.style.getPropertyValue('--alfakit-success')).toBe('oklch(0.6 0.2 150)')
  })
})

describe('starter kit dashboard widgets', () => {
  const component = dashboard as unknown as StandaloneComponentSchema

  it('picks the first panel, or the named one, from the shared prop', () => {
    const props = {
      alfakitWidgets: [
        { id: 'admin', component },
        { id: 'crm', component: { ...component, token: 'crm' } },
      ],
    }

    expect(starterKitDashboardWidgets(props)).toBe(component)
    expect(starterKitDashboardWidgets(props, 'crm')?.token).toBe('crm')
    expect(starterKitDashboardWidgets(props, 'other')).toBeNull()
    expect(starterKitDashboardWidgets({ alfakitWidgets: null })).toBeNull()
    expect(starterKitDashboardWidgets(undefined)).toBeNull()
  })

  it('counts the widgets of a payload', () => {
    expect(standaloneWidgetCount(component)).toBe(1)
    expect(standaloneWidgetCount({ ...component, content: [] })).toBe(0)
  })
})

describe('starter kit header components panel data', () => {
  it('refuses an answer that is not the panel data (a redirect to the sign-in page)', async () => {
    resetStarterKitPanels()
    const fetchMock = vi.fn(
      async () => new Response('<!DOCTYPE html><html></html>', { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(loadStarterKitPanel('/admin/_alfakit/starter-kit')).rejects.toThrow()
    expect(loadedStarterKitPanel('/admin/_alfakit/starter-kit')).toBeNull()

    // The next render asks again and keeps real panel data.
    fetchMock.mockImplementation(
      async () =>
        new Response(JSON.stringify({ id: 'admin', endpoints: { action: '/a' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    )
    await expect(loadStarterKitPanel('/admin/_alfakit/starter-kit')).resolves.toMatchObject({
      id: 'admin',
    })
    expect(loadedStarterKitPanel('/admin/_alfakit/starter-kit')).not.toBeNull()

    vi.unstubAllGlobals()
    resetStarterKitPanels()
  })

  it('loads the panel data again in a new language', async () => {
    resetStarterKitPanels()
    let code = 'en'
    const fetchMock = vi
      .fn()
      .mockImplementation(
        async () =>
          new Response(
            JSON.stringify({ id: 'admin', endpoints: { action: '/a' }, localization: { code } }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
      )
    vi.stubGlobal('fetch', fetchMock)

    const source = (current: string) => ({
      navigation,
      widgets: {
        endpoint: '/admin/_alfakit/starter-kit',
        language: {
          label: 'Change language',
          current: { code: current, tag: current, label: current, direction: 'ltr' as const },
        },
      },
    })

    expect(starterKitPanelLocale(source('en'))).toBe('en')
    expect(starterKitPanelLocale({ navigation, widgets: { endpoint: '/e' } })).toBeUndefined()

    await loadStarterKitPanel('/admin/_alfakit/starter-kit', 'en')
    await loadStarterKitPanel('/admin/_alfakit/starter-kit', 'en')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // After a switch the shared prop names the new language: its data loads once more.
    code = 'fr'
    expect(loadedStarterKitPanel('/admin/_alfakit/starter-kit', 'fr')).toBeNull()
    await expect(
      loadStarterKitPanel('/admin/_alfakit/starter-kit', starterKitPanelLocale(source('fr'))),
    ).resolves.toMatchObject({ localization: { code: 'fr' } })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(loadedStarterKitPanel('/admin/_alfakit/starter-kit', 'en')).toMatchObject({
      localization: { code: 'en' },
    })

    vi.unstubAllGlobals()
    resetStarterKitPanels()
  })
})

describe('starter kit user menu items', () => {
  it('maps the shared user menu links and marks where a new group starts', () => {
    const items = toStarterKitUserMenuItems([
      { label: 'Billing', icon: 'credit-card', url: '/billing' },
      { label: 'Plans', url: '/plans' },
      { label: 'Docs', url: 'https://example.com', openInNewTab: true, group: 1 },
      { label: 'Ping', action: { type: 'Action', name: 'ping' } },
      { label: 'Leave', url: '/leave', method: 'post', group: 1 },
    ])

    expect(items.map((item) => [item.title, item.href, item.startsGroup])).toEqual([
      ['Billing', '/billing', false],
      ['Plans', '/plans', false],
      ['Docs', 'https://example.com', true],
      ['Leave', '/leave', false],
    ])
    expect(items[0]?.icon).toBe('credit-card')
    expect(items[2]?.openInNewTab).toBe(true)
    expect(items[3]?.method).toBe('post')
    expect(toStarterKitUserMenuItems(undefined)).toEqual([])
  })
})
