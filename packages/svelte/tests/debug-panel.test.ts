import type { DebugSchema } from '@alfakit/core'
import { debugRecorder } from '@alfakit/core'
import { fireEvent, render } from '@testing-library/svelte'
import { tick } from 'svelte'
import DebugPanel from '../src/components/panel/DebugPanel.svelte'
import DebugPanelSlot from '../src/components/panel/DebugPanelSlot.svelte'
import { panel, setPageProps } from './mocks'
import Wrapper from './Wrapper.svelte'

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
  })

  it('renders nothing when the page has no debug prop', () => {
    const { container } = render(Wrapper, { props: { component: DebugPanelSlot } })

    expect(container.querySelector('[aria-label="Open debug panel"]')).toBeNull()
  })

  it('opens a drawer with the schema tree and visibility badges', async () => {
    setPageProps({ alfakitDebug: debug })

    const { container } = render(Wrapper, { props: { component: DebugPanel } })

    await fireEvent.click(container.querySelector('[aria-label="Open debug panel"]')!)
    await tick()

    const text = document.body.textContent ?? ''

    expect(text).toContain(debug.page)
    expect(text).toContain('TextInput')
    expect(text).toContain('statePath=title')
    expect(text).toContain('unauthorized')
    expect(document.querySelector('[data-slot="debug-panel"]')).not.toBeNull()
  })
})
