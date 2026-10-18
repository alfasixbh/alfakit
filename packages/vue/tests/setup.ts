import { defineComponent, h, type PropType } from 'vue'

declare global {
  var __alfakitPageProps: Record<string, unknown>
}

globalThis.__alfakitPageProps = {}

vi.mock('@inertiajs/vue3', () => ({
  usePage: () => ({
    get props() {
      return globalThis.__alfakitPageProps
    },
    url: '/admin',
    component: 'Alfakit/Page',
  }),
  Link: defineComponent({
    props: {
      href: { type: String, required: true },
      prefetch: { type: [Boolean, String, Array] as PropType<unknown>, default: undefined },
    },
    setup(props, { slots, attrs }) {
      return () => h('a', { href: props.href, ...attrs }, slots.default?.())
    },
  }),
  Head: defineComponent({ setup: () => () => null }),
  router: { on: () => () => {}, visit: vi.fn(), post: vi.fn(), reload: vi.fn() },
}))

// Built-ins are split per type; jsdom tests render synchronously, so load them all first.
// (Node SSR tests preload through `resolve()`, so they import nothing here.) Preload in
// `beforeAll`, after the test file's hoisted `vi.mock`s are registered: importing the
// registry at setup top level would cache real modules before a test file mocks them.
if (typeof window !== 'undefined') {
  beforeAll(async () => {
    const { builtInComponents } = await import('../src/registry')

    await builtInComponents.preloadAll()
  })
}
