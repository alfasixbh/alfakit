import { lazyLoader } from '../../lib/lazy-loader'

/** The command palette behind `GlobalSearch`: loaded the first time it opens. */
export const globalSearchPalette = lazyLoader(() =>
  import('./GlobalSearchPalette.vue').then((module) => module.default),
)

/** The `?` overlay of `KeyboardShortcuts`: loaded the first time it opens. */
export const shortcutsOverlay = lazyLoader(() =>
  import('./ShortcutsOverlay.vue').then((module) => module.default),
)
