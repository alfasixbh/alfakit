import { formatKeyBinding, globalSearchSuffix, SHORTCUT_IDS, shortcuts } from '@alfakit/core'
import { router } from '@inertiajs/react'
import { SearchIcon } from 'lucide-react'
import { useEffect, useState, type ComponentType } from 'react'
import { usePanel, useT } from '../../context'
import { useHydrated } from '../../hooks/use-hydrated'
import { Icon } from '../../lib/icons'
import { Button } from '../ui/button'
import { Slot } from './slot'

type PaletteComponent = ComponentType<{ open: boolean; onOpenChange: (open: boolean) => void }>

let loadedPalette: PaletteComponent | undefined
let loadingPalette: Promise<PaletteComponent> | undefined

/** The palette's code: loaded the first time it opens (or ahead, on hover and focus). */
function loadPalette(): Promise<PaletteComponent> {
  loadingPalette ??= import('./global-search-palette').then(
    (module) => (loadedPalette = module.GlobalSearchPalette),
    (error: unknown) => {
      loadingPalette = undefined
      throw error
    },
  )

  return loadingPalette
}

const preloadPalette = () => void loadPalette().catch(() => undefined)

/**
 * The search field and its command palette (`GlobalSearchPalette`, loaded on first open):
 * global search results plus (with `alfakit.commandPalette`) the page's header actions,
 * panel commands, navigation, "create" links, recent records, theme switching and the
 * shortcuts overlay. `variant="sidebar"` is the full-width field in the sidebar header
 * (`globalSearch(position: GlobalSearchPosition::Sidebar)`).
 */
export function GlobalSearch({ variant = 'topbar' }: { variant?: 'topbar' | 'sidebar' }) {
  const t = useT()
  const panel = usePanel()
  const hydrated = useHydrated()
  const [open, setOpen] = useState(false)
  // Undefined on the server and during hydration (nothing loads there), so the markup matches.
  const [Palette, setPalette] = useState<PaletteComponent | undefined>(() => loadedPalette)
  const config = panel.globalSearch
  const palette = panel.commandPalette
  const endpoint = config ? panel.endpoints.globalSearch : undefined
  const placeholder =
    config?.placeholder ??
    palette?.placeholder ??
    t('palette.placeholder', {}, 'Type a command or search…')
  // Without global search the palette still opens with ⌘K / Ctrl+K.
  const suffix = globalSearchSuffix(
    config ?? (palette ? { keyBindings: ['mod+k'], placeholder } : undefined),
  )
  const keys = JSON.stringify(config?.keyBindings ?? ['mod+k'])
  const label = t('shortcuts.open_palette', {}, 'Open the command palette')

  // The palette's key bindings (`globalSearchKeyBindings()`): essential, so they keep working
  // with `keyboardShortcuts(false)`; users may change them in the shortcuts overlay.
  useEffect(() => {
    if (!config && !palette) return

    return shortcuts.register({
      id: SHORTCUT_IDS.palette,
      keys: JSON.parse(keys) as string[],
      label,
      group: 'general',
      essential: true,
      handler: () => setOpen(true),
    })
  }, [config, palette, keys, label])

  // Opening before the code has arrived (a click or `mod+k` right after the page loads)
  // keeps `open` set; the palette mounts open once it has loaded.
  useEffect(() => {
    if (!open || Palette) return

    let active = true

    loadPalette().then(
      (component) => active && setPalette(() => component),
      () => active && setOpen(false),
    )

    return () => {
      active = false
    }
  }, [open, Palette])

  // A palette opened while its code was still loading closes when the page changes.
  useEffect(() => router.on('navigate', () => setOpen(false)), [])

  if ((!config || !endpoint) && !palette) {
    return null
  }

  return (
    <>
      <Slot name="global-search.before" />
      <Button
        type="button"
        variant="outline"
        size="sm"
        data-variant={variant}
        className={
          variant === 'sidebar'
            ? 'text-muted-foreground w-full justify-start gap-2 px-2.5 font-normal group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0'
            : 'text-muted-foreground size-8 justify-center gap-2 px-0 font-normal sm:w-56 sm:justify-start sm:px-2.5'
        }
        onClick={() => setOpen(true)}
        onPointerEnter={preloadPalette}
        onFocus={preloadPalette}
      >
        <Icon name="alfakit::panels.global-search.field" fallback={SearchIcon} className="size-4" />
        <span
          className={
            variant === 'sidebar'
              ? 'flex-1 truncate text-start group-data-[collapsible=icon]:sr-only'
              : 'sr-only sm:not-sr-only sm:flex-1 sm:text-start'
          }
        >
          {placeholder}
        </span>
        {/* `globalSearchFieldSuffix()`, or the first key binding: it depends on the visitor's
            platform (⌘ or Ctrl), so it renders after hydration. */}
        {suffix?.type === 'text' && (
          <span
            data-slot="global-search-suffix"
            className="text-muted-foreground hidden text-[10px] sm:inline"
          >
            {suffix.text}
          </span>
        )}
        {hydrated && suffix?.type === 'keyBinding' && (
          <kbd
            dir="ltr"
            className="bg-muted text-foreground/70 hidden rounded px-1 font-mono text-[10px] sm:inline"
          >
            {formatKeyBinding(suffix.keyBinding)}
          </kbd>
        )}
      </Button>
      <Slot name="global-search.after" />
      {/* The dialog's code loads on first open (click or shortcut); hovering or focusing the
          field fetches it ahead. Not rendered on the server, like the closed dialog before it. */}
      {Palette && <Palette open={open} onOpenChange={setOpen} />}
    </>
  )
}
