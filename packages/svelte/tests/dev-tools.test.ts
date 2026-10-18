import type { DevToolsSchema } from '@alfakit/core'
import { fireEvent, render } from '@testing-library/svelte'
import { tick } from 'svelte'
import DevToolsInspector from '../src/components/dev-tools/DevToolsInspector.svelte'
import DevToolsSlot from '../src/components/dev-tools/DevToolsSlot.svelte'
import { panel, setPageProps } from './mocks'
import Wrapper from './Wrapper.svelte'

const tools: DevToolsSchema = {
  context: {
    panel: 'admin',
    page: 'App\\Alfakit\\Resources\\PostResource\\Pages\\EditPost',
    parameters: { record: '7' },
    component: null,
    boundToUser: true,
    issuedAt: 1_700_000_000,
    expiresAt: null,
  },
  tenant: null,
  classes: [
    {
      role: 'page',
      class: 'App\\EditPost',
      file: 'app/EditPost.php',
      line: 9,
      url: 'vscode://file/app/EditPost.php:9',
    },
  ],
  editor: 'vscode',
}

const text = () => document.body.textContent ?? ''

describe('schema inspector', () => {
  afterEach(() => {
    setPageProps({ alfakit: panel, alfakitDevTools: undefined, page: undefined })
  })

  it('renders nothing without the dev tools prop', () => {
    const { container } = render(Wrapper, { props: { component: DevToolsSlot } })

    expect(container.querySelector('[data-slot="dev-tools-toggle"]')).toBeNull()
  })

  it('shows the context, editor links and a searchable schema tree', async () => {
    setPageProps({
      alfakitDevTools: tools,
      page: { title: 'Edit post', content: [{ marker: 'needle' }] } as never,
    })

    const { container } = render(Wrapper, { props: { component: DevToolsInspector } })

    await fireEvent.click(container.querySelector('[aria-label="Open schema inspector"]')!)
    await tick()

    expect(text()).toContain('"7"')
    expect(text()).toContain('Never')
    expect(text()).not.toContain('alfakitDevTools')
    expect(
      document
        .querySelector('a[href="vscode://file/app/EditPost.php:9"]')
        ?.getAttribute('aria-label'),
    ).toBe('Open App\\EditPost in vscode')
    expect(text()).toContain('"Edit post"')

    await fireEvent.click(document.querySelector('button[aria-label="Collapse page"]')!)
    expect(text()).not.toContain('"Edit post"')

    const input = document.querySelector('input[type="search"]') as HTMLInputElement
    await fireEvent.input(input, { target: { value: 'needle' } })
    expect(text()).toContain('"needle"')
    expect(text()).not.toContain('"Edit post"')

    await fireEvent.input(input, { target: { value: 'zzz' } })
    expect(text()).toContain('Nothing matches “zzz”.')
  })

  it('copies the props as JSON', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    Object.assign(navigator, { clipboard: { writeText } })
    setPageProps({ alfakitDevTools: tools })

    const { container } = render(Wrapper, { props: { component: DevToolsInspector } })

    await fireEvent.click(container.querySelector('[aria-label="Open schema inspector"]')!)
    await tick()

    const copy = [...document.querySelectorAll('button')].find((item) =>
      item.textContent?.includes('Copy JSON'),
    )!
    await fireEvent.click(copy)
    await Promise.resolve()
    await tick()

    expect(writeText).toHaveBeenCalledOnce()
    expect(text()).toContain('Copied')
  })
})
