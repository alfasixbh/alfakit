import type * as InertiaCore from '@inertiajs/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const listeners: Array<(event: unknown) => void> = []

vi.mock('@inertiajs/core', async (importOriginal) => {
  const original = await importOriginal<typeof InertiaCore>()

  return {
    ...original,
    router: {
      ...original.router,
      on: (name: string, callback: (event: unknown) => void) => {
        if (name === 'navigate') listeners.push(callback)

        return () => undefined
      },
    },
  }
})

const {
  installStarterKitDocument,
  starterKitDirection,
  starterKitDocument,
  starterKitSidebarSide,
} = await import('../src/starter-kit-document')

function navigate(props: Record<string, unknown>): void {
  for (const listener of listeners) listener({ detail: { page: { props } } })
}

describe('starter kit document', () => {
  beforeEach(() => {
    document.documentElement.lang = 'en'
    document.documentElement.dir = 'ltr'
  })

  it('reads the shared alfakitDocument prop', () => {
    expect(starterKitDocument({ alfakitDocument: { tag: 'ar', direction: 'rtl' } })).toEqual({
      tag: 'ar',
      direction: 'rtl',
    })
    expect(starterKitDocument({})).toBeNull()
    expect(starterKitDocument({ alfakitDocument: { tag: 'ar', direction: 'up' } })).toBeNull()
    expect(starterKitDirection({ alfakitDocument: { tag: 'ar', direction: 'rtl' } })).toBe('rtl')
    expect(starterKitDirection(null)).toBe('ltr')
    expect(starterKitSidebarSide({ alfakitDocument: { tag: 'ar', direction: 'rtl' } })).toBe(
      'right',
    )
    expect(starterKitSidebarSide({ alfakitDocument: { tag: 'en', direction: 'ltr' } })).toBe('left')
  })

  it('sets <html lang dir> on first load and after every visit, once listening', () => {
    installStarterKitDocument({ alfakitDocument: { tag: 'ar', direction: 'rtl' } })

    expect(document.documentElement.dir).toBe('rtl')
    expect(document.documentElement.lang).toBe('ar')

    // A second entry point (header, sidebar) does not add a second listener.
    installStarterKitDocument({ alfakitDocument: { tag: 'ar', direction: 'rtl' } })
    expect(listeners).toHaveLength(1)

    // Switching back to English: the redirect after the switch is a visit.
    navigate({ alfakitDocument: { tag: 'en', direction: 'ltr' } })
    expect(document.documentElement.dir).toBe('ltr')
    expect(document.documentElement.lang).toBe('en')

    // The kit's own page in an Arabic panel language: its text keeps the app's language.
    navigate({ alfakitDocument: { tag: 'en', direction: 'rtl' } })
    expect(document.documentElement.dir).toBe('rtl')
    expect(document.documentElement.lang).toBe('en')

    // Pages without the prop (another panel's) leave the document alone.
    navigate({})
    expect(document.documentElement.dir).toBe('rtl')
  })

  it('applies only what the server sent, never the browser language', () => {
    // A guest whose browser asks for English on a page the server rendered right to left
    // (`defaultLocale('ar')->detectBrowserLocale(false)`).
    const language = vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US')
    const languages = vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US', 'en'])
    document.documentElement.lang = 'ar'
    document.documentElement.dir = 'rtl'

    installStarterKitDocument({ alfakitDocument: { tag: 'ar', direction: 'rtl' } })
    expect(document.documentElement.dir).toBe('rtl')
    expect(starterKitDirection({ alfakitDocument: { tag: 'en', direction: 'rtl' } })).toBe('rtl')

    // Without the prop the root view's `dir` stays: nothing is derived on the client.
    installStarterKitDocument({})
    navigate({})
    expect(document.documentElement.dir).toBe('rtl')
    expect(document.documentElement.lang).toBe('ar')

    expect(language).not.toHaveBeenCalled()
    expect(languages).not.toHaveBeenCalled()
    language.mockRestore()
    languages.mockRestore()
  })
})
