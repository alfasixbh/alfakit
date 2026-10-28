import '@testing-library/jest-dom/vitest'
import { configure, getConfig } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createElement } from 'react'

declare global {
  var __alfakitPageProps: Record<string, unknown>
}

globalThis.__alfakitPageProps = {}

vi.mock('@inertiajs/react', () => ({
  usePage: () => ({
    props: globalThis.__alfakitPageProps,
    url: '/admin',
    component: 'Alfakit/Page',
  }),
  Link: ({
    href,
    children,
    prefetch: _prefetch,
    ...rest
  }: {
    href: string
    children: ReactNode
    prefetch?: boolean
  }) => createElement('a', { href, ...rest }, children),
  Head: () => null,
  router: { on: () => () => {}, visit: vi.fn(), post: vi.fn(), reload: vi.fn() },
}))

// Built-ins are split per type; jsdom tests render synchronously, so load them all first.
// (Node SSR tests preload through `resolve()` and unmock Inertia, so they import nothing here.)
// Preload in `beforeAll` (after the test file's hoisted `vi.mock`s are registered), not at
// setup top level: importing the registry here would load modules such as `@inertiajs/core`
// before a test file mocks them, and the cached real module would win over the mock.
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

  // `waitFor()` / `findBy*()` time what the component does, not how long its lazily loaded
  // chunks take to import: pending imports settle before their timeout starts.
  const { asyncWrapper } = getConfig()
  configure({
    asyncWrapper: (callback) =>
      asyncWrapper(async () => {
        await vi.dynamicImportSettled()

        return callback()
      }),
  })
}
