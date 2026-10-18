import type { DebugSchema } from '@alfakit/core'
import { debugRecorder } from '@alfakit/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { DebugPanel, DebugPanelSlot } from '../src/components/panel/debug-panel'
import { Wrapper, panel, setPageProps } from './mocks'

const debug: DebugSchema = {
  page: 'App\\Alfakit\\Resources\\PostResource\\Pages\\EditPost',
  panel: 'admin',
  tree: [
    {
      type: 'HeaderActions',
      key: 'headerActions',
      visible: true,
      children: [
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
        { type: 'Toggle', key: 'secret', label: 'Secret', visible: false, reason: 'hidden()' },
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
    const { container } = render(
      <Wrapper>
        <DebugPanelSlot />
      </Wrapper>,
    )

    expect(container.querySelector('[data-slot="debug-toggle"]')).toBeNull()
  })

  it('opens a drawer with the schema tree, visibility badges and timings', () => {
    setPageProps({ alfakitDebug: debug })

    render(
      <Wrapper>
        <DebugPanel />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open debug panel' }))

    expect(screen.getByText(debug.page)).toBeInTheDocument()
    expect(screen.getByText('TextInput')).toBeInTheDocument()
    expect(screen.getByText('statePath=title')).toBeInTheDocument()
    expect(screen.getByText('unauthorized')).toBeInTheDocument()
    expect(screen.getByText('hidden()')).toBeInTheDocument()
    expect(screen.getByText('“Delete”').closest('div')!.className).toContain(
      'text-muted-foreground',
    )

    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Timings' }))
    expect(screen.getByText('12.5 ms')).toBeInTheDocument()
    expect(screen.getByText('4 · 1.2 ms')).toBeInTheDocument()
    expect(screen.getByText('TextInput[title]')).toBeInTheDocument()
    expect(screen.getByText('×3')).toBeInTheDocument()

    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Form' }))
    expect(screen.getByText('No forms on this page.')).toBeInTheDocument()
  })
})
