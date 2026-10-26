import type { PageSchema } from '@alfakit/core'
import { defineComponent, h, ref } from 'vue'
import { PageBlock, PageForm, PageInfolist } from '../src/app/components'
import { usePageForm, usePageMethod, useShortcut } from '../src/app/composables'
import FullscreenLayout from '../src/layouts/FullscreenLayout.vue'
import { flush, mountWithAlfakit, panel, setPageProps } from './mocks'

const page: PageSchema = {
  class: 'App\\Pages\\Pos',
  layout: 'fullscreen',
  title: 'Point of sale',
  token: 'page-token',
  fullscreen: { header: true, exitUrl: '/admin' },
  content: [
    {
      type: 'Form',
      key: 'form:customer',
      component: 'form:customer',
      components: [
        {
          type: 'TextInput',
          key: 'email',
          name: 'email',
          statePath: 'email',
          label: 'E-mail',
          inputType: 'email',
        },
      ],
      state: { email: 'ada@example.com' },
      actions: [],
    },
    {
      type: 'Infolist',
      key: 'infolist:summary',
      components: [{ type: 'TextEntry', key: 'total', name: 'total', label: 'Total', state: '42' }],
      columns: { default: 1, lg: 1 },
    },
  ] as PageSchema['content'],
}

function respond(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await flush()
}

describe('app page components', () => {
  beforeEach(() => {
    setPageProps({
      alfakit: { ...panel, endpoints: { ...panel.endpoints, pageCall: '/call' } },
      page,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('renders named forms and infolists, and a fallback for missing blocks', () => {
    const wrapper = mountWithAlfakit(() => [
      h(PageForm, { name: 'customer' }),
      h(PageInfolist, { name: 'summary' }),
      h(PageBlock, { name: 'table:products' }, { fallback: () => h('p', 'No products table') }),
    ])

    expect((wrapper.find('input[type="email"]').element as HTMLInputElement).value).toBe(
      'ada@example.com',
    )
    expect(wrapper.text()).toContain('42')
    expect(wrapper.text()).toContain('No products table')
    expect(wrapper.find('[data-block="form:customer"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it("follows the infolist's columns() (W-S1-16)", () => {
    const wrapper = mountWithAlfakit(() => [h(PageInfolist, { name: 'summary' })])
    const grid = wrapper.find('[data-slot="infolist"] > *')

    expect(grid.classes()).toContain('lg:grid-cols-1')
    expect(grid.classes()).not.toContain('lg:grid-cols-2')
    wrapper.unmount()
  })

  it('calls a page method with the named form state, loading state and validation errors', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        respond(422, {
          result: null,
          notifications: [],
          errors: { sku: ['Unknown SKU'], 'forms.customer.email': ['Taken'] },
        }),
      )
      .mockResolvedValueOnce(respond(200, { result: { total: 3 }, notifications: [] }))
    vi.stubGlobal('fetch', fetchMock)

    const Checkout = defineComponent({
      setup() {
        const checkout = usePageMethod<{ total: number }, { sku: string }>('checkout', {
          forms: ['customer'],
        })
        const form = usePageForm('customer')

        return () =>
          h('div', [
            h(PageForm, { name: 'customer' }),
            h(
              'button',
              { id: 'charge', onClick: () => void checkout.call({ sku: 'A-1' }) },
              'Charge',
            ),
            h('p', { id: 'loading' }, String(checkout.loading.value)),
            h('p', { id: 'error' }, checkout.errors.value.sku ?? ''),
            h('p', { id: 'result' }, String(checkout.result.value?.total ?? '')),
            h('p', { id: 'email' }, String(form.values.value.email ?? '')),
          ])
      },
    })

    const wrapper = mountWithAlfakit(() => h(Checkout))
    await settle()
    expect(wrapper.find('#email').text()).toBe('ada@example.com')

    await wrapper.find('#charge').trigger('click')
    expect(wrapper.find('#loading').text()).toBe('true')
    await settle()

    expect(wrapper.find('#error').text()).toBe('Unknown SKU')
    expect(wrapper.text()).toContain('Taken')
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body as string)).toEqual({
      token: 'page-token',
      method: 'checkout',
      arguments: { sku: 'A-1' },
      forms: { customer: { email: 'ada@example.com' } },
    })

    await wrapper.find('#charge').trigger('click')
    await settle()
    expect(wrapper.find('#result').text()).toBe('3')
    expect(wrapper.find('#error').text()).toBe('')
    expect(wrapper.find('#loading').text()).toBe('false')
    wrapper.unmount()
  })

  it('rolls an optimistic update back when the call fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(422, { errors: { status: ['No'] } })))

    const Board = defineComponent({
      setup() {
        const status = ref('pending')
        const move = usePageMethod('moveOrder', {
          optimistic: () => {
            const before = status.value
            status.value = 'shipped'

            return () => {
              status.value = before
            }
          },
        })

        return () =>
          h(
            'button',
            { id: 'card', onClick: () => void move.call({ status: 'shipped' }) },
            status.value,
          )
      },
    })

    const wrapper = mountWithAlfakit(() => h(Board))
    await wrapper.find('#card').trigger('click')
    expect(wrapper.find('#card').text()).toBe('shipped')
    await settle()
    expect(wrapper.find('#card').text()).toBe('pending')
    wrapper.unmount()
  })

  it('runs shortcuts while mounted', () => {
    const handler = vi.fn()
    const Shortcut = defineComponent({
      setup() {
        useShortcut('f2', handler)

        return () => null
      },
    })

    const wrapper = mountWithAlfakit(() => h(Shortcut))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2' }))
    wrapper.unmount()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2' }))

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('renders the fullscreen layout with the page title and an exit link, without a sidebar', () => {
    const wrapper = mountWithAlfakit(() =>
      h(FullscreenLayout, { page }, { default: () => h('p', 'Register') }),
    )

    expect(wrapper.find('[data-layout="fullscreen"]').exists()).toBe(true)
    expect(wrapper.find('[data-sidebar="sidebar"]').exists()).toBe(false)
    expect(wrapper.find('h1').text()).toBe('Point of sale')
    expect(wrapper.find('[data-slot="fullscreen-exit"]').attributes('href')).toBe('/admin')
    expect(wrapper.text()).toContain('Register')
    wrapper.unmount()

    const bare = mountWithAlfakit(() =>
      h(
        FullscreenLayout,
        { page: { ...page, fullscreen: { header: false } } },
        { default: () => h('p', 'Kiosk') },
      ),
    )
    expect(bare.find('[data-slot="topbar"]').exists()).toBe(false)
    bare.unmount()
  })
})
