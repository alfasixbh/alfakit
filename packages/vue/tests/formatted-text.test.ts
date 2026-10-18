import { h } from 'vue'
import FormattedText from '../src/components/entries/FormattedText.vue'
import { mountWithAlfakit } from './mocks'

describe('FormattedText', () => {
  it('renders every value of an inline multi-value entry visibly', () => {
    const wrapper = mountWithAlfakit(() =>
      h(FormattedText, { value: ['Red', 'Green'], schema: {} as never }),
    )

    expect(wrapper.find('template').exists()).toBe(false)
    expect(wrapper.text()).toContain('Red')
    expect(wrapper.text()).toContain('Green')
    wrapper.unmount()
  })

  it('renders list items when values are shown with line breaks', () => {
    const wrapper = mountWithAlfakit(() =>
      h(FormattedText, { value: ['Red', 'Green'], schema: { listWithLineBreaks: true } as never }),
    )

    expect(wrapper.findAll('li')).toHaveLength(2)
    wrapper.unmount()
  })
})

describe('per-item enum colours', () => {
  it('colours each badge from itemColors, falling back to the shared colour', () => {
    const wrapper = mountWithAlfakit(() =>
      h(FormattedText, {
        value: ['Draft', 'Published', 'Archived'],
        schema: { badge: true, color: 'gray', itemColors: ['warning', 'success', null] } as never,
      }),
    )

    const badges = wrapper.findAll('[data-slot="badge"]')

    expect(badges).toHaveLength(3)
    expect(badges[0]!.classes().join(' ')).toMatch(/warning/)
    expect(badges[1]!.classes().join(' ')).toMatch(/success/)
    expect(badges[2]!.classes().join(' ')).not.toMatch(/warning|success/)
    wrapper.unmount()
  })
})
