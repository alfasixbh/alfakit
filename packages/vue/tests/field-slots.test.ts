import { FormStore, type SchemaComponent } from '@alfakit/core'
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, shallowRef } from 'vue'
import EntryWrapper from '../src/components/entries/EntryWrapper.vue'
import { provideForm } from '../src/components/form/form-context'
import SchemaRenderer from '../src/components/schema/SchemaRenderer.vue'
import { mountWithAlfakit, registry } from './mocks'

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  Element.prototype.scrollIntoView ??= () => undefined
  // Icons render synchronously as `<i data-icon>` so their classes can be checked.
  registry.register(
    'panel:icon',
    defineComponent({
      props: { name: String },
      setup: (props) => () => h('i', { 'data-icon': props.name }),
    }),
  )
})

const text = (name: string, extra: Record<string, unknown> = {}) =>
  ({
    type: 'TextInput',
    key: name,
    name,
    statePath: name,
    label: name,
    inputType: 'text',
    ...extra,
  }) as SchemaComponent

const textItem = (key: string, content: string) => ({
  component: { type: 'Text', key, content } as SchemaComponent,
})

function renderForm(components: SchemaComponent[], state: Record<string, unknown>) {
  const store = new FormStore(
    { components, state, fingerprints: { '': 'root' } },
    { token: 't', component: 'form', refreshUrl: '/r' },
  )
  const Form = defineComponent({
    setup() {
      provideForm(store)
      const current = shallowRef(store.state.components)
      store.subscribe((next) => (current.value = next.components))

      return () => h(SchemaRenderer, { components: current.value })
    },
  })

  return { store, wrapper: mountWithAlfakit(() => h(Form)) }
}

afterEach(() => vi.unstubAllGlobals())

describe('field content slots', () => {
  it('renders every slot in its place around the label and control', () => {
    const names = [
      'aboveLabel',
      'beforeLabel',
      'afterLabel',
      'belowLabel',
      'aboveContent',
      'beforeContent',
      'afterContent',
      'belowContent',
    ]
    const slots = Object.fromEntries(
      names.map((name) => [
        name,
        {
          items: [textItem(`name::${name}`, name)],
          alignment: name === 'afterLabel' ? 'end' : 'start',
        },
      ]),
    )
    const { wrapper } = renderForm([text('name', { slots })], { name: '' })

    expect(
      wrapper.findAll('[data-content-slot]').map((node) => node.attributes('data-content-slot')),
    ).toEqual(names)
    expect(
      wrapper.find('[data-slot="field-content"]').element.children[1]?.querySelector('input'),
    ).not.toBeNull()
    expect(wrapper.find('[data-content-slot="afterLabel"]').classes()).toContain('justify-end')
    wrapper.unmount()
  })

  it('shows the error message slots only with an error, as html when allowed', async () => {
    const slots = {
      aboveErrorMessage: { items: [textItem('e1', 'Check it')], alignment: 'start' },
      belowErrorMessage: { items: [textItem('e2', 'Ask support')], alignment: 'start' },
    }
    const { store, wrapper } = renderForm(
      [text('name', { slots, allowHtmlValidationMessages: true })],
      { name: '' },
    )

    expect(wrapper.text()).not.toContain('Check it')

    store.setErrors({ name: 'Use <strong>letters</strong>.' })
    await flushPromises()

    expect(wrapper.text()).toContain('Check it')
    expect(wrapper.text()).toContain('Ask support')
    expect(wrapper.find('[role="alert"] strong').text()).toBe('letters')
    wrapper.unmount()
  })

  it('runs slot actions as field actions', async () => {
    const bodies: Array<Record<string, unknown>> = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>)

        return new Response(
          JSON.stringify({ status: 'success', form: { components: [], state: { slug: 'done' } } }),
          { status: 200 },
        )
      }),
    )

    const { store, wrapper } = renderForm(
      [
        text('slug', {
          slots: {
            belowContent: {
              items: [
                {
                  action: { type: 'Action', name: 'generate', label: 'Generate', hasAction: true },
                },
              ],
              alignment: 'start',
            },
          },
        }),
      ],
      { slug: '' },
    )

    await wrapper.find('[data-content-slot="belowContent"] button').trigger('click')
    await flushPromises()

    expect(bodies[0]).toMatchObject({ component: 'field:form::slug', action: 'generate' })
    expect(store.getValue('slug')).toBe('done')
    wrapper.unmount()
  })

  it('merges wrapper attributes', () => {
    const { wrapper } = renderForm(
      [
        text('name', {
          extraAttributes: { class: 'outer', 'data-a': '1' },
          extraFieldWrapperAttributes: { class: 'wrapper', 'data-b': '2' },
        }),
      ],
      { name: '' },
    )
    const field = wrapper.find('[data-slot="field"]')

    expect(field.classes()).toEqual(expect.arrayContaining(['outer', 'wrapper', 'flex']))
    expect(field.attributes('data-a')).toBe('1')
    expect(field.attributes('data-b')).toBe('2')
    wrapper.unmount()
  })

  it('renders entry slots and wrapper attributes', () => {
    const wrapper = mountWithAlfakit(() =>
      h(
        EntryWrapper,
        {
          entry: {
            type: 'TextEntry',
            key: 'title',
            name: 'title',
            label: 'Title',
            extraEntryWrapperAttributes: { class: 'entry-extra' },
            slots: {
              beforeLabel: { items: [textItem('b', 'Before')], alignment: 'start' },
              belowContent: { items: [textItem('c', 'Below')], alignment: 'start' },
            },
          },
        },
        () => 'Hello',
      ),
    )

    expect(wrapper.find('[data-slot="entry"]').classes()).toContain('entry-extra')
    expect(wrapper.text()).toContain('Before')
    expect(wrapper.text()).toContain('Below')
    wrapper.unmount()
  })
})

