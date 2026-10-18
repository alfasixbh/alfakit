import type { AlfakitPageProps, PageSchema } from '@alfakit/core'
import { render, screen } from '@testing-library/svelte'
import {
  AlfakitStarterKitRoot,
  createStarterKitLayout,
  useAlfakitNavigation,
} from '../src/starter-kit'
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
    expect(useAlfakitNavigation('other').groups).toEqual([])
  })
})
