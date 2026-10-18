import { FormStore } from '@alfakit/core'
import { fireEvent, render, screen, within } from '@testing-library/svelte'
import { cmsPayloadFixture } from '../../core/tests/fixtures/cms-payload'
import { CmsPage } from '../src/components/cms'
import CmsContactForm from './CmsContactForm.svelte'
import CmsLivePreviewHarness from './CmsLivePreviewHarness.svelte'
import CmsPricingBlock from './CmsPricingBlock.svelte'

describe('CMS page', () => {
  it('renders the header, breadcrumbs, blocks and footer of a page', () => {
    render(CmsPage, {
      props: {
        cms: cmsPayloadFixture(),
        components: { pricing: CmsPricingBlock, 'cms:form': CmsContactForm },
      },
    })

    expect(document.querySelector('[data-slot="cms-page"]')).toHaveAttribute('dir', 'ltr')
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute(
      'href',
      '#cms-content',
    )
    expect(screen.getByRole('heading', { level: 1, name: 'We build things' })).toBeInTheDocument()
    expect(screen.getByText('world').tagName).toBe('STRONG')
    expect(screen.getByRole('navigation', { name: 'Breadcrumbs' })).toHaveTextContent('Company')
    expect(screen.getByTestId('pricing')).toHaveTextContent('Plan: Pro')
    expect(screen.getByText('Right column')).toBeInTheDocument()
    expect(screen.getByRole('form', { name: 'Contact' })).toHaveAttribute(
      'action',
      '/forms/contact',
    )
    expect(document.querySelector('[data-cms-block="unknown"]')).toBeNull()
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy')
  })

  it('renders embeds in a titled iframe and new-tab links safely', () => {
    render(CmsPage, { props: { cms: cmsPayloadFixture() } })

    const iframe = screen.getByTitle('Intro video')
    expect(iframe.tagName).toBe('IFRAME')
    expect(iframe).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')

    const docs = document.querySelector('[data-slot="cms-link-button"][target="_blank"]')!
    expect(docs).toHaveAttribute('rel', 'noopener noreferrer')
    expect(docs).toHaveTextContent('(opens in a new tab)')
  })

  it('opens submenus and the mobile menu with accessible toggles', async () => {
    render(CmsPage, { props: { cms: cmsPayloadFixture() } })

    const toggle = screen.getByRole('button', { name: 'Show the Company submenu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const submenu = document.getElementById(toggle.getAttribute('aria-controls')!)!
    expect(submenu).not.toHaveAttribute('hidden')
    expect(within(submenu).getByRole('link', { name: 'About us' })).toHaveAttribute(
      'aria-current',
      'page',
    )

    await fireEvent.keyDown(toggle, { key: 'Escape' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('shows the preview banner and explains a missing form renderer in previews only', () => {
    const { unmount } = render(CmsPage, { props: { cms: cmsPayloadFixture({ preview: true }) } })
    expect(document.querySelector('[data-slot="cms-preview-banner"]')).toHaveTextContent('Preview')
    expect(screen.getByText("This form isn't available.")).toBeInTheDocument()
    unmount()

    render(CmsPage, { props: { cms: cmsPayloadFixture() } })
    expect(screen.queryByText("This form isn't available.")).toBeNull()
  })

  it('follows the site direction for right-to-left languages', () => {
    const payload = cmsPayloadFixture()
    render(CmsPage, {
      props: { cms: { ...payload, site: { ...payload.site, direction: 'rtl', tag: 'ar' } } },
    })

    expect(document.querySelector('[data-slot="cms-page"]')).toHaveAttribute('dir', 'rtl')
    expect(document.documentElement).toHaveAttribute('dir', 'rtl')
    document.documentElement.dir = 'ltr'
  })
})

describe('CMS live preview and admin bar', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    globalThis.__alfakitPageProps = {}
  })

  it('renders reusable sections and the admin bar for editors', async () => {
    const payload = cmsPayloadFixture()
    render(CmsPage, {
      props: {
        cms: {
          ...payload,
          page: {
            ...payload.page,
            blocks: [
              {
                type: 'section',
                id: 'block-1',
                data: {
                  name: 'Newsletter',
                  blocks: [
                    {
                      type: 'rich-text',
                      id: 'd1-block-1',
                      data: { html: '<p>Join us</p>', width: 'prose' },
                    },
                  ],
                },
              },
            ],
          },
          admin: {
            editUrl: '/admin/pages/1/edit',
            draftUrl: '/preview/1',
            dashboardUrl: '/admin',
            hasChanges: true,
          },
        },
      },
    })

    expect(screen.getByText('Join us')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="cms-section"]')).toHaveAttribute(
      'data-section',
      'Newsletter',
    )

    const bar = await screen.findByRole('complementary', { name: 'Site editing' })
    expect(within(bar).getByRole('link', { name: 'Edit this page' })).toHaveAttribute(
      'href',
      '/admin/pages/1/edit',
    )
    await fireEvent.click(within(bar).getByRole('button', { name: 'Hide editing bar' }))
    expect(within(bar).queryByRole('link', { name: 'Edit this page' })).toBeNull()
  })

  it('autosaves form changes and opens a resizable preview pane', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    // A wide screen: the pane fits beside the form (it would open as an overlay otherwise).
    vi.stubGlobal('innerWidth', 1920)
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: true, media: query }))
    localStorage.setItem('alfakit:cms-live-preview', 'closed')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          result: {
            savedAt: '2026-10-14T10:00:00+00:00',
            hasChanges: true,
            previewUrl: '/preview/1?v=2',
          },
          notifications: [],
          errors: null,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    globalThis.__alfakitPageProps = {
      page: { token: 'tok' },
      alfakit: { endpoints: { pageCall: '/admin/_alfakit/pages/call' } },
    }
    const store = new FormStore(
      { components: [], state: { title: 'Hi' } },
      { token: 'tok', component: 'form' },
    )

    render(CmsLivePreviewHarness, {
      props: {
        store,
        component: {
          type: 'CmsLivePreview',
          key: 'p',
          previewUrl: '/preview/1?v=1',
          autosaveMethod: 'cmsAutosave',
          debounce: 300,
        },
      },
    })

    store.setValue('title', 'Hello')
    await vi.waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes'))
    await vi.advanceTimersByTimeAsync(300)
    await vi.waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Draft saved automatically'),
    )
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]!.body))).toMatchObject({
      method: 'cmsAutosave',
      arguments: { state: { title: 'Hello' } },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Live preview' }))
    const pane = screen.getByRole('region', { name: 'Live preview' })
    expect(within(pane).getByTitle('Page preview')).toHaveAttribute('src', '/preview/1?v=2')

    await fireEvent.click(within(pane).getByRole('button', { name: 'Phone' }))
    expect(within(pane).getByTitle('Page preview').style.width).toBe('390px')

    await fireEvent.click(within(pane).getByRole('button', { name: 'Full screen' }))
    expect(pane).toHaveAttribute('data-full-screen', 'true')

    await fireEvent.keyDown(window, { key: 'Escape' })
    await fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('region', { name: 'Live preview' })).toBeNull()

    // Too narrow for the form beside the pane: a full-screen overlay without the toggle.
    vi.stubGlobal('innerWidth', 1100)
    await fireEvent.click(screen.getByRole('button', { name: 'Live preview' }))
    const overlay = screen.getByRole('region', { name: 'Live preview' })
    expect(overlay).toHaveAttribute('data-full-screen', 'true')
    expect(within(overlay).queryByRole('button', { name: 'Full screen' })).toBeNull()
    await fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('region', { name: 'Live preview' })).toBeNull()

    vi.unstubAllGlobals()
    localStorage.removeItem('alfakit:cms-live-preview')
    vi.useRealTimers()
  })
})
