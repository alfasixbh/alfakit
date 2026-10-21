/* eslint-disable vue/one-component-per-file -- small test renderers */
import { FormStore } from '@alfakit/core'
import { flushPromises, mount } from '@vue/test-utils'
import { createSSRApp, defineComponent, h, nextTick, provide, type PropType } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { cmsPayloadFixture } from '../../core/tests/fixtures/cms-payload'
import { CmsBlocks, CmsPage } from '../src/components/cms'
import LivePreview from '../src/components/cms/LivePreview.vue'
import { FORM_STORE_KEY } from '../src/components/form/form-context'
import { mountWithAlfakit } from './mocks'

const PricingBlock = defineComponent({
  props: { data: { type: Object as PropType<{ plan: string }>, required: true } },
  setup: (props) => () => h('p', { 'data-testid': 'pricing' }, `Plan: ${props.data.plan}`),
})

const ContactForm = defineComponent({
  props: { form: { type: Object as PropType<{ action: string }>, required: true } },
  setup: (props) => () => h('form', { 'aria-label': 'Contact', action: props.form.action }),
})

describe('CMS page', () => {
  it('renders the header, breadcrumbs, blocks and footer of a page', () => {
    const wrapper = mount(CmsPage, {
      props: {
        cms: cmsPayloadFixture(),
        components: { pricing: PricingBlock, 'cms:form': ContactForm },
      },
      attachTo: document.body,
    })

    expect(wrapper.find('[data-slot="cms-page"]').attributes('dir')).toBe('ltr')
    expect(wrapper.find('a[href="#cms-content"]').text()).toBe('Skip to content')
    expect(wrapper.find('h1').text()).toBe('We build things')
    expect(wrapper.find('strong').text()).toBe('world')
    expect(wrapper.find('nav[aria-label="Breadcrumbs"]').text()).toContain('Company')
    expect(wrapper.find('[data-testid="pricing"]').text()).toBe('Plan: Pro')
    expect(wrapper.text()).toContain('Right column')
    expect(wrapper.find('form[aria-label="Contact"]').attributes('action')).toBe('/forms/contact')
    expect(wrapper.find('[data-cms-block="unknown"]').exists()).toBe(false)
    expect(wrapper.find('a[href="/privacy"]').text()).toBe('Privacy')
    wrapper.unmount()
  })

  it('renders embeds in a titled iframe and new-tab links safely', () => {
    const wrapper = mount(CmsPage, { props: { cms: cmsPayloadFixture() } })

    const iframe = wrapper.find('iframe')
    expect(iframe.attributes('title')).toBe('Intro video')
    expect(iframe.attributes('src')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')

    const docs = wrapper.find('[data-slot="cms-link-button"][target="_blank"]')
    expect(docs.attributes('rel')).toBe('noopener noreferrer')
    expect(docs.text()).toContain('(opens in a new tab)')
  })

  it('opens submenus and the mobile menu with accessible toggles', async () => {
    const wrapper = mount(CmsPage, { props: { cms: cmsPayloadFixture() }, attachTo: document.body })

    const toggle = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Show the Company submenu')!
    expect(toggle.attributes('aria-expanded')).toBe('false')
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    const submenu = wrapper.find(`#${toggle.attributes('aria-controls')}`)
    expect(submenu.attributes('hidden')).toBeUndefined()
    expect(submenu.find('a[aria-current="page"]').text()).toBe('About us')

    await toggle.trigger('keydown', { key: 'Escape' })
    expect(toggle.attributes('aria-expanded')).toBe('false')

    const burger = wrapper.findAll('button').find((button) => button.text() === 'Open menu')!
    await burger.trigger('click')
    expect(burger.attributes('aria-expanded')).toBe('true')
    expect(burger.text()).toBe('Close menu')
    wrapper.unmount()
  })

  it('shows the preview banner and explains a missing form renderer in previews only', () => {
    const preview = mount(CmsPage, { props: { cms: cmsPayloadFixture({ preview: true }) } })
    expect(preview.find('[data-slot="cms-preview-banner"]').text()).toContain('Preview')
    expect(preview.text()).toContain("This form isn't available.")

    const live = mount(CmsPage, { props: { cms: cmsPayloadFixture() } })
    expect(live.text()).not.toContain("This form isn't available.")
  })

  it('follows the site direction for right-to-left languages', () => {
    const payload = cmsPayloadFixture()
    const wrapper = mount(CmsPage, {
      props: { cms: { ...payload, site: { ...payload.site, direction: 'rtl', tag: 'ar' } } },
    })

    expect(wrapper.find('[data-slot="cms-page"]').attributes('dir')).toBe('rtl')
    expect(document.documentElement.dir).toBe('rtl')
    document.documentElement.dir = 'ltr'
  })

  it('server-renders blocks without a registry', async () => {
    const app = createSSRApp({
      render: () => h(CmsBlocks, { blocks: cmsPayloadFixture().page.blocks }),
    })
    const html = await renderToString(app)

    expect(html).toContain('We build things')
    expect(html).toContain('<details')
    expect(html).not.toContain('unknown')
  })
})

describe('CMS live preview and admin bar', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    globalThis.__alfakitPageProps = {}
  })

  it('renders reusable sections and the admin bar for editors', async () => {
    const payload = cmsPayloadFixture()
    const wrapper = mount(CmsPage, {
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

    expect(wrapper.find('[data-slot="cms-section"]').attributes('data-section')).toBe('Newsletter')
    expect(wrapper.text()).toContain('Join us')

    await vi.waitFor(async () => {
      await flushPromises()
      expect(wrapper.find('[data-slot="cms-admin-bar"]').exists()).toBe(true)
    })
    expect(wrapper.find('a[href="/admin/pages/1/edit"]').text()).toContain('Edit this page')
    expect(wrapper.find('a[href="/preview/1"]').text()).toContain('View draft')
  })

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
    const ProvideForm = defineComponent({
      setup(_, { slots }) {
        provide(FORM_STORE_KEY, store)

        return () => slots.default?.()
      },
    })
    const buttons = () => [...document.querySelectorAll('button')].map((b) => b.textContent?.trim())

    const wrapper = mountWithAlfakit(() =>
      h(ProvideForm, null, () =>
        h(LivePreview, {
          component: {
            type: 'CmsLivePreview',
            key: 'p',
            previewUrl: null,
            autosaveMethod: 'cmsAutosave',
            debounce: 10,
            hasChanges: false,
            actions: [save],
            changedActions: [save, { type: 'Action', name: 'publish', label: 'Publish changes' }],
          },
        }),
      ),
    )

    expect(buttons()).not.toContain('Publish changes')

    store.setValue('title', 'Hello')
    await vi.waitFor(() => expect(buttons()).toContain('Publish changes'))
    expect(buttons()).toContain('Save draft')
    wrapper.unmount()
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

    const wrapper = mount(LivePreview, {
      props: {
        component: {
          type: 'CmsLivePreview',
          key: 'p',
          previewUrl: '/preview/1?v=1',
          autosaveMethod: 'cmsAutosave',
          debounce: 300,
        },
      },
      global: { provide: { [FORM_STORE_KEY as symbol]: store } },
      attachTo: document.body,
    })

    store.setValue('title', 'Hello')
    await nextTick()
    expect(wrapper.find('[role="status"]').text()).toBe('Unsaved changes')

    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()
    await vi.waitFor(() =>
      expect(wrapper.find('[role="status"]').text()).toBe('Draft saved automatically'),
    )
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]!.body))).toMatchObject({
      method: 'cmsAutosave',
      arguments: { state: { title: 'Hello' } },
    })

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Live preview'))!
      .trigger('click')
    expect(wrapper.find('iframe').attributes('src')).toBe('/preview/1?v=2')

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Phone')!
      .trigger('click')
    expect(wrapper.find('iframe').attributes('style')).toContain('width: 390px')

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Full screen')!
      .trigger('click')
    expect(wrapper.find('[data-slot="cms-live-preview-pane"]').attributes('data-full-screen')).toBe(
      'true',
    )

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(wrapper.find('[data-slot="cms-live-preview-pane"]').exists()).toBe(false)

    // Too narrow for the form beside the pane: a full-screen overlay without the toggle.
    vi.stubGlobal('innerWidth', 1100)
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Live preview'))!
      .trigger('click')
    await nextTick()
    const overlay = wrapper.find('[data-slot="cms-live-preview-pane"]')
    expect(overlay.attributes('data-full-screen')).toBe('true')
    expect(overlay.findAll('button').some((button) => button.text() === 'Full screen')).toBe(false)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(wrapper.find('[data-slot="cms-live-preview-pane"]').exists()).toBe(false)

    wrapper.unmount()
    vi.unstubAllGlobals()
    localStorage.removeItem('alfakit:cms-live-preview')
    vi.useRealTimers()
  })
})
