import type {
  ActionSchema,
  CalloutSchema,
  GridSchema,
  SchemaComponent,
  SectionSchema,
  TabsSchema,
} from '@alfakit/core'
import { FormStore } from '@alfakit/core'
import { defineComponent, h } from 'vue'
import { provideForm } from '../src/components/form/form-context'
import CalloutComponent from '../src/components/layout/CalloutComponent.vue'
import { useSchemaComponentContext } from '../src/components/layout/component-context'
import GridComponent from '../src/components/layout/GridComponent.vue'
import SchemaChildren from '../src/components/layout/SchemaChildren.vue'
import SectionComponent from '../src/components/layout/SectionComponent.vue'
import TabsComponent from '../src/components/layout/TabsComponent.vue'
import { flush, mountWithAlfakit } from './mocks'

const text = (key: string, content: string) =>
  ({ type: 'Text', key, content }) as unknown as SchemaComponent

const action = (name: string, label: string) =>
  ({ type: 'Action', name, label, hasAction: true }) as ActionSchema

function section(overrides: Partial<SectionSchema> = {}): SectionSchema {
  return {
    type: 'Section',
    key: 'details',
    heading: 'Details',
    schema: [text('body', 'Section body')],
    ...overrides,
  } as SectionSchema
}

function tabs(overrides: Partial<TabsSchema> = {}): TabsSchema {
  return {
    type: 'Tabs',
    key: 'tabs',
    activeTab: 1,
    schema: [
      { type: 'Tab', key: 'one', label: 'One', schema: [text('a', 'First')] },
      { type: 'Tab', key: 'two', label: 'Two', schema: [text('b', 'Second')] },
    ],
    ...overrides,
  } as TabsSchema
}

