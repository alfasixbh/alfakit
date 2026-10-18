import { FormStore, type SchemaComponent } from '@alfakit/core'
import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, shallowRef } from 'vue'
import FormattedText from '../src/components/entries/FormattedText.vue'
import { provideForm } from '../src/components/form/form-context'
import SchemaRenderer from '../src/components/schema/SchemaRenderer.vue'
import { mountWithAlfakit } from './mocks'

const actionsComponent = (extra: Record<string, unknown> = {}) =>
  ({
    type: 'Actions',
    key: 'actions-0',
    actions: [
      { type: 'Action', name: 'star', label: 'Star', hasAction: true },
      { type: 'Action', name: 'reset', label: 'Reset', hasAction: true },
    ],
    ...extra,
  }) as SchemaComponent

afterEach(() => vi.unstubAllGlobals())

describe('Actions schema component', () => {
  it('renders a row of buttons with alignment and full width', () => {
    const wrapper = mountWithAlfakit(() =>
      h(SchemaRenderer, {
        components: [
          actionsComponent({ alignment: 'center', fullWidth: true, verticalAlignment: 'end' }),
        ],
      }),
    )

    const root = wrapper.find('[data-slot="schema-actions"]')
    const list = root.find('[data-slot="actions"]')

    expect(root.classes()).toContain('justify-end')
    expect(list.classes()).toContain('justify-center')
    expect(list.classes()).toContain('[&>*]:flex-1')
    expect(list.findAll('button').map((button) => button.text())).toEqual(['Star', 'Reset'])
    wrapper.unmount()
  })

  it('runs its actions in the field context with the form state', async () => {
    const bodies: Array<Record<string, unknown>> = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>)

        return new Response(
          JSON.stringify({
            status: 'success',
            form: { components: [actionsComponent()], state: { rating: 5 } },
          }),
          { status: 200 },
        )
      }),
    )

    const store = new FormStore(
      { components: [actionsComponent()], state: { rating: 1 } },
      { token: 't', component: 'form' },
    )
    const Form = defineComponent({
      setup() {
        provideForm(store)
        const current = shallowRef(store.state.components)
        store.subscribe((state) => (current.value = state.components))

        return () => h(SchemaRenderer, { components: current.value })
      },
    })
    const wrapper = mountWithAlfakit(() => h(Form))

    await wrapper.find('[data-slot="schema-actions"] button').trigger('click')
    await flushPromises()

    expect(bodies[0]).toMatchObject({
      component: 'field:form::actions-0',
      action: 'star',
      state: { rating: 1 },
    })
    expect(store.getValue('rating')).toBe(5)
    wrapper.unmount()
  })
})

describe('CodeEntry', () => {
  it('highlights the code and copies it', async () => {
    const writeText = vi.fn(async () => undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    const wrapper = mountWithAlfakit(() =>
      h(SchemaRenderer, {
        components: [
          {
            type: 'CodeEntry',
            key: 'payload',
            name: 'payload',
            label: 'Payload',
            state: '{\n  "a": 1\n}',
            grammar: 'json',
            lightTheme: 'github-light',
            darkTheme: 'dracula',
            copyable: true,
            copyMessage: 'Code copied',
          } as SchemaComponent,
        ],
      }),
    )

    const pre = wrapper.find('[data-slot="code-entry"]')

    expect(pre.attributes('dir')).toBe('ltr')
    expect(pre.attributes('data-light-theme')).toBe('github-light')
    expect(pre.attributes('data-dark-theme')).toBe('dracula')
    expect(pre.text()).toContain('"a": 1')
    expect(pre.findAll('span').length).toBeGreaterThan(0)

    await wrapper.find('[data-slot="code-entry-copy"]').trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith('{\n  "a": 1\n}')
    expect(wrapper.find('[role="status"]').text()).toBe('Code copied')
    wrapper.unmount()
  })

  it('shows the placeholder without state', () => {
    const wrapper = mountWithAlfakit(() =>
      h(SchemaRenderer, {
        components: [
          {
            type: 'CodeEntry',
            key: 'payload',
            name: 'payload',
            label: 'Payload',
            placeholder: 'No payload',
          } as SchemaComponent,
        ],
      }),
    )

    expect(wrapper.text()).toContain('No payload')
    wrapper.unmount()
  })
})

describe('entry item links and image alt text', () => {
  it('links each item of a relationship list to its own url', () => {
    const wrapper = mountWithAlfakit(() =>
      h(FormattedText, {
        value: ['Laravel', 'PHP'],
        schema: { badge: true, itemUrls: ['/tags/1', '/tags/2'] } as never,
      }),
    )

    const links = wrapper.findAll('a')

    expect(links.map((link) => link.attributes('href'))).toEqual(['/tags/1', '/tags/2'])
    expect(links[0]!.text()).toContain('Laravel')
    wrapper.unmount()
  })

  it('gives images their alt text', () => {
    const wrapper = mountWithAlfakit(() =>
      h(SchemaRenderer, {
        components: [
          {
            type: 'ImageEntry',
            key: 'photos',
            name: 'photos',
            label: 'Photos',
            state: ['/a.jpg', '/b.jpg'],
            alts: ['Front', 'Back'],
          } as SchemaComponent,
          {
            type: 'ImageEntry',
            key: 'avatar',
            name: 'avatar',
            label: 'Avatar',
            state: ['/c.jpg'],
            alt: 'Avatar of Jane',
          } as SchemaComponent,
        ],
      }),
    )

    expect(wrapper.findAll('img').map((img) => img.attributes('alt'))).toEqual([
      'Front',
      'Back',
      'Avatar of Jane',
    ])
    wrapper.unmount()
  })
})
