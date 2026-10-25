import type { StandaloneComponentSchema } from '@alfakit/core'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { Toaster as AppToaster } from 'vue-sonner'
import contactForm from '../../core/tests/fixtures/standalone/contact-form.json'
import postsTable from '../../core/tests/fixtures/standalone/posts-table.json'
import dashboard from '../../core/tests/fixtures/standalone/starter-kit-dashboard.json'
import { showToast } from '../src/components/notifications/flash-toasts'
import { ALFAKIT_KEY } from '../src/context'
import { AlfakitComponent, AlfakitToaster, configureAlfakit } from '../src/standalone'
import { createStandaloneContext } from '../src/standalone/runtime'
import { flush } from './mocks'

const form = contactForm as unknown as StandaloneComponentSchema
const table = postsTable as unknown as StandaloneComponentSchema

const CustomInput = defineComponent({
  setup: () => () => h('div', { 'data-testid': 'custom-input' }),
})
const GlobalTextarea = defineComponent({
  setup: () => () => h('div', { 'data-testid': 'global-textarea' }),
})

beforeEach(() => {
  // A host application page: no `alfakit` panel prop, the payloads are plain props.
  globalThis.__alfakitPageProps = { form, posts: table, errors: {} }
  // vue-sonner's <Toaster> reads the colour scheme; jsdom has no matchMedia.
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
})