describe('schema layout parity', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  it('renders the section heading at its level, h3 without one', () => {
    const leveled = mountWithAlfakit(() =>
      h(SectionComponent, { component: section({ headingLevel: 4 }) }),
    )
    expect(leveled.find('h4').text()).toBe('Details')
    leveled.unmount()

    const fallback = mountWithAlfakit(() => h(SectionComponent, { component: section() }))
    expect(fallback.find('h3').text()).toBe('Details')
    fallback.unmount()
  })

  it('restores and stores the collapsed state of a section', async () => {
    window.localStorage.setItem('alfakit.section.details', 'collapsed')

    const wrapper = mountWithAlfakit(() =>
      h(SectionComponent, {
        component: section({ collapsible: true, persistCollapsed: 'alfakit.section.details' }),
      }),
    )
    await flush()

    const toggle = wrapper.find('button[aria-label="Toggle section"]')
    expect(toggle.attributes('aria-expanded')).toBe('false')

    await toggle.trigger('click')
    await flush()

    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(window.localStorage.getItem('alfakit.section.details')).toBe('expanded')
    wrapper.unmount()
  })

  it('renders actions and components after the section header', () => {
    const wrapper = mountWithAlfakit(() =>
      h(SectionComponent, {
        component: section({
          afterHeader: [{ component: text('badge', 'Beta') }, { action: action('edit', 'Edit') }],
        }),
      }),
    )

    const slot = wrapper.find('[data-slot="section-after-header"]')
    expect(slot.text()).toContain('Beta')
    expect(slot.text()).toContain('Edit')
    wrapper.unmount()
  })

  it('applies dense and gap(false) to the child grid', () => {
    const grid = (overrides: Partial<GridSchema>) =>
      ({ type: 'Grid', key: 'g', schema: [text('a', 'A')], ...overrides }) as GridSchema

    const dense = mountWithAlfakit(() => h(GridComponent, { component: grid({ dense: true }) }))
    expect(dense.find('[data-slot="schema"]').classes()).toContain('gap-3')
    dense.unmount()

    const none = mountWithAlfakit(() =>
      h(GridComponent, { component: grid({ dense: true, gap: false }) }),
    )
    expect(none.find('[data-slot="schema"]').classes()).toContain('gap-0')
    expect(none.find('[data-slot="schema"]').classes()).not.toContain('gap-6')
    none.unmount()
  })

  it('wraps the tab list when tabs are not scrollable', () => {
    const wrapper = mountWithAlfakit(() =>
      h(TabsComponent, { component: tabs({ scrollable: false }) }),
    )

    const list = wrapper.find('[role="tablist"]')
    expect(list.classes()).toContain('flex-wrap')
    expect(list.classes()).not.toContain('overflow-x-auto')
    wrapper.unmount()
  })

  it.each(['local', 'session'] as const)(
    'persists the active tab in %s storage',
    async (storage) => {
      const store = storage === 'local' ? window.localStorage : window.sessionStorage
      store.setItem('alfakit.tabs.orders', 'two')

      const wrapper = mountWithAlfakit(() =>
        h(TabsComponent, {
          component: tabs({ persistTab: { key: 'alfakit.tabs.orders', storage } }),
        }),
      )
      await flush()

      const [one, two] = wrapper.findAll('[role="tab"]')
      expect(two!.attributes('aria-selected')).toBe('true')

      await one!.trigger('mousedown', { button: 0 })
      await flush()

      expect(store.getItem('alfakit.tabs.orders')).toBe('one')
      wrapper.unmount()
    },
  )

  it('renders callout icon size, footer alignment and controls', async () => {
    const callout = {
      type: 'Callout',
      key: 'tip',
      heading: 'Tip',
      icon: 'download',
      iconSize: 'lg',
      actions: [action('upgrade', 'Upgrade')],
      footerActionsAlignment: 'end',
      controls: [{ action: action('dismiss', 'Dismiss') }],
    } as unknown as CalloutSchema

    const wrapper = mountWithAlfakit(() => h(CalloutComponent, { component: callout }))

    await vi.waitFor(() =>
      expect(wrapper.find('[data-slot="callout-icon"]').html()).toContain('size-6'),
    )
    const footer = wrapper
      .findAll('[data-slot="actions"]')
      .find((list) => list.text() === 'Upgrade')
    expect(footer?.classes()).toContain('justify-end')
    expect(wrapper.find('[data-slot="callout-controls"]').text()).toContain('Dismiss')
    wrapper.unmount()
  })

  it('renders a custom component child schema with SchemaChildren', () => {
    const wrapper = mountWithAlfakit(() =>
      h(SchemaChildren, {
        component: { schema: [text('inner', 'Inner text')], columns: { default: 2 }, dense: true },
      }),
    )

    expect(wrapper.text()).toContain('Inner text')
    expect(wrapper.find('[data-slot="schema"]').classes()).toEqual(
      expect.arrayContaining(['grid-cols-2', 'gap-3']),
    )
    wrapper.unmount()
  })

  it('gives custom components their schema context', () => {
    const Probe = defineComponent({
      setup() {
        const context = useSchemaComponentContext({
          statePath: 'address.city',
          context: { operation: 'edit', recordKey: 7, record: { name: 'Ann' } },
        })

        return () =>
          h(
            'span',
            `${context.value.operation}|${context.value.recordKey}|${String(context.value.record?.name)}|${String(context.value.get('street'))}|${String(context.value.get('title', true))}`,
          )
      },
    })

    const store = new FormStore(
      { components: [], state: { title: 'Hi', address: { city: 'Oslo', street: 'Main' } } },
      { token: 't', component: 'form' },
    )
    const Form = defineComponent({
      setup() {
        provideForm(store)

        return () => h(Probe)
      },
    })

    const wrapper = mountWithAlfakit(() => h(Form))
    expect(wrapper.text()).toBe('edit|7|Ann|Main|Hi')
    wrapper.unmount()
  })

  it('has no form state outside a form', () => {
    const Probe = defineComponent({
      setup() {
        const context = useSchemaComponentContext({})

        return () =>
          h('span', `${String(context.value.state)}|${String(context.value.get('title'))}`)
      },
    })

    const wrapper = mountWithAlfakit(() => h(Probe))
    expect(wrapper.text()).toBe('null|undefined')
    wrapper.unmount()
  })
})
