import { render } from '@testing-library/svelte'
import { flushSync } from 'svelte'
import { APP_MOUNTED, createAppMounted } from '../src/lib/hydration.svelte'
import { loadIcon } from '../src/lib/icons'
import { lazyLoader } from '../src/lib/lazy'
import HeavyProbe from './HeavyProbe.svelte'
import HydrationGateHarness from './HydrationGateHarness.svelte'

/**
 * Loaded icon chunks and lazy components outlive an app. An app hydrating after another one
 * has already loaded them (a second Alfakit app on the page) must still render its server
 * markup (no icon, the fallback) until it has mounted.
 */
describe('per-app hydration gate', () => {
  it('renders the server markup until the app has mounted, then the loaded parts', async () => {
    const loader = lazyLoader<Record<string, never>>(() => Promise.resolve(HeavyProbe))

    // Another app already loaded both.
    await loader.load()
    expect(await loadIcon('users')).toBeDefined()

    const mounted = createAppMounted()
    const { container } = render(HydrationGateHarness, {
      props: { loader },
      context: new Map([[APP_MOUNTED, mounted]]),
    })

    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('[data-fallback]')).not.toBeNull()

    mounted.current = true
    flushSync()

    expect(container.querySelector('svg')).not.toBeNull()
    expect(container.textContent).toContain('heavy')
  })
})
