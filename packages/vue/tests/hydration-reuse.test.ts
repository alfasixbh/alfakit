/* eslint-disable vue/one-component-per-file -- tiny fixtures for one test */
import { createApp, createSSRApp, defineComponent, h, nextTick } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { Icon } from '../src/lib/icons'
import { lazyComponent } from '../src/lib/lazy'

const Heavy = defineComponent({ setup: () => () => h('output', 'heavy') })
const Fallback = defineComponent({ setup: () => () => h('span', { 'data-fallback': '' }) })
const Lazy = lazyComponent('Heavy', () => Promise.resolve(Heavy), Fallback)

const Root = defineComponent({
  setup: () => () => h('div', [h(Icon, { name: 'users' }), h(Lazy)]),
})

/**
 * Loaded icon chunks and lazy components outlive an app. An app hydrating after another one
 * has already loaded them (a second Alfakit app on the page, the hydration test's pages)
 * must still render its server markup first, whatever has loaded in the meantime.
 */
describe('hydrating after another app loaded icons and lazy components', () => {
  it('renders the server markup first, then the loaded parts', async () => {
    const html = await renderToString(createSSRApp(Root))
    expect(html).not.toContain('<svg')
    expect(html).toContain('data-fallback')

    // Another app mounts and loads the icon and the lazy component.
    const first = document.createElement('div')
    document.body.append(first)
    const other = createApp(Root)
    other.mount(first)
    await vi.waitFor(() => {
      expect(first.querySelector('svg')).not.toBeNull()
      expect(first.textContent).toContain('heavy')
    })

    const container = document.createElement('div')
    container.innerHTML = html
    document.body.append(container)
    const messages: string[] = []
    const record = (...args: unknown[]) => messages.push(args.map(String).join(' '))
    const spies = [
      vi.spyOn(console, 'error').mockImplementation(record),
      vi.spyOn(console, 'warn').mockImplementation(record),
    ]

    const app = createSSRApp(Root)
    app.mount(container)
    spies.forEach((spy) => spy.mockRestore())

    expect(messages.filter((message) => /hydrat|mismatch/i.test(message))).toEqual([])

    await nextTick()
    expect(container.querySelector('svg')).not.toBeNull()
    expect(container.textContent).toContain('heavy')

    app.unmount()
    other.unmount()
  })
})
