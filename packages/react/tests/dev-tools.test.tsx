import type { DevToolsSchema } from '@alfakit/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { DevToolsInspector } from '../src/components/dev-tools/dev-tools-inspector'
import { DevToolsSlot } from '../src/components/dev-tools/dev-tools-slot'
import { Wrapper, panel, setPageProps } from './mocks'

const tools: DevToolsSchema = {
  context: {
    panel: 'admin',
    page: 'App\\Alfakit\\Resources\\PostResource\\Pages\\EditPost',
    parameters: { record: '7' },
    component: null,
    boundToUser: true,
    issuedAt: 1_700_000_000,
    expiresAt: 1_700_086_400,
  },
  tenant: null,
  classes: [
    {
      role: 'page',
      class: 'App\\Alfakit\\Resources\\PostResource\\Pages\\EditPost',
      file: 'app/Alfakit/Resources/PostResource/Pages/EditPost.php',
      line: 9,
      url: 'vscode://file/app/EditPost.php:9',
    },
    { role: 'model', class: 'App\\Models\\Post', file: null, line: null, url: null },
  ],
  editor: 'vscode',
}

describe('schema inspector', () => {
  afterEach(() => setPageProps({ alfakit: panel, alfakitDevTools: undefined, page: undefined }))

  it('renders nothing without the dev tools prop', () => {
    const { container } = render(
      <Wrapper>
        <DevToolsSlot />
      </Wrapper>,
    )

    expect(container.querySelector('[data-slot="dev-tools-toggle"]')).toBeNull()
  })

  it('shows the context, editor links and a searchable schema tree', () => {
    setPageProps({
      alfakitDevTools: tools,
      page: { title: 'Edit post', content: [{ type: 'form', marker: 'needle' }] } as never,
    })

    render(
      <Wrapper>
        <DevToolsInspector />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open schema inspector' }))

    expect(screen.getByText('admin')).toBeInTheDocument()
    expect(screen.getByText('"7"')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: `Open ${tools.classes[0]!.class} in vscode` }),
    ).toHaveAttribute('href', 'vscode://file/app/EditPost.php:9')
    expect(screen.queryByText('alfakitDevTools')).toBeNull()

    // Top-level props start open, deeper levels closed; each toggles.
    expect(screen.getByText('"Edit post"')).toBeInTheDocument()
    expect(screen.queryByText('"needle"')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Collapse page' }))
    expect(screen.queryByText('"Edit post"')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Expand page' }))
    expect(screen.getByText('"Edit post"')).toBeInTheDocument()

    // Searching opens every ancestor of a match.
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'needle' } })
    expect(screen.getByText('"needle"')).toBeInTheDocument()
    expect(screen.queryByText('"Edit post"')).toBeNull()

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } })
    expect(screen.getByText('Nothing matches “zzz”.')).toBeInTheDocument()
  })

  it('copies the props as JSON', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    Object.assign(navigator, { clipboard: { writeText } })
    setPageProps({ alfakitDevTools: tools })

    render(
      <Wrapper>
        <DevToolsInspector />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open schema inspector' }))
    fireEvent.click(screen.getByRole('button', { name: 'Copy JSON' }))

    expect(writeText).toHaveBeenCalledOnce()
    expect(writeText.mock.calls[0]).toBeDefined()
    expect(await screen.findByText('Copied')).toBeInTheDocument()
  })
})
