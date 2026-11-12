import type { SchemaComponent, SectionSchema } from '@alfakit/core'
import { h, nextTick, shallowRef } from 'vue'
import SectionComponent from '../src/components/layout/SectionComponent.vue'
import { flush, mountWithAlfakit } from './mocks'

function section(overrides: Partial<SectionSchema> = {}): SectionSchema {
  return {
    type: 'Section',
    key: 'details',
    heading: 'Details',
    schema: [{ type: 'Text', key: 'body', content: 'Section body' } as SchemaComponent],
    ...overrides,
  } as SectionSchema
}

describe('Section', () => {
  it('wraps long unbroken headings and descriptions (model class names) inside the card', () => {
    const wrapper = mountWithAlfakit(() =>
      h(SectionComponent, {
        component: section({
          description: 'App\\Models\\AVeryLongModelClassNameThatHasNoSpacesAtAll',
        }),
      }),
    )

    const description = wrapper
      .findAll('p')
      .find((p) => p.text().includes('AVeryLongModelClassName'))
    expect(description?.classes()).toContain('break-words')
    expect(wrapper.find('h3, h2, h4').classes()).toContain('break-words')
  })

  it.each([false, true])('toggles a collapsible section (aside: %s)', async (aside) => {
    const wrapper = mountWithAlfakit(() =>
      h(SectionComponent, { component: section({ aside, collapsible: true, collapsed: true }) }),
    )

    expect(wrapper.find('section').attributes('data-slot')).toBe('section')
    const toggle = wrapper.find('button[aria-label="Toggle section"]')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.text()).not.toContain('Section body')

    await toggle.trigger('click')
    await flush()

    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.text()).toContain('Section body')
    expect(wrapper.find('[data-surface="section"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('renders a non-collapsible aside section open without a toggle', () => {
    const wrapper = mountWithAlfakit(() =>
      h(SectionComponent, { component: section({ aside: true }) }),
    )

    expect(wrapper.text()).toContain('Section body')
    expect(wrapper.find('button[aria-label="Toggle section"]').exists()).toBe(false)
    wrapper.unmount()
  })
  it('follows collapsed() when the server changes it (a live field)', async () => {
    const current = shallowRef(section({ collapsible: true, collapsed: true }))
    const wrapper = mountWithAlfakit(() => h(SectionComponent, { component: current.value }))
    const toggle = wrapper.find('button[aria-label="Toggle section"]')
    expect(toggle.attributes('aria-expanded')).toBe('false')

    current.value = section({ collapsible: true, collapsed: false })
    await nextTick()
    await flush()
    expect(toggle.attributes('aria-expanded')).toBe('true')
  })
})
