import { requestJson } from './http'
import type { PwaSchema } from './schema/pwa'
import { createStore } from './store'

/**
 * `Panel::pwa()` in the browser: registers the panel's service worker, keeps the install
 * prompt for an "Install app" menu item, notices waiting updates ("A new version is
 * available — Reload") and manages this browser's Web Push subscription. Framework
 * agnostic; the renderers read `pwaStore` and call the functions below.
 */

/** This browser's push status: `unsupported` without the Push API (or push off on the panel). */
export type PwaPushStatus = 'unsupported' | 'default' | 'subscribed' | 'denied'

export interface PwaState {
  /** The service worker registered. */
  registered: boolean
  /** The browser offered an install prompt (`beforeinstallprompt`). */
  installable: boolean
  /** Running as the installed app (`display-mode: standalone`). */
  installed: boolean
  /** iOS / iPadOS Safari, not installed: installing is "Share › Add to Home Screen". */
  iosHint: boolean
  /** A new service worker waits: offer "Reload". */
  updateAvailable: boolean
  push: PwaPushStatus
  /** A push (un)subscription is in flight. */
  pushBusy: boolean
}

export type PwaInstallOutcome = 'accepted' | 'dismissed' | 'ios' | 'unavailable'

export type PwaPushOutcome = 'subscribed' | 'unsubscribed' | 'denied' | 'failed'

const initialState: PwaState = {
  registered: false,
  installable: false,
  installed: false,
  iosHint: false,
  updateAvailable: false,
  push: 'unsupported',
  pushBusy: false,
}

export const pwaStore = createStore<PwaState>({ ...initialState })

/** The `beforeinstallprompt` event, kept until "Install app" is chosen. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: InstallPromptEvent | null = null
let registration: ServiceWorkerRegistration | null = null
let started: string | null = null
let schema: PwaSchema | null = null
let reloading = false
let updateTimer: ReturnType<typeof setInterval> | null = null

/** Whether the user agent is iOS / iPadOS Safari (where installing is manual). */
export function isIosSafari(userAgent: string, maxTouchPoints = 0): boolean {
  const ios =
    /iphone|ipad|ipod/i.test(userAgent) || (/macintosh/i.test(userAgent) && maxTouchPoints > 1)
  const safari =
    /safari/i.test(userAgent) && !/crios|fxios|edgios|opios|chrome|android/i.test(userAgent)

  return ios && safari
}

/** Whether the page runs as an installed app. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false

  const navigatorStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone

  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    navigatorStandalone === true
  )
}

/** Base64url (VAPID public key) to the `applicationServerKey` bytes. */
export function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padded = (value + '='.repeat((4 - (value.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const raw = atob(padded)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))

  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)

  return bytes
}

function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

function watchWaiting(reg: ServiceWorkerRegistration): void {
  const offer = () => {
    // Only an update: the first install has no controller yet and activates by itself.
    if (reg.waiting && navigator.serviceWorker.controller) {
      pwaStore.update({ updateAvailable: true })
    }
  }

  offer()

  reg.addEventListener('updatefound', () => {
    const worker = reg.installing

    worker?.addEventListener('statechange', () => {
      if (worker.state === 'installed') offer()
    })
  })
}

async function refreshPushStatus(): Promise<void> {
  if (!schema?.push || !pushSupported() || !registration) {
    pwaStore.update({ push: 'unsupported' })

    return
  }

  if (Notification.permission === 'denied') {
    pwaStore.update({ push: 'denied' })

    return
  }

  const subscription = await registration.pushManager.getSubscription().catch(() => null)

  pwaStore.update({ push: subscription ? 'subscribed' : 'default' })
}

/**
 * Register the service worker and listen for the install prompt. Safe to call on every
 * page: it runs once per service worker URL, and does nothing during a server render or
 * without `pwa`.
 */
