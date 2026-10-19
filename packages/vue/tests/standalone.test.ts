import type { StandaloneComponentSchema } from '@alfakit/core'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { Toaster as AppToaster } from 'vue-sonner'
import contactForm from '../../core/tests/fixtures/standalone/contact-form.json'
import postsTable from '../../core/tests/fixtures/standalone/posts-table.json'
import { showToast } from '../src/components/notifications/flash-toasts'
import { AlfakitComponent, AlfakitToaster, configureAlfakit } from '../src/standalone'
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
