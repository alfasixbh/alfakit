import type { StarterKitWidgets } from '@alfakit/core'
import { lazyLoader } from '../../lib/lazy'

/** The host-page impersonation banner, loaded only while impersonating. */
export const impersonationBannerLoader = lazyLoader<{ source: StarterKitWidgets | null }>(() =>
  import('./StarterKitImpersonationBanner.svelte').then((module) => module.default),
)