export function startPwa(pwa: PwaSchema | null | undefined): void {
  if (typeof window === 'undefined' || !pwa) return

  schema = pwa

  if (started === pwa.serviceWorker) {
    // The user may have signed in or out: push availability follows the panel schema.
    void refreshPushStatus()

    return
  }

  started = pwa.serviceWorker

  const installed = isStandalone()

  pwaStore.update({
    installed,
    iosHint: !installed && isIosSafari(navigator.userAgent, navigator.maxTouchPoints ?? 0),
  })

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event as InstallPromptEvent
    pwaStore.update({ installable: true })
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    pwaStore.update({ installable: false, installed: true, iosHint: false })
  })

  if (!('serviceWorker' in navigator)) return

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloading) return

    window.location.reload()
  })

  navigator.serviceWorker
    .register(pwa.serviceWorker, { scope: pwa.scope === '/' ? '/' : pwa.scope })
    .then((reg) => {
      registration = reg
      pwaStore.update({ registered: true })
      watchWaiting(reg)
      void refreshPushStatus()

      // Long-lived tabs check for a new build every hour.
      if (updateTimer === null) {
        updateTimer = setInterval(() => void reg.update().catch(() => undefined), 60 * 60 * 1000)
      }
    })
    .catch(() => {
      pwaStore.update({ registered: false })
    })
}

/**
 * "Install app": shows the browser's prompt, or tells iOS Safari to explain "Add to Home
 * Screen" (the renderer shows `pwa.ios_hint`).
 */
export async function promptPwaInstall(): Promise<PwaInstallOutcome> {
  if (deferredPrompt) {
    const prompt = deferredPrompt

    deferredPrompt = null
    pwaStore.update({ installable: false })

    await prompt.prompt()
    const { outcome } = await prompt.userChoice

    return outcome
  }

  return pwaStore.get().iosHint ? 'ios' : 'unavailable'
}

/** Whether "Install app" makes sense (a prompt is ready, or the iOS hint applies). */
export function canInstallPwa(state: PwaState = pwaStore.get()): boolean {
  return !state.installed && (state.installable || state.iosHint)
}

/** "Reload": activate the waiting service worker, then reload once it took over. */
export function applyPwaUpdate(): void {
  const waiting = registration?.waiting

  if (!waiting) {
    window.location.reload()

    return
  }

  reloading = true
  waiting.postMessage({ type: 'SKIP_WAITING' })
}

/** Subscribe this browser to Web Push (asks for notification permission). */
export async function subscribeToPush(): Promise<PwaPushOutcome> {
  if (!schema?.push || !registration || !pushSupported()) return 'failed'

  pwaStore.update({ pushBusy: true })

  try {
    const permission = await Notification.requestPermission()

    if (permission !== 'granted') {
      pwaStore.update({ push: permission === 'denied' ? 'denied' : 'default' })

      return permission === 'denied' ? 'denied' : 'failed'
    }

    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(schema.push.publicKey),
      }))

    await requestJson(schema.push.endpoint, { method: 'POST', body: subscription.toJSON() })
    pwaStore.update({ push: 'subscribed' })

    return 'subscribed'
  } catch {
    return 'failed'
  } finally {
    pwaStore.update({ pushBusy: false })
  }
}

/** Unsubscribe this browser from Web Push. */
export async function unsubscribeFromPush(): Promise<PwaPushOutcome> {
  if (!schema?.push || !registration) return 'failed'

  pwaStore.update({ pushBusy: true })

  try {
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await requestJson(schema.push.endpoint, {
        method: 'DELETE',
        body: { endpoint: subscription.endpoint },
      }).catch(() => undefined)
      await subscription.unsubscribe()
    }

    pwaStore.update({ push: 'default' })

    return 'unsubscribed'
  } catch {
    return 'failed'
  } finally {
    pwaStore.update({ pushBusy: false })
  }
}

/** Forget everything (tests). */
export function resetPwa(): void {
  deferredPrompt = null
  registration = null
  started = null
  schema = null
  reloading = false

  if (updateTimer !== null) clearInterval(updateTimer)

  updateTimer = null
  pwaStore.set({ ...initialState })
}
