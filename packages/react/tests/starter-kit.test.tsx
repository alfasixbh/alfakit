import type { AlfakitPageProps, PageSchema, StarterKitBreadcrumb } from '@alfakit/core'
import { act, render, renderHook, screen } from '@testing-library/react'
import { Direction } from 'radix-ui'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { showToast } from '../src/components/notifications/flash-toasts'
import { Dialog, DialogContent, DialogTitle } from '../src/components/ui/dialog'
import { Popover, PopoverContent } from '../src/components/ui/popover'
import {
  AlfakitStarterKitRoot,
  createStarterKitPage,
  useAlfakitDirection,
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

afterEach(() =>
  setPageProps({
    alfakit: panel,
    page: undefined,
    alfakitNavigation: undefined,
    alfakitDocument: undefined,
  }),
)

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

  it('renders a fullscreen page in the host layout without the fullscreen header (W-V3-24)', async () => {
    const fullscreen = {
      ...page,
      layout: 'fullscreen',
      fullscreen: { exitUrl: '/admin' },
    } as unknown as PageSchema
    setPageProps({
      alfakit: { ...panel, starterKit: true },
      page: fullscreen,
    } as Partial<AlfakitPageProps>)
    const Page = createStarterKitPage({ layout: HostLayout })
    const [[Layout, layoutProps]] = Page.layout({ page: fullscreen }) as unknown as [
      [typeof HostLayout, { breadcrumbs: StarterKitBreadcrumb[] }],
    ]

    render(
      <Layout {...layoutProps}>
        <AlfakitStarterKitRoot>
          <Page />
        </AlfakitStarterKitRoot>
      </Layout>,
    )

    expect(
      await screen
        .findByTestId('host-layout')
        .then(() => document.querySelector('[data-alfakit-embedded][data-layout="fullscreen"]')),
    ).not.toBeNull()
    await new Promise((resolve) => setTimeout(resolve, 50))
    // The host layout is the chrome: no AlfaKit brand, top bar slots, user menu or Exit.
    expect(document.querySelector('[data-slot="topbar"]')).toBeNull()
    expect(document.querySelector('[data-slot="fullscreen-exit"]')).toBeNull()
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

  it('flips the whole document in a right-to-left panel language, and back after a switch', () => {
    document.documentElement.dir = 'ltr'
    document.documentElement.lang = 'en'
    setPageProps({
      alfakit: {
        ...panel,
        starterKit: true,
        localization: { code: 'ar', tag: 'ar', direction: 'rtl', locales: [] },
      },
      alfakitDocument: { tag: 'ar', direction: 'rtl' },
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

    // The kit's sidebar and header mirror too: <html> follows the shared `alfakitDocument`.
    expect(document.documentElement).toHaveAttribute('dir', 'rtl')
    expect(document.documentElement).toHaveAttribute('lang', 'ar')
    expect(document.querySelector('[data-slot="starter-kit-root"]')).toHaveAttribute('dir', 'rtl')

    // Switching back to English redirects back: a visit with the new props.
    act(() => {
      document.dispatchEvent(
        new CustomEvent('inertia:navigate', {
          detail: { page: { props: { alfakitDocument: { tag: 'en', direction: 'ltr' } } } },
        }),
      )
    })

    expect(document.documentElement).toHaveAttribute('dir', 'ltr')
    expect(document.documentElement).toHaveAttribute('lang', 'en')
  })

  it("keeps the kit's own pages in the app's language, right to left, and docks the sidebar on the right", () => {
    document.documentElement.dir = 'ltr'
    document.documentElement.lang = 'en'
    setPageProps({
      alfakit: undefined,
      alfakitDocument: { tag: 'en', direction: 'rtl' },
    } as unknown as Partial<AlfakitPageProps>)

    const { result } = renderHook(() => useAlfakitDirection())

    expect(result.current).toBe('rtl')
    expect(document.documentElement).toHaveAttribute('dir', 'rtl')
    expect(document.documentElement).toHaveAttribute('lang', 'en')
  })

  it('leaves the document alone without the shared prop', () => {
    document.documentElement.dir = 'ltr'
    document.documentElement.lang = 'en'
    setPageProps({
      alfakit: {
        ...panel,
        starterKit: true,
        localization: { code: 'ar', tag: 'ar', direction: 'rtl', locales: [] },
      },
      alfakitDocument: undefined,
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

    // An app whose server does not share it yet: <html> stays the host's.
    expect(document.documentElement).toHaveAttribute('dir', 'ltr')
    expect(document.documentElement).toHaveAttribute('lang', 'en')
    const root = document.querySelector('[data-slot="starter-kit-root"]')
    expect(root).toHaveAttribute('dir', 'rtl')
    expect(root).toHaveAttribute('lang', 'ar')
    expect(root?.querySelector('[data-slot="content"]')).not.toBeNull()
  })

  it("puts toasts in the host document's top-right corner in a right-to-left language, not over the kit's sidebar (W-D-03)", async () => {
    document.documentElement.dir = 'ltr'
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

    await act(async () => {
      showToast({ id: 'kit-rtl', title: 'تم الحفظ', status: 'success' } as never)
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    const toaster = screen.getByText('تم الحفظ').closest('[data-sonner-toaster]')
    expect(toaster?.getAttribute('data-x-position')).toBe('right')
    expect(toaster?.getAttribute('dir')).toBe('rtl')
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
    setPageProps({
      alfakitNavigation: [
        {
          ...navigation,
          userMenu: [{ label: 'Billing', icon: 'credit-card', url: '/admin/billing' }],
        },
      ],
    } as Partial<AlfakitPageProps>)

    const { result } = renderHook(() => useAlfakitNavigation())

    expect(result.current.navigation?.id).toBe('admin')
    expect(result.current.groups[0]).toMatchObject({ label: 'Blog' })
    expect(result.current.groups[0]!.items[0]).toMatchObject({
      title: 'Posts',
      href: '/admin/posts',
      isActive: true,
    })
    expect(result.current.userMenuItems).toMatchObject([
      { title: 'Billing', href: '/admin/billing', icon: 'credit-card' },
    ])
    expect(renderHook(() => useAlfakitNavigation('other')).result.current.groups).toEqual([])
  })
})
