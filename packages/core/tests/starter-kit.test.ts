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
  starterKitWidgets,
  toStarterKitBreadcrumbs,
  toStarterKitNavGroups,
  type PanelSchema,
  type StandaloneComponentSchema,
  type StarterKitNavigationSchema,
} from '../src'
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
})
