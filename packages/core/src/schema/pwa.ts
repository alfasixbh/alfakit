/**
 * `Panel::pwa()`: what the renderers need to register the service worker, offer
 * "Install app" and (signed in, with `pwa(push: true)` and VAPID keys) Web Push.
 */
export interface PwaSchema {
  /** The service worker URL (`/admin/sw.js`). */
  serviceWorker: string
  /** The app's scope: the panel path without a trailing slash (`/admin`, `/` at the root). */
  scope: string
  /** Web Push: the VAPID public key and where subscriptions are stored. */
  push?: PwaPushSchema
}

export interface PwaPushSchema {
  /** Base64url-encoded VAPID public key (`applicationServerKey`). */
  publicKey: string
  /** POST subscribes this browser, DELETE unsubscribes it. */
  endpoint: string
}
