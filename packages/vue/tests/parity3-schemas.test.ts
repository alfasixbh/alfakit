import type {
  CalloutSchema,
  EmptyStateComponentSchema,
  FieldsetSchema,
  SchemaComponent,
  SectionSchema,
  TabsSchema,
  TextEntrySchema,
  TextSchema,
} from '@alfakit/core'
import { FormStore } from '@alfakit/core'
import { defineComponent, h } from 'vue'
import TextEntryComponent from '../src/components/entries/TextEntryComponent.vue'
import { provideForm } from '../src/components/form/form-context'
import CalloutComponent from '../src/components/layout/CalloutComponent.vue'
import EmptyStateComponent from '../src/components/layout/EmptyStateComponent.vue'
import FieldsetComponent from '../src/components/layout/FieldsetComponent.vue'
import SectionComponent from '../src/components/layout/SectionComponent.vue'
import TabsComponent from '../src/components/layout/TabsComponent.vue'
import TextComponent from '../src/components/layout/TextComponent.vue'
import { useStore } from '../src/composables/use-store'
import { flush, mountWithAlfakit, panel, setPageProps } from './mocks'

const text = (key: string, content: string) =>
  ({ type: 'Text', key, content }) as unknown as SchemaComponent

const requests: { url: string; body: Record<string, unknown> }[] = []

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await flush()
}

beforeEach(() => {
  requests.length = 0
  setPageProps({ alfakit: { ...panel, endpoints: { ...panel.endpoints, schemaDeferred: '/d' } } })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>
      requests.push({ url, body })
      const payload =
        body.only === 'badge'
          ? { badge: { badge: 5, badgeColor: 'danger' } }
          : {
              component: {
                type: 'Section',
                key: String(body.component).split('::')[1],
                heading: 'Details',
                schema: [text('loaded', 'Loaded body')],
              },
            }

      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  setPageProps({ alfakit: panel })
})

describe('deferred schemas', () => {
  it('shows a skeleton, then loads the children of an infolist section', async () => {
    const wrapper = mountWithAlfakit(() =>
      h(SectionComponent, {
        component: {
          type: 'Section',
          key: 'summary',
          heading: 'Details',
          deferred: true,
          schema: [],
        } as SectionSchema,
      }),
    )

    expect(wrapper.find('[data-slot="deferred-schema"]').attributes('aria-busy')).toBe('true')
    await settle()
    expect(wrapper.text()).toContain('Loaded body')
    expect(requests[0]).toMatchObject({ url: '/d', body: { component: 'infolist::summary' } })
    wrapper.unmount()
  })

  it('merges a loaded component into the form with the form state', async () => {
    const form = new FormStore(
      {
        components: [
          {
            type: 'Section',
            key: 'details',
            deferred: true,
            deferredPaths: ['slug'],
            schema: [],
          } as SectionSchema,
        ],
        state: { slug: 'a' },
      },
      { token: 'tok', component: 'form' },
    )
    const Form = defineComponent({
      setup() {
        provideForm(form)
        const state = useStore(form.store)

        return () => h(SectionComponent, { component: state.value.components[0] as SectionSchema })
      },
    })

    const wrapper = mountWithAlfakit(() => h(Form))
    await settle()

    expect(form.state.components[0]!.schema![0]!.key).toBe('loaded')
    expect(requests[0]!.body).toMatchObject({
      token: 'tok',
      component: 'form::details',
      state: { slug: 'a' },
    })
    expect(wrapper.text()).toContain('Loaded body')
    wrapper.unmount()
  })

  it('loads deferred tab badges', async () => {
    const tabs = {
      type: 'Tabs',
      key: 'tabs',
      activeTab: 1,
      schema: [
        { type: 'Tab', key: 'meta', label: 'Meta', badgeDeferred: true, schema: [text('a', 'A')] },
      ],
    } as unknown as TabsSchema

    const wrapper = mountWithAlfakit(() => h(TabsComponent, { component: tabs }))
    await settle()

    expect(wrapper.text()).toContain('5')
    expect(requests[0]!.body).toMatchObject({ component: 'infolist::meta', only: 'badge' })
    wrapper.unmount()
  })
})

