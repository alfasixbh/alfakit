import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  applyPwaUpdate,
  canInstallPwa,
  commandPaletteItems,
  isIosSafari,
  promptPwaInstall,
  pwaStore,
  resetPwa,
  startPwa,
  urlBase64ToUint8Array,
  type PanelSchema,
} from '../src'

function fakeServiceWorker(waiting: { postMessage: ReturnType<typeof vi.fn> } | null = null) {
  const registration = {
    waiting,
    installing: null,
    addEventListener: vi.fn(),
    update: vi.fn(() => Promise.resolve()),
    pushManager: { getSubscription: vi.fn(() => Promise.resolve(null)) },
  }
  const container = {
    controller: waiting ? {} : null,
    register: vi.fn(() => Promise.resolve(registration)),
    addEventListener: vi.fn(),
  }

  Object.defineProperty(navigator, 'serviceWorker', { value: container, configurable: true })

  return { registration, container }
}

afterEach(() => {
  resetPwa()
  Reflect.deleteProperty(navigator, 'serviceWorker')
})

describe('pwa', () => {
  it('detects iOS Safari, but not Chrome on iOS or desktop Safari', () => {
    const safari =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
    const chrome = safari.replace('Version/18.0', 'CriOS/130.0')
    const mac =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'

    expect(isIosSafari(safari)).toBe(true)
    expect(isIosSafari(chrome)).toBe(false)
    expect(isIosSafari(mac)).toBe(false)
    // iPadOS reports a Mac with touch.
    expect(isIosSafari(mac, 5)).toBe(true)
  })

  it('decodes the VAPID key', () => {
    expect(Array.from(urlBase64ToUint8Array('AQID_-8'))).toEqual([1, 2, 3, 255, 239])
  })

  it('registers the service worker with the panel scope once', async () => {
    const { container } = fakeServiceWorker()

    startPwa({ serviceWorker: '/admin/sw.js', scope: '/admin' })
    startPwa({ serviceWorker: '/admin/sw.js', scope: '/admin' })
    await Promise.resolve()
    await Promise.resolve()

    expect(container.register).toHaveBeenCalledTimes(1)
    expect(container.register).toHaveBeenCalledWith('/admin/sw.js', { scope: '/admin' })
    expect(pwaStore.get().registered).toBe(true)
    expect(pwaStore.get().push).toBe('unsupported')
  })

  it('keeps the install prompt for "Install app"', async () => {
    fakeServiceWorker()
    startPwa({ serviceWorker: '/admin/sw.js', scope: '/admin' })

    expect(canInstallPwa()).toBe(false)
    expect(await promptPwaInstall()).toBe('unavailable')

    const prompt = vi.fn(() => Promise.resolve())
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    })
    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(canInstallPwa()).toBe(true)
    expect(await promptPwaInstall()).toBe('accepted')
    expect(prompt).toHaveBeenCalled()
    expect(pwaStore.get().installable).toBe(false)

    window.dispatchEvent(new Event('appinstalled'))
    expect(pwaStore.get().installed).toBe(true)
  })

  it('offers a waiting update and activates it on "Reload"', async () => {
    const waiting = { postMessage: vi.fn() }
    fakeServiceWorker(waiting)

    startPwa({ serviceWorker: '/admin/sw.js', scope: '/admin' })
    await Promise.resolve()
    await Promise.resolve()

    expect(pwaStore.get().updateAvailable).toBe(true)

    applyPwaUpdate()
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
  })

  it('adds "Install app" to the command palette', () => {
    const panel = {
      commandPalette: { commands: [] },
      navigation: [],
      darkMode: { enabled: false },
    } as unknown as PanelSchema
    const labels = { light: 'L', dark: 'D', system: 'S', shortcuts: 'K' }

    expect(commandPaletteItems({ panel, labels }).some((item) => item.kind === 'install')).toBe(
      false,
    )

    const item = commandPaletteItems({ panel, labels, install: 'Install app' }).find(
      (entry) => entry.kind === 'install',
    )

    expect(item).toMatchObject({ group: 'commands', label: 'Install app', icon: 'download' })
  })
})
