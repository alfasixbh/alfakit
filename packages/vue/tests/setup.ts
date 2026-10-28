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
  // This hook is where a test file that does not import the renderer itself loads all of
  // it (several hundred modules: about 9 s on an idle machine for the Svelte hydration
  // tests). Module loading has no timeout when it happens at a file's import time, so the
  // default 10 s hook timeout would only measure how busy the machine is.
  beforeAll(async () => {
    const { builtInComponents } = await import('../src/registry')

    await builtInComponents.preloadAll()
  }, 120_000)

  // Lazily loaded code (split built-ins, icons, editors, calendars) is fetched through
  // Vitest's module runner, which takes longer the busier the machine is. Let every pending
  // import finish before the file's environment is torn down (an import that resolves
  // afterwards fails with "Cannot load ... after the environment was torn down").
  afterAll(() => vi.dynamicImportSettled())

  // Rich editors scroll their selection into view after a toolbar button focuses them
  // (on the next animation frame, so possibly after the test's last assertion): ProseMirror
  // measures elements and ranges for that, and jsdom has no layout.
  const emptyRects = () => Object.assign([], { item: () => null }) as unknown as DOMRectList

  Element.prototype.getClientRects ??= emptyRects
  Range.prototype.getClientRects ??= emptyRects
  Range.prototype.getBoundingClientRect ??= () => new DOMRect()

  // `vi.waitFor()` times what the component does, not how long its lazily loaded chunks
  // take to import: pending imports settle before its timeout starts. (`vi` outlives a test
  // file in the worker, so it is wrapped once.)
  const wrapped = Symbol.for('alfakit.waitForAfterImports')
  const target = vi as typeof vi & { [wrapped]?: true }

  if (!target[wrapped]) {
    const waitFor = vi.waitFor.bind(vi)

    target[wrapped] = true
    vi.waitFor = (async (callback, options) => {
      await vi.dynamicImportSettled()

      return waitFor(callback, options)
    }) as typeof vi.waitFor
  }
}