describe('schema layout parity (round 3)', () => {
  it('renders an uncontained fieldset', () => {
    const wrapper = mountWithAlfakit(() =>
      h(FieldsetComponent, {
        component: {
          type: 'Fieldset',
          key: 'f',
          label: 'Address',
          contained: false,
          schema: [text('x', 'X')],
        } as FieldsetSchema,
      }),
    )

    const fieldset = wrapper.find('fieldset')
    expect(fieldset.attributes('data-contained')).toBe('false')
    expect(fieldset.classes()).not.toContain('border')
    wrapper.unmount()
  })

  it('renders footer components in sections, callouts and empty states', () => {
    const wrapper = mountWithAlfakit(() => [
      h(SectionComponent, {
        component: {
          type: 'Section',
          key: 's',
          heading: 'S',
          schema: [],
          footer: [{ component: text('sf', 'Section footer') }],
        } as unknown as SectionSchema,
      }),
      h(CalloutComponent, {
        component: {
          type: 'Callout',
          key: 'c',
          heading: 'C',
          footer: [{ component: text('cf', 'Callout footer') }],
        } as unknown as CalloutSchema,
      }),
      h(EmptyStateComponent, {
        component: {
          type: 'EmptyState',
          key: 'e',
          contained: true,
          footer: [{ component: text('ef', 'Empty footer') }],
        } as unknown as EmptyStateComponentSchema,
      }),
    ])

    expect(wrapper.find('[data-slot="section-footer"]').text()).toContain('Section footer')
    expect(wrapper.text()).toContain('Callout footer')
    expect(wrapper.text()).toContain('Empty footer')
    wrapper.unmount()
  })

  it('keeps the status colour and alert role of a callout without colour', async () => {
    const wrapper = mountWithAlfakit(() => [
      h(CalloutComponent, {
        component: {
          type: 'Callout',
          key: 'c',
          heading: 'Careful',
          icon: 'circle-x',
          status: 'danger',
        } as CalloutSchema,
      }),
      h(CalloutComponent, {
        component: {
          type: 'Callout',
          key: 'd',
          heading: 'Tip',
          icon: 'info',
          color: 'info',
          iconColor: 'success',
        } as CalloutSchema,
      }),
    ])
    await settle()
    // Icons render once the lazily loaded icon map arrives.
    await vi.waitFor(
      () => expect(wrapper.findAll('[data-slot="callout-icon"] > *')).toHaveLength(2),
      { timeout: 5000 },
    )

    const callouts = wrapper.findAll('[data-slot="callout"]')
    expect(callouts[0]!.attributes('role')).toBe('alert')
    expect(callouts[1]!.attributes('role')).toBe('note')
    expect(callouts[0]!.find('[data-slot="callout-icon"] > *').attributes('class')).toContain(
      'text-destructive',
    )
    expect(callouts[1]!.find('[data-slot="callout-icon"] > *').attributes('class')).toContain(
      'text-success',
    )
    wrapper.unmount()
  })

  it('renders Text with neutral colour, font family and a copy button', async () => {
    const writeText = vi.fn(async () => {})
    Object.assign(navigator, { clipboard: { writeText } })

    const wrapper = mountWithAlfakit(() =>
      h(TextComponent, {
        component: {
          type: 'Text',
          key: 't',
          content: 'ABC-1',
          color: 'neutral',
          fontFamily: 'mono',
          copyable: true,
          copyMessage: 'Copied!',
        } as TextSchema,
      }),
    )

    const paragraph = wrapper.find('p')
    expect(paragraph.classes()).toContain('font-mono')
    expect(paragraph.classes()).toContain('text-foreground')

    await wrapper.find('button[aria-label="Copy"]').trigger('click')
    await settle()
    expect(writeText).toHaveBeenCalledWith('ABC-1')
    expect(wrapper.text()).toContain('Copied!')
    wrapper.unmount()
  })

  it('wraps Text with a tooltip trigger', () => {
    const wrapper = mountWithAlfakit(() =>
      h(TextComponent, {
        component: { type: 'Text', key: 't', content: 'Hover', tooltip: 'Order' } as TextSchema,
      }),
    )

    expect(wrapper.text()).toContain('Hover')
    wrapper.unmount()
  })

  it('puts extraAttributes on the entry value and aligns it', () => {
    const wrapper = mountWithAlfakit(() =>
      h(TextEntryComponent, {
        component: {
          type: 'TextEntry',
          key: 'title',
          name: 'title',
          label: 'Title',
          state: 'Hello',
          alignment: 'end',
          extraAttributes: { class: 'value-class', 'data-value': '1' },
          extraEntryWrapperAttributes: { 'data-wrapper': '1' },
        } as TextEntrySchema,
      }),
    )

    const entry = wrapper.find('[data-slot="entry"]')
    const value = wrapper.find('[data-slot="entry-value"]')
    expect(entry.attributes('data-wrapper')).toBe('1')
    expect(entry.attributes('data-value')).toBeUndefined()
    expect(value.attributes('data-value')).toBe('1')
    expect(value.classes()).toContain('value-class')
    expect(value.classes()).toContain('text-end')
    wrapper.unmount()
  })
})
