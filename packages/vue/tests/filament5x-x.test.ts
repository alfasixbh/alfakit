import type { WizardSchema } from '@alfakit/core'
import { h, nextTick, ref } from 'vue'
import WizardComponent from '../src/components/layout/WizardComponent.vue'
import ListTabs from '../src/components/table/ListTabs.vue'
import Spinner from '../src/components/ui/Spinner.vue'
import { flush, mountWithAlfakit } from './mocks'

const wizard = (overrides: Partial<WizardSchema> = {}): WizardSchema => ({
  type: 'Wizard',
  key: 'wizard',
  startStep: 2,
  nextActionLabel: 'Next',
  previousActionLabel: 'Back',
  schema: [
    { type: 'Step', key: 'one', label: 'One', schema: [] },
    { type: 'Step', key: 'two', label: 'Two', schema: [] },
  ] as WizardSchema['schema'],
  ...overrides,
})

const hasNext = (html: string) => />\s*Next\s*</.test(html)

describe('Wizard::goToStep()', () => {
  it('moves to the step the server asks for', async () => {
    window.history.replaceState(null, '', '/')
    const schema = ref(wizard())
    const wrapper = mountWithAlfakit(() => h(WizardComponent, { component: schema.value }))

    expect(hasNext(wrapper.html())).toBe(false)

    schema.value = wizard({ goToStep: { step: 'one', id: 'a' } })
    await nextTick()
    await flush()

    expect(hasNext(wrapper.html())).toBe(true)
    wrapper.unmount()
  })
})

describe('list tabs keyboard', () => {
  it('keeps one tab stop, moves focus with arrows and links the panel', async () => {
    const tabs = [
      { key: 'all', label: 'All' },
      { key: 'open', label: 'Open' },
      { key: 'closed', label: 'Closed' },
    ]
    const wrapper = mountWithAlfakit(() =>
      h(ListTabs, { tabs, activeTab: 'open', label: 'Posts', idBase: 'lt' }),
    )
    const buttons = wrapper.findAll('[role="tab"]')

    expect(buttons[1]!.attributes('tabindex')).toBe('0')
    expect(buttons[0]!.attributes('tabindex')).toBe('-1')
    expect(buttons[1]!.attributes('aria-controls')).toBe('lt-panel')
    expect(buttons[1]!.attributes('id')).toBe('lt-tab-open')

    ;(buttons[1]!.element as HTMLElement).focus()
    await buttons[1]!.trigger('keydown', { key: 'ArrowRight' })
    expect(document.activeElement).toBe(buttons[2]!.element)
    await buttons[2]!.trigger('keydown', { key: 'Home' })
    expect(document.activeElement).toBe(buttons[0]!.element)
    wrapper.unmount()
  })
})

describe('loading indicator', () => {
  it('renders a status with the loading-indicator icon', () => {
    const wrapper = mountWithAlfakit(() => h(Spinner))
    const status = wrapper.find('[role="status"]')

    expect(status.attributes('aria-label')).toBe('Loading')
    expect(status.find('svg').classes()).toContain('animate-spin')
    wrapper.unmount()
  })
})