describe('fused group', () => {
  it('fuses its fields and lists their errors below', async () => {
    const { store, wrapper } = renderForm(
      [
        {
          type: 'FusedGroup',
          key: 'fused',
          label: 'Phone',
          columns: { default: 1, lg: 2 },
          schema: [
            text('code', { placeholder: 'Code', helperText: 'Hidden helper' }),
            text('number', { placeholder: 'Number' }),
          ],
        } as SchemaComponent,
      ],
      { code: '', number: '' },
    )
    const controls = wrapper.find('[data-slot="fused-group-controls"]')

    expect(controls.classes()).toContain('lg:grid-cols-2')
    expect(controls.findAll('input')).toHaveLength(2)
    expect(wrapper.find('label.sr-only').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Hidden helper')

    store.setErrors({ number: 'Invalid number.' })
    await flushPromises()

    expect(controls.attributes('data-invalid')).toBe('')
    expect(wrapper.findAll('p').filter((p) => p.text() === 'Invalid number.')).toHaveLength(2)
    wrapper.unmount()
  })
})

describe('field options', () => {
  it('shows the no options message and html labels in a select', async () => {
    const { wrapper } = renderForm(
      [
        {
          type: 'Select',
          key: 's',
          name: 's',
          statePath: 's',
          label: 'Status',
          selectablePlaceholder: true,
          multiple: true,
          allowHtml: true,
          options: [{ value: 'a', label: '<b>Bold</b>' }],
        } as SchemaComponent,
      ],
      { s: ['a'] },
    )

    expect(wrapper.find('[role="combobox"] b').text()).toBe('Bold')
    wrapper.unmount()
  })

  it('colours affix icons', () => {
    const { wrapper } = renderForm(
      [text('a', { prefixIcon: 'at-sign', prefixIconColor: 'danger' })],
      { a: '' },
    )

    expect(wrapper.find('[data-slot="input-group"] [data-icon]').classes()).toContain(
      'text-destructive',
    )
    wrapper.unmount()
  })

  it('customises checkbox list bulk toggles and flows by column', () => {
    const { wrapper } = renderForm(
      [
        {
          type: 'CheckboxList',
          key: 'c',
          name: 'c',
          statePath: 'c',
          label: 'Tags',
          options: [{ value: 'a', label: '<em>A</em>' }],
          bulkToggleable: true,
          allowHtml: true,
          gridColumns: 2,
          gridDirection: 'column',
          selectAllAction: { label: 'Pick all' },
          deselectAllAction: { hidden: true },
        } as SchemaComponent,
      ],
      { c: [] },
    )

    expect(wrapper.find('[data-slot="select-all"]').text()).toBe('Pick all')
    expect(wrapper.find('[data-slot="deselect-all"]').exists()).toBe(false)
    expect(wrapper.find('em').text()).toBe('A')
    expect(wrapper.find('[data-grid-direction="column"]').classes()).toContain('md:columns-2')
    wrapper.unmount()
  })

  it('lays toggle buttons out in a grid', () => {
    const { wrapper } = renderForm(
      [
        {
          type: 'ToggleButtons',
          key: 't',
          name: 't',
          statePath: 't',
          label: 'Size',
          options: [
            { value: 's', label: 'S' },
            { value: 'm', label: 'M' },
          ],
          gridColumns: 3,
        } as SchemaComponent,
      ],
      { t: null },
    )
    const group = wrapper.find('[data-slot="toggle-buttons"]')

    expect(group.classes()).toContain('md:grid-cols-3')
    expect(group.attributes('data-grid-direction')).toBe('row')
    wrapper.unmount()
  })

  it('steps the native time input and shows coloured affixes', () => {
    const { wrapper } = renderForm(
      [
        {
          type: 'DateTimePicker',
          key: 'd',
          name: 'd',
          statePath: 'd',
          label: 'Starts',
          format: 'Y-m-d H:i:s',
          hasDate: true,
          hasTime: true,
          native: true,
          timezone: 'UTC',
          firstDayOfWeek: 0,
          closeOnDateSelection: true,
          minutesStep: 15,
          suffixIcon: 'clock',
          suffixIconColor: 'primary',
        } as SchemaComponent,
      ],
      { d: null },
    )

    expect(wrapper.find('input').attributes('step')).toBe('900')
    expect(wrapper.find('[data-slot="input-group"] [data-icon]').classes()).toContain(
      'text-primary',
    )
    wrapper.unmount()
  })
})
