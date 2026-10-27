import type { AlfakitPageProps, PageSchema } from '@alfakit/core'
import { render, screen } from '@testing-library/svelte'
import { tick } from 'svelte'
import { showToast } from '../src/components/notifications/toast'
import {
  AlfakitStarterKitRoot,
  createStarterKitLayout,
  useAlfakitNavigation,
} from '../src/starter-kit'
import DirectionDialogHarness from './DirectionDialogHarness.svelte'
import { panel, setPageProps } from './mocks'
import StarterKitDirectionHarness from './StarterKitDirectionHarness.svelte'
import StarterKitHarness from './StarterKitHarness.svelte'
import StarterKitHostLayout from './StarterKitHostLayout.svelte'

const page = {
  title: 'Posts',
  token: 'token',
  content: [],
  breadcrumbs: [{ label: 'Posts', url: '/admin/posts' }, { label: 'List' }],
} as unknown as PageSchema

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

  it('flips the whole document in a right-to-left panel language, and back after a switch', async () => {
    document.documentElement.dir = 'ltr'
    document.documentElement.lang = 'en'
    const alfakit = {
      ...panel,
      starterKit: true,
      localization: { code: 'ar', tag: 'ar', direction: 'rtl', locales: [] },
    }
    setPageProps({
      alfakit,
      alfakitDocument: { tag: 'ar', direction: 'rtl' },
      page,
    } as unknown as Partial<AlfakitPageProps>)

    render(StarterKitHarness, { props: { breadcrumbs: [] } })
    await tick()

    // The kit's sidebar and header mirror too: <html> follows the shared `alfakitDocument`.
    expect(document.documentElement).toHaveAttribute('dir', 'rtl')
    expect(document.documentElement).toHaveAttribute('lang', 'ar')
    expect(document.querySelector('[data-slot="starter-kit-root"]')).toHaveAttribute('dir', 'rtl')

    // Switching back to English redirects back: a visit with the new props.
    document.dispatchEvent(
      new CustomEvent('inertia:navigate', {
        detail: { page: { props: { alfakitDocument: { tag: 'en', direction: 'ltr' } } } },
      }),
    )

    expect(document.documentElement).toHaveAttribute('dir', 'ltr')
    expect(document.documentElement).toHaveAttribute('lang', 'en')
  })

  it("keeps the kit's own pages in the app's language, right to left, and docks the sidebar on the right", async () => {
    document.documentElement.dir = 'ltr'
    document.documentElement.lang = 'en'
    setPageProps({
      alfakit: undefined,
      alfakitDocument: { tag: 'en', direction: 'rtl' },
    } as unknown as Partial<AlfakitPageProps>)

    render(StarterKitDirectionHarness)
    await tick()

    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-side', 'right')
    expect(document.documentElement).toHaveAttribute('dir', 'rtl')
    expect(document.documentElement).toHaveAttribute('lang', 'en')
  })

  it('leaves the document alone without the shared prop', () => {
    document.documentElement.dir = 'ltr'
    document.documentElement.lang = 'en'
    const alfakit = {
      ...panel,
      starterKit: true,
      localization: { code: 'ar', tag: 'ar', direction: 'rtl', locales: [] },
    }
    setPageProps({
      alfakit,
      alfakitDocument: undefined,
      page,
    } as unknown as Partial<AlfakitPageProps>)

    render(StarterKitHarness, { props: { breadcrumbs: [] } })

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
