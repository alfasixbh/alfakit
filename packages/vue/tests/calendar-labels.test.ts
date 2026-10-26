import { h } from 'vue'
import Calendar from '../src/components/ui/Calendar.vue'
import { mountWithAlfakit } from './mocks'

// W-V3-06: the month buttons were announced as Reka UI's English "Previous page" / "Next page".
describe('calendar month navigation labels', () => {
  it('names the previous and next month buttons from the language pack', () => {
    const wrapper = mountWithAlfakit(() => h(Calendar))
    const labels = wrapper.findAll('button').map((button) => button.attributes('aria-label'))

    expect(labels).toContain('Previous month')
    expect(labels).toContain('Next month')
    expect(labels).not.toContain('Previous page')

    wrapper.unmount()
  })
})
