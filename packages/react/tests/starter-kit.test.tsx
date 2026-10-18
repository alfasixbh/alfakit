import type { AlfakitPageProps, PageSchema, StarterKitBreadcrumb } from '@alfakit/core'
import { render, renderHook, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  AlfakitStarterKitRoot,
  createStarterKitPage,
  useAlfakitNavigation,
} from '../src/starter-kit'
import { panel, setPageProps } from './mocks'

function HostLayout({
  breadcrumbs = [],
  children,
}: {
  breadcrumbs?: StarterKitBreadcrumb[]
  children: ReactNode
}) {
  return (
    <div data-testid="host-layout">
      <nav aria-label="breadcrumb">{breadcrumbs.map((crumb) => crumb.title).join(' / ')}</nav>
      {children}
    </div>
  )
}

const page = {
  title: 'Posts',
  token: 'token',
  content: [],
  breadcrumbs: [{ label: 'Posts', url: '/admin/posts' }, { label: 'List' }],
} as unknown as PageSchema

const navigation = {
  id: 'admin',
  url: '/admin',
  brandName: 'Admin',
  groups: [
    {
      label: 'Blog',
      collapsible: true,
      items: [{ label: 'Posts', url: '/admin/posts', active: true }],
    },
  ],
}

beforeAll(() => {
  // sonner's toaster reads the colour scheme.
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
})

afterEach(() => setPageProps({ alfakit: panel, page: undefined, alfakitNavigation: undefined }))

describe('starter kit mode', () => {
  it('puts the page in the host layout, then the Alfakit root', () => {
    const Page = createStarterKitPage({ layout: HostLayout })
    const layouts = Page.layout({ page }) as unknown as [unknown, Record<string, unknown>][]

    expect(layouts).toHaveLength(2)
    expect(layouts[0]![0]).toBe(HostLayout)
    expect(layouts[0]![1]).toEqual({
      breadcrumbs: [
        { title: 'Posts', href: '/admin/posts' },
        { title: 'List', href: '' },
      ],
    })
    expect(layouts[1]![0]).toBe(AlfakitStarterKitRoot)
    expect(createStarterKitPage({ layout: null }).layout({ page })).toHaveLength(1)
  })

  it('renders the page content without Alfakit chrome', () => {
    setPageProps({ alfakit: { ...panel, starterKit: true }, page } as Partial<AlfakitPageProps>)
    const Page = createStarterKitPage({ layout: HostLayout })
    const [[Layout, layoutProps]] = Page.layout({ page }) as unknown as [
      [typeof HostLayout, { breadcrumbs: StarterKitBreadcrumb[] }],
    ]

    render(
      <Layout {...layoutProps}>
        <AlfakitStarterKitRoot>
          <Page />
        </AlfakitStarterKitRoot>
      </Layout>,
    )

    expect(screen.getByTestId('host-layout')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'breadcrumb' })).toHaveTextContent('Posts / List')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Posts')
    expect(document.querySelector('[data-alfakit-embedded][data-slot="content"]')).not.toBeNull()
    // No Alfakit sidebar or top bar: the host layout owns them.
    expect(document.querySelector('[data-slot="topbar"]')).toBeNull()
    expect(document.querySelector('[data-sidebar="sidebar"]')).toBeNull()
  })

  it('reads the shared navigation for the host sidebar', () => {
    setPageProps({ alfakitNavigation: [navigation] } as Partial<AlfakitPageProps>)

    const { result } = renderHook(() => useAlfakitNavigation())

    expect(result.current.navigation?.id).toBe('admin')
    expect(result.current.groups[0]).toMatchObject({ label: 'Blog' })
    expect(result.current.groups[0]!.items[0]).toMatchObject({
      title: 'Posts',
      href: '/admin/posts',
      isActive: true,
    })
    expect(renderHook(() => useAlfakitNavigation('other')).result.current.groups).toEqual([])
  })
})
