import { h, type Component } from 'vue'
import { showToast } from '../src/components/notifications/flash-toasts'
import { mountWithAlfakit } from './mocks'

// Imported statically (vi.mock is hoisted above the imports, so vue-sonner is still mocked):
// loading the registry behind `mountWithAlfakit` inside the test counted its module
// evaluation against the test timeout.
const calls = vi.hoisted((): Array<{ title: string; options: Record<string, unknown> }> => [])

vi.mock('vue-sonner', () => {
  const record = (title: string, options: Record<string, unknown>) => calls.push({ title, options })

  return {
    toast: Object.assign(record, {
      success: record,
      error: record,
      warning: record,
      info: record,
      custom: record,
    }),
  }
})

describe('showToast', () => {
  it('renders notification actions as buttons below the body', () => {
    showToast({
      id: 'export',
      title: 'Export completed',
      body: '400 rows were exported.',
      status: 'success',
      actions: [
        { type: 'Action', name: 'csv', label: 'Download .csv', url: '/exports/1.csv' },
        { type: 'Action', name: 'xlsx', label: 'Download .xlsx', url: '/exports/1.xlsx' },
      ],
    } as never)

    const { options } = calls.at(-1)!

    // vue-sonner prints a component passed as `action` as "{}"; the buttons live in the description.
    expect(options.action).toBeUndefined()

    const wrapper = mountWithAlfakit(() => h(options.description as Component))

    expect(wrapper.text()).toContain('400 rows were exported.')
    expect(wrapper.text()).toContain('Download .csv')
    expect(wrapper.text()).toContain('Download .xlsx')
    expect(wrapper.text()).not.toContain('{}')

    wrapper.unmount()
  })
})
