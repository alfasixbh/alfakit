import { FormStore, cmsHeadTags } from '@alfakit/core'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { cmsPayloadFixture } from '../../core/tests/fixtures/cms-payload'
import { CmsBlocks, CmsPage, CmsProvider } from '../src/components/cms'
import { CmsLivePreview } from '../src/components/cms/live-preview'
import { FormProvider } from '../src/components/form/form-context'
import { Wrapper } from './mocks'

function PricingBlock({ data }: { data: { plan: string } }) {
  return <p data-testid="pricing">Plan: {data.plan}</p>
}

function ContactForm({ form }: { form: { action: string } }) {
  return <form aria-label="Contact" action={form.action} />
}

describe('CMS page', () => {
  it('renders the header, breadcrumbs, blocks and footer of a page', () => {
    render(
      <CmsPage
        cms={cmsPayloadFixture()}
        components={{ pricing: PricingBlock, 'cms:form': ContactForm }}
      />,
    )

    const page = document.querySelector('[data-slot="cms-page"]')!
    expect(page).toHaveAttribute('dir', 'ltr')
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
    render(<CmsPage cms={cmsPayloadFixture()} />)

    const iframe = screen.getByTitle('Intro video')
    expect(iframe.tagName).toBe('IFRAME')
    expect(iframe).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')

    const docs = screen.getAllByRole('link', { name: /Docs/ })[0]!
    expect(docs).toHaveAttribute('target', '_blank')
    expect(docs).toHaveAttribute('rel', 'noopener noreferrer')
    expect(docs).toHaveTextContent('(opens in a new tab)')
  })

  it('opens submenus and the mobile menu with accessible toggles', () => {
    render(<CmsPage cms={cmsPayloadFixture()} />)

    const toggle = screen.getByRole('button', { name: 'Show the Company submenu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const submenu = document.getElementById(toggle.getAttribute('aria-controls')!)!
    expect(submenu).not.toHaveAttribute('hidden')
    expect(within(submenu).getByRole('link', { name: 'About us' })).toHaveAttribute(
      'aria-current',
      'page',
    )

    fireEvent.keyDown(toggle, { key: 'Escape' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    const burger = screen.getByRole('button', { name: 'Open menu' })
    fireEvent.click(burger)
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('shows the preview banner and explains a missing form renderer in previews only', () => {
    const { unmount } = render(<CmsPage cms={cmsPayloadFixture({ preview: true })} />)

    expect(screen.getAllByRole('status')[0]).toHaveTextContent('Preview')
    expect(screen.getByText("This form isn't available.")).toBeInTheDocument()
    unmount()

    render(<CmsPage cms={cmsPayloadFixture()} />)
    expect(screen.queryByText("This form isn't available.")).toBeNull()
  })

  it('follows the site direction for right-to-left languages', () => {
    const payload = cmsPayloadFixture()
    render(<CmsPage cms={{ ...payload, site: { ...payload.site, direction: 'rtl', tag: 'ar' } }} />)

    expect(document.querySelector('[data-slot="cms-page"]')).toHaveAttribute('dir', 'rtl')
    expect(document.documentElement).toHaveAttribute('dir', 'rtl')
    document.documentElement.dir = 'ltr'
  })

  it('applies the site design and block style hooks', () => {
    const payload = cmsPayloadFixture()
    const [first, ...rest] = payload.page.blocks
    const { container } = render(
      <CmsPage
        cms={{
          ...payload,
          page: {
            ...payload.page,
            blocks: [{ ...first!, style: { background: 'primary', anchor: 'pricing' } }, ...rest],
          },
          site: {
            ...payload.site,
            design: {
              css: 'html{--primary:#ff0000}',
              fonts: null,
              logo: { url: '/logo.png', alt: 'Acme' },
              favicon: null,
            },
          },
        }}
      />,
    )

    const block = container.querySelector('[data-cms-block="hero"]')!
    expect(block).toHaveAttribute('id', 'pricing')
    expect(block).toHaveAttribute('data-cms-background', 'primary')
    expect(container.querySelector('style[data-slot="cms-design"]')!.textContent).toBe(
      'html{--primary:#ff0000}',
    )
    expect(container.querySelector('img[data-slot="cms-logo"]')).toHaveAttribute('src', '/logo.png')
  })

  it('renders blocks on their own with registry-free fallbacks and server-renders', () => {
    const blocks = cmsPayloadFixture().page.blocks

    const html = renderToString(
      <CmsProvider payload={null}>
        <CmsBlocks blocks={blocks} />
      </CmsProvider>,
    )

    expect(html).toContain('We build things')
    expect(html).toContain('<details')
    expect(html).not.toContain('unknown')
  })

  it('builds escaped head tags from the SEO payload', () => {
    const tags = cmsHeadTags(cmsPayloadFixture().page.seo)

    expect(tags.title).toBe('About us | Acme')
    expect(tags.meta).toContainEqual({ property: 'og:site_name', content: 'Acme' })
    expect(tags.links).toContainEqual({
      rel: 'canonical',
      href: 'https://example.com/company/about',
    })
    expect(tags.jsonLd).not.toContain('<')
    expect(
      cmsHeadTags({ ...cmsPayloadFixture().page.seo, jsonLd: '</script><script>' }).jsonLd,
    ).toBeNull()
  })

  it('renders reusable sections and the admin bar for editors', async () => {
    const payload = cmsPayloadFixture()
    render(
      <CmsPage
        cms={{
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
        }}
      />,
    )

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
    expect(within(bar).getByRole('link', { name: 'View draft' })).toHaveAttribute(
      'href',
      '/preview/1',
    )

    fireEvent.click(within(bar).getByRole('button', { name: 'Hide editing bar' }))
    expect(within(bar).queryByRole('link', { name: 'Edit this page' })).toBeNull()
  })
})

describe('CMS live preview', () => {
  afterEach(() => vi.restoreAllMocks())

  it('switches to "Publish changes" once an autosave makes the draft differ', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          result: { savedAt: '2026-10-14T10:00:00+00:00', hasChanges: true, previewUrl: null },
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
    const save = { type: 'Action', name: 'save', label: 'Save draft' } as const

    render(
      <Wrapper>
        <FormProvider store={store}>
          <CmsLivePreview
            component={{
              type: 'CmsLivePreview',
              key: 'p',
              previewUrl: null,
              autosaveMethod: 'cmsAutosave',
              debounce: 10,
              hasChanges: false,
              actions: [save],
              changedActions: [save, { type: 'Action', name: 'publish', label: 'Publish changes' }],
            }}
          />
        </FormProvider>
      </Wrapper>,
    )

    expect(screen.queryByRole('button', { name: 'Publish changes' })).toBeNull()

    act(() => store.setValue('title', 'Hello'))

    expect(await screen.findByRole('button', { name: 'Publish changes' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeInTheDocument()
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
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
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

    render(
      <FormProvider store={store}>
        <CmsLivePreview
          component={{
            type: 'CmsLivePreview',
            key: 'p',
            previewUrl: '/preview/1?v=1',
            autosaveMethod: 'cmsAutosave',
            debounce: 300,
          }}
        />
      </FormProvider>,
    )

    act(() => store.setValue('title', 'Hello'))
    expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Draft saved automatically'),
    )
    const body = JSON.parse(String(fetchMock.mock.calls[0]![1]!.body))
    expect(body).toMatchObject({
      token: 'tok',
      method: 'cmsAutosave',
      arguments: { state: { title: 'Hello' } },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Live preview' }))
    const pane = screen.getByRole('region', { name: 'Live preview' })
    expect(within(pane).getByTitle('Page preview')).toHaveAttribute('src', '/preview/1?v=2')

    fireEvent.click(within(pane).getByRole('button', { name: 'Phone' }))
    expect(within(pane).getByTitle('Page preview')).toHaveStyle({ width: '390px' })

    fireEvent.click(within(pane).getByRole('button', { name: 'Full screen' }))
    expect(pane).toHaveAttribute('data-full-screen', 'true')

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(pane).not.toHaveAttribute('data-full-screen')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('region', { name: 'Live preview' })).toBeNull()

    // Too narrow for the form beside the pane: a full-screen overlay without the toggle.
    vi.stubGlobal('innerWidth', 1100)
    fireEvent.click(screen.getByRole('button', { name: 'Live preview' }))
    const overlay = screen.getByRole('region', { name: 'Live preview' })
    expect(overlay).toHaveAttribute('data-full-screen', 'true')
    expect(within(overlay).queryByRole('button', { name: 'Full screen' })).toBeNull()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('region', { name: 'Live preview' })).toBeNull()

    globalThis.__alfakitPageProps = {}
    vi.unstubAllGlobals()
    localStorage.removeItem('alfakit:cms-live-preview')
    vi.useRealTimers()
  })
})
