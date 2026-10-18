import '@testing-library/jest-dom/vitest'
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
  beforeAll(async () => {
    const { builtInComponents } = await import('../src/registry')

    await builtInComponents.preloadAll()
  })
}
