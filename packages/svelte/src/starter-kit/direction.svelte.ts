import { installStarterKitDocument, starterKitDirection } from '@alfakit/core'
import { page } from '@inertiajs/svelte'

/**
 * Keep `<html lang dir>` on the shared `alfakitDocument` (from the first page onwards): after
 * every visit and language switch. Call during component initialisation.
 */
export function useStarterKitDocument(): void {
  try {
    $effect(() => {
      installStarterKitDocument(page.props)
    })
  } catch {
    // Called outside component initialisation (a script reading the navigation): the
    // sidebar and header components keep the document in step.
  }
}

/**
 * The reading direction of the page in a starter kit app: `rtl` while the user has picked a
 * right-to-left language for the `starterKit()` panel, on AlfaKit's pages and the app's own.
 * `current` reads the current page, so it updates after each visit when read in markup or
 * `$derived`. The installer docks the kit's sidebar with it (`side`, which is physical in
 * shadcn):
 *
 * ```svelte
 * const direction = useAlfakitDirection()
 * <Sidebar side={direction.current === 'rtl' ? 'right' : 'left'} …>
 * ```
 *
 * It also keeps `<html lang dir>` in step. Call during component initialisation.
 */
export function useAlfakitDirection(): { readonly current: 'ltr' | 'rtl' } {
  useStarterKitDocument()

  return {
    get current() {
      return starterKitDirection(page.props)
    },
  }
}
