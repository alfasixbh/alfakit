import type { DevToolsSchema } from '@alfakit/core'
import { h } from 'vue'
import DevToolsInspector from '../src/components/dev-tools/DevToolsInspector.vue'
import DevToolsSlot from '../src/components/dev-tools/DevToolsSlot.vue'
import { flush, mountWithAlfakit, panel, setPageProps } from './mocks'

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

function button(label: string): HTMLButtonElement {
  return document.querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement
}

describe('schema inspector', () => {
  afterEach(() => {
    setPageProps({ alfakit: panel, alfakitDevTools: undefined, page: undefined })
    document.body.innerHTML = ''
  })

  it('renders nothing without the dev tools prop', () => {
    const wrapper = mountWithAlfakit(() => h(DevToolsSlot))

    expect(wrapper.find('[data-slot="dev-tools-toggle"]').exists()).toBe(false)
  })

  it('shows the context, editor links and a searchable schema tree', async () => {
    setPageProps({
      alfakitDevTools: tools,
      page: { title: 'Edit post', content: [{ marker: 'needle' }] } as never,
    })

    const wrapper = mountWithAlfakit(() => h(DevToolsInspector))

    await wrapper.get('[aria-label="Open schema inspector"]').trigger('click')
    await flush()

    const text = () => document.body.textContent ?? ''

    expect(text()).toContain('"7"')
    expect(text()).toContain('Never')
    expect(text()).not.toContain('alfakitDevTools')
    const link = document.querySelector('a[href="vscode://file/app/EditPost.php:9"]')
    expect(link?.getAttribute('aria-label')).toBe('Open App\\EditPost in vscode')
    expect(text()).toContain('"Edit post"')

    button('Collapse page').click()
    await flush()
    expect(text()).not.toContain('"Edit post"')

    const input = document.querySelector('input[type="search"]') as HTMLInputElement
    input.value = 'needle'
    input.dispatchEvent(new Event('input'))
    await flush()
    expect(text()).toContain('"needle"')
    expect(text()).not.toContain('"Edit post"')

    input.value = 'zzz'
    input.dispatchEvent(new Event('input'))
    await flush()
    expect(text()).toContain('Nothing matches “zzz”.')
  })

  it('copies the props as JSON', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    Object.assign(navigator, { clipboard: { writeText } })
    setPageProps({ alfakitDevTools: tools })

    const wrapper = mountWithAlfakit(() => h(DevToolsInspector))

    await wrapper.get('[aria-label="Open schema inspector"]').trigger('click')
    await flush()

    const copy = [...document.querySelectorAll('button')].find((item) =>
      item.textContent?.includes('Copy JSON'),
    )!
    copy.click()
    await flush()

    expect(writeText).toHaveBeenCalledOnce()
    expect(document.body.textContent).toContain('Copied')
  })

  it("opens on the host document's side in a right-to-left starter kit, next to its button (W-31)", async () => {
    document.documentElement.dir = 'ltr'
    setPageProps({
      alfakitDevTools: tools,
      alfakit: {
        ...panel,
        starterKit: true,
        localization: { code: 'ar', tag: 'ar', direction: 'rtl', locales: [] },
      } as never,
    })

    const wrapper = mountWithAlfakit(() => h(DevToolsInspector))
    await wrapper.get('[aria-label="Open schema inspector"]').trigger('click')
    await flush()

    const sheet = document.querySelector('[data-slot="sheet-content"]')
    expect(sheet?.className).toContain('right-0')

    wrapper.unmount()
  })
})
