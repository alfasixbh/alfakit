import type { AlfakitPageProps, PageSchema } from '@alfakit/core'
import { render, screen } from '@testing-library/svelte'
import { showToast } from '../src/components/notifications/toast'
import {
  AlfakitStarterKitRoot,
  createStarterKitLayout,
  useAlfakitNavigation,
} from '../src/starter-kit'
import DirectionDialogHarness from './DirectionDialogHarness.svelte'
import { panel, setPageProps } from './mocks'
import StarterKitHarness from './StarterKitHarness.svelte'
import StarterKitHostLayout from './StarterKitHostLayout.svelte'

const page = {
  title: 'Posts',
  token: 'token',
  content: [],
  breadcrumbs: [{ label: 'Posts', url: '/admin/posts' }, { label: 'List' }],
} as unknown as PageSchema

afterEach(() => setPageProps({ alfakit: panel, page: undefined, alfakitNavigation: undefined }))

describe('starter kit mode', () => {
  it('puts the page in the host layout, then the Alfakit root', () => {
    const layout = createStarterKitLayout({ layout: StarterKitHostLayout })
    const layouts = layout({ page }) as [unknown, Record<string, unknown>][]

    expect(layouts).toHaveLength(2)
    expect(layouts[0]![0]).toBe(StarterKitHostLayout)
    expect(layouts[0]![1]).toEqual({
      breadcrumbs: [
        { title: 'Posts', href: '/admin/posts' },
        { title: 'List', href: '' },
      ],
    })
    expect(layouts[1]![0]).toBe(AlfakitStarterKitRoot)
    expect(createStarterKitLayout({ layout: null })({ page })).toHaveLength(1)
    // Sign-in and the other `auth` pages stand on their own, like the host's auth pages.
    const auth = layout({ page: { ...page, layout: 'auth' } }) as [unknown, unknown][]
    expect(auth).toHaveLength(1)
    expect(auth[0]![0]).toBe(AlfakitStarterKitRoot)
  })

  it('renders the page content without Alfakit chrome', () => {
    setPageProps({ alfakit: { ...panel, starterKit: true }, page } as Partial<AlfakitPageProps>)
    const [[, layoutProps]] = createStarterKitLayout({ layout: StarterKitHostLayout })({
      page,
    }) as [[unknown, { breadcrumbs: { title: string; href: string }[] }]]

    render(StarterKitHarness, { props: layoutProps })

    expect(screen.getByTestId('host-layout')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'breadcrumb' })).toHaveTextContent('Posts / List')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Posts')
    expect(document.querySelector('[data-alfakit-embedded][data-slot="content"]')).not.toBeNull()
    expect(document.querySelector('[data-slot="topbar"]')).toBeNull()
    expect(document.querySelector('[data-sidebar="sidebar"]')).toBeNull()
  })

  it('renders a fullscreen page in the host layout without the fullscreen header (W-V3-24)', async () => {
    const fullscreen = { ...page, layout: 'fullscreen', fullscreen: { exitUrl: '/admin' } }
    setPageProps({
      alfakit: { ...panel, starterKit: true },
      page: fullscreen,
    } as unknown as Partial<AlfakitPageProps>)

    render(StarterKitHarness, { props: { breadcrumbs: [] } })
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(
      document.querySelector('[data-alfakit-embedded][data-layout="fullscreen"]'),
    ).not.toBeNull()
    // The host layout is the chrome: no AlfaKit brand, top bar slots, user menu or Exit.
    expect(document.querySelector('[data-slot="topbar"]')).toBeNull()
    expect(document.querySelector('[data-slot="fullscreen-exit"]')).toBeNull()
  })

  it('mirrors only its own content in a right-to-left language, never the host document', () => {
    document.documentElement.dir = 'ltr'
    document.documentElement.lang = 'en'
    const alfakit = {
      ...panel,
      starterKit: true,
      localization: { code: 'ar', tag: 'ar', direction: 'rtl', locales: [] },
    }
    setPageProps({ alfakit, page } as unknown as Partial<AlfakitPageProps>)

    render(StarterKitHarness, { props: { breadcrumbs: [] } })

    // The host's sidebar and its own pages are not right to left: <html> stays the host's.
    expect(document.documentElement).toHaveAttribute('dir', 'ltr')
    expect(document.documentElement).toHaveAttribute('lang', 'en')
    const root = document.querySelector('[data-slot="starter-kit-root"]')
    expect(root).toHaveAttribute('dir', 'rtl')
    expect(root).toHaveAttribute('lang', 'ar')
    expect(root?.querySelector('[data-slot="content"]')).not.toBeNull()
  })

  it("puts toasts in the host document's top-right corner in a right-to-left language, not over the kit's sidebar (W-D-03)", async () => {
    document.documentElement.dir = 'ltr'
    const alfakit = {
      ...panel,
      starterKit: true,
      localization: { code: 'ar', tag: 'ar', direction: 'rtl', locales: [] },
    }
    setPageProps({ alfakit, page } as unknown as Partial<AlfakitPageProps>)

    render(StarterKitHarness, { props: { breadcrumbs: [] } })

    showToast({ id: 'kit-rtl', title: 'تم الحفظ', status: 'success' } as never)
    await new Promise((resolve) => setTimeout(resolve, 50))

    const toast = Array.from(document.querySelectorAll('[data-sonner-toast]')).find((item) =>
      item.textContent?.includes('تم الحفظ'),
    )
    const toaster = toast?.closest('[data-sonner-toaster]')
    expect(toaster?.getAttribute('data-x-position')).toBe('right')
    expect(toaster?.getAttribute('dir')).toBe('rtl')
  })

  it('gives portaled modals and slide-overs the reading direction (they render outside its root)', () => {
    setPageProps({
      alfakit: { ...panel, localization: { code: 'ar', tag: 'ar', direction: 'rtl', locales: [] } },
    } as unknown as Partial<AlfakitPageProps>)

    render(DirectionDialogHarness)

    expect(document.querySelector('[data-slot="dialog-content"]')).toHaveAttribute('dir', 'rtl')
    expect(document.querySelector('[data-slot="sheet-content"]')).toHaveAttribute('dir', 'rtl')
  })

  it('reads the shared navigation for the host sidebar', () => {
    setPageProps({
      alfakitNavigation: [
        {
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
          userMenu: [{ label: 'Billing', icon: 'credit-card', url: '/admin/billing' }],
        },
      ],
    } as Partial<AlfakitPageProps>)

    const navigation = useAlfakitNavigation()

    expect(navigation.navigation?.id).toBe('admin')
    expect(navigation.groups[0]!.items[0]).toMatchObject({
      title: 'Posts',
      href: '/admin/posts',
      isActive: true,
    })
    expect(navigation.userMenuItems).toMatchObject([
      { title: 'Billing', href: '/admin/billing', icon: 'credit-card' },
    ])
    expect(useAlfakitNavigation('other').groups).toEqual([])
  })
})
