import { lazyComponents } from '@alfakit/core'
import { createSSRApp, defineComponent, h, nextTick, useId, type Component } from 'vue'
import { renderToString } from 'vue/server-renderer'
import type { AnyComponent } from '../src/context'
import { discoveredComponent } from '../src/lib/discovery'
import { startIdScope } from '../src/lib/hydration'
import { lazyComponent } from '../src/lib/lazy'

// W-V2-13 / W-V3-28: a starter kit with SSR. The SSR server keeps the code of lazily split
// built-ins between requests, the browser loads it during hydration, and the host layout
// renders other markup on phones in the browser than on the server.

const flushAll = async () => {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0))
    await nextTick()
  }
}

/** Server-render `server`, hydrate `client` over it; the Vue warnings and the ids seen. */
async function hydrate(server: Component, client: Component): Promise<string[]> {
  const html = await renderToString(createSSRApp(server))
  const container = document.createElement('div')
  container.innerHTML = html
  document.body.appendChild(container)

  const messages: string[] = []
  const spies = [
    vi.spyOn(console, 'warn').mockImplementation((...args) => messages.push(args.join(' '))),
    vi.spyOn(console, 'error').mockImplementation((...args) => messages.push(args.join(' '))),
  ]

  const app = createSSRApp(client)
  app.mount(container)
  await flushAll()

  spies.forEach((spy) => spy.mockRestore())
  app.unmount()
  container.remove()

  return messages.filter((message) => /hydration/i.test(message))
}

const Tabs = defineComponent({
  setup() {
    const id = useId()

    return () => h('div', { id, role: 'tablist' })
  },
})

const Skeleton = defineComponent({ setup: () => () => h('div', { class: 'skeleton' }) })
const Editor = defineComponent({ setup: () => () => h('div', { class: 'editor' }) })

/** A lazily split built-in, as the registry wraps it; `loaded` as on a warm server. */
async function splitComponent(inner: Component, loaded: boolean): Promise<AnyComponent> {
  const discovery = lazyComponents<AnyComponent>({ Tabs: () => Promise.resolve(inner) })

  if (loaded) await discovery.preloadAll()

  return discovery.map(discoveredComponent).components.Tabs!
}

const Header = defineComponent({
  props: { count: { type: Number, required: true } },
  setup(props) {
    const ids = Array.from({ length: props.count }, () => useId())

    return () =>
      h(
        'header',
        ids.map((id) => h('span', { id })),
      )
  },
})

describe('hydrating server markup (Vue ids and lazy parts)', () => {
  it('numbers the ids of a split component alike, loaded or loading', async () => {
    const page = (split: AnyComponent) =>
      defineComponent({ setup: () => () => h('main', [h(Header, { count: 2 }), h(split)]) })

    const warnings = await hydrate(
      page(await splitComponent(Tabs, true)),
      page(await splitComponent(Tabs, false)),
    )

    expect(warnings).toEqual([])
  })

  it('keeps lazy parts on their fallback while a later loaded component hydrates', async () => {
    const Field = lazyComponent('Field', () => Promise.resolve(Editor), Skeleton)
    const WithField = defineComponent({ setup: () => () => h('section', [h(Field)]) })
    // Lazy parts outside it (icons in the page header) hydrate with the app.
    const Icon = lazyComponent('Icon', () => Promise.resolve(Editor), Skeleton)
    const page = (split: AnyComponent) =>
      defineComponent({ setup: () => () => h('main', [h(Icon), h(split)]) })

    const warnings = await hydrate(
      page(await splitComponent(WithField, true)),
      page(await splitComponent(WithField, false)),
    )

    expect(warnings).toEqual([])
  })

  it("keeps AlfaKit's ids apart from the host layout's", async () => {
    const seen: string[] = []
    const Probe = defineComponent({
      setup() {
        const id = useId()
        seen.push(id)

        return () => h('div', { id, role: 'tablist' })
      },
    })
    const Root = defineComponent({
      setup(_, { slots }) {
        startIdScope()

        return () => h('div', slots.default?.())
      },
    })
    // The host renders more id'd elements on the server (desktop sidebar) than in the browser.
    const page = (count: number) =>
      defineComponent({
        setup: () => () => h('main', [h(Header, { count }), h(Root, null, () => h(Probe))]),
      })

    await hydrate(page(3), page(1))

    expect(seen).toHaveLength(2)
    expect(seen[1]).toBe(seen[0])
  })
})
