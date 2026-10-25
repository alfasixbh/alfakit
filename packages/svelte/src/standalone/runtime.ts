import {
  ActionRunner,
  ComponentRegistry,
  FlashNotificationTracker,
  Translator,
  installPrefetchInvalidation,
  reloadOnExpiredPage,
  resolveRequestErrorNotification,
  type NotificationSchema,
} from '@alfakit/core'
import { router } from '@inertiajs/svelte'
import { showToast, type NotificationComponent } from '../components/notifications/toast'
import type { AlfakitContextValue, AnyComponent } from '../context.svelte'
import { createDefaultRegistry } from '../registry'
import { getStandaloneDefaults } from './configure'

const isServer = typeof window === 'undefined'

// Translations are the same for every component of a page, so the browser shares one
// translator; a server render gets its own so concurrent requests never share a locale.
const browserTranslator = isServer ? null : new Translator()

let browserReady = false

/** Browser-wide listeners every panel app installs; once per page load. */
export function ensureStandaloneRuntime(): void {
  if (isServer || browserReady) return

  browserReady = true
  reloadOnExpiredPage()
  // Pages restored by Back after a change are reloaded; shared with a surrounding panel.
  installPrefetchInvalidation()
}

/**
 * The registry of a standalone component: the built-in renderers, the `configureAlfakit()`
 * defaults (or the surrounding panel's registry), then the component's own overrides.
 */
export function createStandaloneRegistry(
  overrides?: Record<string, AnyComponent>,
  base?: ComponentRegistry<AnyComponent>,
): ComponentRegistry<AnyComponent> {
  if (!base) {
    return createDefaultRegistry()
      .registerMany(getStandaloneDefaults().components ?? {})
      .registerMany(overrides ?? {})
  }

  if (!overrides || Object.keys(overrides).length === 0) {
    return base
  }

  const registry = new ComponentRegistry<AnyComponent>()

  for (const type of base.types()) {
    const component = base.resolve(type)

    if (component) registry.register(type, component)
  }

  return registry.registerMany(overrides)
}

/**
 * The context value of one `<AlfakitComponent>` rendered outside `createAlfakit()`: its
 * own registry and action runner (so its modals are its own), the shared translator.
 */
export function createStandaloneContext(
  endpoints: { action: string; modal: string },
  overrides: Record<string, AnyComponent> | undefined,
  poll: AlfakitContextValue['poll'],
): AlfakitContextValue {
  const translator = browserTranslator ?? new Translator()

  return {
    registry: createStandaloneRegistry(overrides),
    pages: {},
    translator,
    actions: new ActionRunner({
      endpoints: { ...endpoints },
      // Outside a panel there is no `errorNotifications` config: a generic toast.
      onError: (error) => {
        const notification = resolveRequestErrorNotification(
          error,
          null,
          (key, replacements, fallback) => translator.t(key, replacements, fallback),
        )

        if (notification) showToast(notification)
      },
    }),
    poll,
  }
}

// ---------------------------------------------------------------- Toaster ownership

let toasters = 0

/** An `<AlfakitToaster>` (or the component that took the role) is mounted; returns a release. */
export function claimToaster(): () => void {
  toasters++

  return () => {
    toasters--
  }
}

export function hasToaster(): boolean {
  return toasters > 0
}

// ---------------------------------------------------------------- Flashed notifications

const flashTracker = new FlashNotificationTracker()
let flashRegistry: ComponentRegistry<AnyComponent> | null = null
let flashListening = false

/**
 * Show the notifications the server flashed (`Notification::make()->send()`), from the
 * `flash` Inertia event after each visit and from the initial page (whose event fired
 * before the app mounted). One listener per page load, so it survives layouts that remount
 * between visits; the registry of the last mounted toaster renders custom toast views.
 */
export function ensureFlashToasts(registry: ComponentRegistry<AnyComponent>): void {
  flashRegistry = registry

  if (isServer || flashListening) return

  flashListening = true

  const show = (flash: unknown) => {
    const flashed = (flash as { alfakitNotifications?: NotificationSchema[] } | undefined)
      ?.alfakitNotifications

    for (const notification of flashTracker.fresh(flashed)) {
      showToast(
        notification,
        flashRegistry?.resolve(notification.view ?? '') as NotificationComponent | undefined,
      )
    }
  }

  show(initialFlash())
  router.on('flash', (event) => show(event.detail.flash))
}

/** The initial page's flash data (fired as an event before the app mounted). */
export function initialFlash(): unknown {
  if (isServer) return undefined

  try {
    const page = document.querySelector<HTMLElement>('[data-page]')?.dataset.page

    return page ? (JSON.parse(page) as { flash?: unknown }).flash : undefined
  } catch {
    return undefined
  }
}