describe('Several standalone forms on one page', () => {
  it('gives two forms with the same fields their own field ids', async () => {
    const Host = defineComponent({
      setup: () => () =>
        h('div', [
          h(AlfakitComponent, { component: form }),
          h(AlfakitComponent, { component: form }),
        ]),
    })

    const wrapper = mount(Host)
    await flush()

    const roots = wrapper.findAll('[data-slot="standalone"]')
    expect(roots.length).toBe(2)

    const ids = wrapper.findAll('input[id], textarea[id]').map((input) => input.attributes('id'))
    expect(ids.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
    wrapper.unmount()
  })
})

describe('AlfakitComponent inside a panel page', () => {
  it("keeps its own action endpoints, without moving the panel's", async () => {
    const panel = createStandaloneContext(
      {
        action: 'http://localhost/admin/_alfakit/actions',
        modal: 'http://localhost/admin/_alfakit/actions/modal',
      },
      undefined,
      () => () => {},
    )
    const Host = defineComponent({
      provide: { [ALFAKIT_KEY as symbol]: panel },
      setup: () => () => h(AlfakitComponent, { component: form }),
    })

    mount(Host, { attachTo: document.body })
    await flush()

    const endpoints = (panel.actions as unknown as { options: { endpoints: { action: string } } })
      .options.endpoints
    expect(endpoints.action).toBe('http://localhost/admin/_alfakit/actions')
  })
})

describe('AlfakitComponent (outside panels)', () => {
  it('renders a form from its payload without createAlfakit()', async () => {
    const wrapper = mount(AlfakitComponent, {
      props: { component: form, class: 'max-w-xl' },
      attachTo: document.body,
    })
    await flush()

    expect(wrapper.find('h2').text()).toBe('Contact us')

    const email = wrapper.find('input[type="email"]').element as HTMLInputElement
    expect(email.value).toBe('hi@example.com')
    expect(wrapper.text()).toContain('Message')
    expect(wrapper.find('button[type="submit"], button').text()).toContain('Submit')

    const root = wrapper.find('[data-slot="standalone"]')
    expect(root.classes()).toContain('max-w-xl')
    expect(root.attributes('data-alfakit-component')).toBe(form.class)
    expect(root.attributes('dir')).toBe('ltr')

    wrapper.unmount()
  })

  it('renders a table with its records and search', async () => {
    const wrapper = mount(AlfakitComponent, {
      props: { component: table },
      attachTo: document.body,
    })
    await flush()

    const grid = wrapper.find('table')
    expect(grid.text()).toContain('Title')
    expect(grid.text()).toContain('Alpha')
    expect(grid.text()).toContain('Bravo')
    expect(wrapper.find('input[type="search"]').exists()).toBe(true)

    wrapper.unmount()
  })

  it('applies per-instance registry overrides over configureAlfakit() defaults', async () => {
    configureAlfakit({ components: { Textarea: GlobalTextarea } })

    const wrapper = mount(AlfakitComponent, {
      props: { component: form, components: { TextInput: CustomInput } },
      attachTo: document.body,
    })
    await flush()

    expect(wrapper.find('[data-testid="custom-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="global-textarea"]').exists()).toBe(true)
    expect(wrapper.find('input[type="email"]').exists()).toBe(false)

    configureAlfakit({ components: {} })
    wrapper.unmount()
  })

  it('lets the page render the blocks itself next to a layout toaster', async () => {
    const Page = defineComponent({
      setup: () => () => [
        h(AlfakitToaster, { toaster: false }),
        h(
          AlfakitComponent,
          { component: form },
          {
            default: ({ blocks }: { blocks: unknown[] }) =>
              h('section', { 'data-testid': 'custom-layout' }, `${blocks.length} block`),
          },
        ),
      ],
    })

    const wrapper = mount(Page, { attachTo: document.body })
    await flush()

    expect(wrapper.find('[data-testid="custom-layout"]').text()).toBe('1 block')
    expect(wrapper.find('input[type="email"]').exists()).toBe(false)

    wrapper.unmount()
  })

  it('routes notifications through the layout\'s toaster with :toaster="false"', async () => {
    const Page = defineComponent({
      setup: () => () => [h(AppToaster), h(AlfakitToaster, { toaster: false })],
    })
    const wrapper = mount(Page, { attachTo: document.body })
    await flush()

    showToast({ id: 'n2', title: 'Through yours', status: 'success' } as never)
    await new Promise((resolve) => setTimeout(resolve, 50))
    await flush()

    const toasts = Array.from(document.querySelectorAll('[data-sonner-toast]')).filter((toast) =>
      toast.textContent?.includes('Through yours'),
    )

    expect(toasts).toHaveLength(1)
    // The app's id-less toaster (sonner's default position, bottom).
    expect(toasts[0]?.closest('[data-sonner-toaster]')?.getAttribute('data-y-position')).toBe(
      'bottom',
    )

    wrapper.unmount()
  })

  it("shows a toast once although the app's layout mounts its own toaster", async () => {
    const Page = defineComponent({ setup: () => () => [h(AppToaster), h(AlfakitToaster)] })
    const wrapper = mount(Page, { attachTo: document.body })
    await flush()

    showToast({ id: 'n1', title: 'Saved once', status: 'success' } as never)
    await new Promise((resolve) => setTimeout(resolve, 50))
    await flush()

    const toasts = Array.from(document.querySelectorAll('[data-sonner-toast]')).filter((toast) =>
      toast.textContent?.includes('Saved once'),
    )

    expect(toasts).toHaveLength(1)
    // In Alfakit's own toaster (top), not the app's id-less one (bottom).
    expect(toasts[0]?.closest('[data-sonner-toaster]')?.getAttribute('data-y-position')).toBe('top')

    wrapper.unmount()
  })
})

describe('live() outside panels', () => {
  afterEach(() => {
    delete (window as unknown as { Echo?: unknown }).Echo
    vi.unstubAllGlobals()
  })

  it('shows the fresh lazy widget after a reload (an action on the starter kit dashboard)', async () => {
    const stats = (value: number) => ({
      'widget:blog-stats': {
        type: 'StatsOverviewWidget',
        key: 'blog-stats',
        id: 'blog-stats',
        columnSpan: { default: 'full' },
        stats: [{ label: 'Posts', value }],
      },
    })
    let value = 1
    const fetchMock = vi.fn().mockImplementation(
      async () =>
        new Response(JSON.stringify(stats(value)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const base = dashboard as unknown as StandaloneComponentSchema
    const payload = (token: string) =>
      ({
        ...base,
        token,
        lazy: ['widget:blog-stats'],
        content: [
          {
            ...(base.content[0] as object),
            widgets: [
              {
                type: 'StatsOverviewWidget',
                key: 'blog-stats',
                id: 'blog-stats',
                columnSpan: {},
                lazy: true,
              },
            ],
          },
        ],
      }) as unknown as StandaloneComponentSchema

    const wrapper = mount(AlfakitComponent, {
      props: { component: payload('first') },
      attachTo: document.body,
    })
    await flush()
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(wrapper.text()).toContain('1')

    // The action changed the data; Inertia reloads the page with a new payload (token).
    value = 42
    await wrapper.setProps({ component: payload('second') })
    await new Promise((resolve) => setTimeout(resolve, 20))
    await nextTick()

    expect(fetchMock.mock.calls.map((call) => String(call[0])).at(-1)).toContain('token=second')
    expect(wrapper.text()).toContain('42')
    wrapper.unmount()
    vi.unstubAllGlobals()
  })

  it('refreshes a live table through its own components endpoint when a record changes', async () => {
    const listeners = new Map<string, (payload: unknown) => void>()
    ;(window as unknown as { Echo: unknown }).Echo = {
      private: (name: string) => ({
        listen: (event: string, callback: (payload: unknown) => void) =>
          listeners.set(`private-${name}|${event}`, callback),
        stopListening: () => {},
        notification: () => {},
      }),
      leave: () => {},
      socketId: () => '1.2',
    }
    const fetchMock = vi.fn().mockImplementation(
      async () =>
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const live = {
      ...table,
      content: [
        {
          ...(table.content[0] as object),
          live: { channels: ['alfakit.admin._.App-Models-Post'], debounce: 10 },
        },
      ],
    } as unknown as StandaloneComponentSchema

    const wrapper = mount(AlfakitComponent, { props: { component: live }, attachTo: document.body })
    await flush()

    listeners.get('private-alfakit.admin._.App-Models-Post|.alfakit.record')?.({
      event: 'updated',
      key: 1,
      model: 'App-Models-Post',
    })
    await new Promise((resolve) => setTimeout(resolve, 60))

    const urls = fetchMock.mock.calls.map((call) => String(call[0]))
    expect(
      urls.some(
        (url) => url.startsWith(table.endpoints.components) && url.includes('targets=table'),
      ),
    ).toBe(true)
    wrapper.unmount()
  })
})
