import { router } from '@inertiajs/core'
import { describe, expect, it, vi } from 'vitest'
import { lazyComponentCache, switchLocale } from '../src'

vi.mock('@inertiajs/core', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  router: { post: vi.fn() },
}))

describe('switchLocale', () => {
  it('posts the locale and forgets lazy components cached in the old language', () => {
    lazyComponentCache.set('/admin|widget:stats', { heading: 'Statistiken' })

    switchLocale('/admin/_alfakit/locale', 'ar')

    expect(lazyComponentCache.get('/admin|widget:stats')).toBeUndefined()
    expect(router.post).toHaveBeenCalledWith(
      '/admin/_alfakit/locale',
      { locale: 'ar' },
      { preserveScroll: true, preserveState: false },
    )
  })
})
