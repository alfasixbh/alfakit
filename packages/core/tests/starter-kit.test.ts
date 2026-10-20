import { describe, expect, it } from 'vitest'
import {
  applyPanelTheme,
  isStarterKitPanel,
  standaloneWidgetCount,
  starterKitBreadcrumbsFromProps,
  starterKitDashboardWidgets,
  starterKitNavigation,
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
