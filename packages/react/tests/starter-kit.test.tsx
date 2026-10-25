import type { AlfakitPageProps, PageSchema, StarterKitBreadcrumb } from '@alfakit/core'
import { render, renderHook, screen } from '@testing-library/react'
import { Direction } from 'radix-ui'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { Dialog, DialogContent, DialogTitle } from '../src/components/ui/dialog'
import { Popover, PopoverContent } from '../src/components/ui/popover'
import {
  AlfakitStarterKitRoot,
  createStarterKitPage,
  useAlfakitNavigation,
} from '../src/starter-kit'
import { Wrapper, panel, setPageProps } from './mocks'

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
    // Sign-in and the other `auth` pages stand on their own, like the host's auth pages.
    expect(Page.layout({ page: { ...page, layout: 'auth' } })).toEqual([
      [AlfakitStarterKitRoot, { options: { layout: HostLayout } }],
    ])
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

  it('offers the debug panel on starter kit pages when the page has debug data', async () => {
    setPageProps({
      alfakit: { ...panel, starterKit: true },
      page,
      alfakitDebug: { queries: [] },
    } as unknown as Partial<AlfakitPageProps>)
    const Page = createStarterKitPage({ layout: null })

    render(
      <AlfakitStarterKitRoot>
        <Page />
      </AlfakitStarterKitRoot>,
    )

    // The debug panel's code loads on demand.
    expect(await screen.findByRole('button', { name: 'Open debug panel' })).toBeInTheDocument()
  })

  it('mirrors only its own content in a right-to-left language, never the host document', () => {
    document.documentElement.dir = 'ltr'
    document.documentElement.lang = 'en'
    setPageProps({
      alfakit: {
        ...panel,
        starterKit: true,
        localization: { code: 'ar', tag: 'ar', direction: 'rtl', locales: [] },
      },
      page,
    } as unknown as Partial<AlfakitPageProps>)
    const Page = createStarterKitPage({ layout: HostLayout })

    render(
      <HostLayout>
        <AlfakitStarterKitRoot>
          <Page />
        </AlfakitStarterKitRoot>
      </HostLayout>,
    )

    // The host's sidebar and its own pages are not right to left: <html> stays the host's.
    expect(document.documentElement).toHaveAttribute('dir', 'ltr')
    expect(document.documentElement).toHaveAttribute('lang', 'en')
    const root = document.querySelector('[data-slot="starter-kit-root"]')
    expect(root).toHaveAttribute('dir', 'rtl')
    expect(root).toHaveAttribute('lang', 'ar')
    expect(root?.querySelector('[data-slot="content"]')).not.toBeNull()
  })

  it('gives portaled modals and popovers the reading direction (they render outside its root)', () => {
    render(
      <Direction.Provider dir="rtl">
        <Dialog open>
          <DialogContent aria-describedby={undefined}>
            <DialogTitle>Edit</DialogTitle>
          </DialogContent>
        </Dialog>
        <Popover open>
          <PopoverContent>Filters</PopoverContent>
        </Popover>
      </Direction.Provider>,
      { wrapper: Wrapper },
    )

    expect(document.querySelector('[data-slot="dialog-content"]')).toHaveAttribute('dir', 'rtl')
    expect(document.querySelector('[data-slot="popover-content"]')).toHaveAttribute('dir', 'rtl')
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
