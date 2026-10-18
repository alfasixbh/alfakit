import type { DebugSchema } from '@alfakit/core'
import { debugRecorder } from '@alfakit/core'
import { h } from 'vue'
import DebugPanel from '../src/components/panel/DebugPanel.vue'
import DebugPanelSlot from '../src/components/panel/DebugPanelSlot.vue'
import { flush, mountWithAlfakit, panel, setPageProps } from './mocks'

const debug: DebugSchema = {
  page: 'App\\Alfakit\\Resources\\PostResource\\Pages\\EditPost',
  panel: 'admin',
  tree: [
    {
      type: 'Form',
      key: 'form',
      visible: true,
      details: { operation: 'edit' },
      children: [
        {
          type: 'TextInput',
          key: 'title',
          label: 'Title',
          visible: true,
          details: { statePath: 'title' },
        },
        {
          type: 'Action',
          key: 'delete',
          label: 'Delete',
          visible: false,
          authorized: false,
          reason: 'unauthorized',
        },
      ],
    },
  ],
  closures: [
    {
      owner: 'TextInput[title]',
      file: 'app/Alfakit/Resources/PostResource.php',
      line: 42,
      count: 3,
    },
  ],
  server: {
    duration: 12.5,
    memory: 2 * 1024 * 1024,
    queries: 4,
    queryTime: 1.2,
    php: '8.4.0',
    laravel: '13.0.0',
  },
}

describe('debug panel', () => {
  afterEach(() => {
    setPageProps({ alfakit: panel, alfakitDebug: undefined })
    debugRecorder.setEnabled(false)
    document.body.innerHTML = ''
  })

  it('renders nothing when the page has no debug prop', () => {
    const wrapper = mountWithAlfakit(() => h(DebugPanelSlot))

    expect(wrapper.find('[aria-label="Open debug panel"]').exists()).toBe(false)
  })

  it('opens a drawer with the schema tree and visibility badges', async () => {
    setPageProps({ alfakitDebug: debug })

    const wrapper = mountWithAlfakit(() => h(DebugPanel))

    await wrapper.get('[aria-label="Open debug panel"]').trigger('click')
    await flush()

    const text = document.body.textContent ?? ''

    expect(text).toContain(debug.page)
    expect(text).toContain('TextInput')
    expect(text).toContain('statePath=title')
    expect(text).toContain('unauthorized')
    expect(document.querySelector('[data-slot="debug-panel"]')).not.toBeNull()
  })
})
