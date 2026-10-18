/**
 * Keyboard access to the RichEditor toolbars (WAI-ARIA toolbar pattern), shared by every
 * renderer because it only touches the DOM:
 *
 * - one tab stop per toolbar (roving `tabindex`), remembered while the buttons re-render;
 * - ArrowLeft / ArrowRight (swapped right to left), ArrowUp / ArrowDown, Home and End move
 *   between the enabled buttons;
 * - Escape returns to the editor;
 * - Alt+F10 in the editor (or a toolbar) moves to the floating toolbar, else the main one,
 *   and cycles between them.
 *
 * Buttons inside open menus (`[role="menu"]`) and disabled or hidden ones are skipped.
 */

/** The toolbar items keyboard navigation moves between. */
const ITEM_SELECTOR = 'button, input, select, [role="button"], [tabindex]'

export interface ToolbarKeyboardOptions {
  /** Focus the editor (Escape). */
  onEscape: () => void
  /** The other toolbars Alt+F10 cycles through, in order (this one included). */
  toolbars?: () => Array<HTMLElement | null | undefined>
}

function isVisible(element: HTMLElement): boolean {
  if (element.hidden || element.closest('[hidden]')) return false
  if (typeof getComputedStyle !== 'function') return true

  const style = getComputedStyle(element)

  return style.display !== 'none' && style.visibility !== 'hidden'
}

/** The enabled, visible items of a toolbar (not those of nested menus or toolbars). */
export function toolbarItems(toolbar: HTMLElement): HTMLElement[] {
  return Array.from(toolbar.querySelectorAll<HTMLElement>(ITEM_SELECTOR)).filter(
    (item) =>
      item.closest('[role="toolbar"]') === toolbar &&
      !item.closest('[role="menu"]') &&
      !item.hasAttribute('data-toolbar-skip') &&
      !(item as HTMLButtonElement).disabled &&
      item.getAttribute('aria-disabled') !== 'true' &&
      isVisible(item),
  )
}

/** Whether the element (or its nearest `dir` ancestor) is laid out right to left. */
export function isRightToLeft(element: HTMLElement): boolean {
  const dir = element.closest('[dir]')?.getAttribute('dir')

  if (dir === 'rtl' || dir === 'ltr') return dir === 'rtl'

  return typeof getComputedStyle === 'function' && getComputedStyle(element).direction === 'rtl'
}

/** Alt+F10 (without other modifiers): the shortcut into the toolbars. */
export function isToolbarShortcut(
  event: Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'>,
): boolean {
  return event.key === 'F10' && event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey
}

/**
 * Keep exactly one item tabbable: `active` (or the remembered one, else the first). The
 * remembered item is the one marked `data-toolbar-active`, so it survives re-renders.
 */
export function syncToolbarTabStops(
  toolbar: HTMLElement,
  active?: HTMLElement | null,
): HTMLElement | null {
  const items = toolbarItems(toolbar)
  const remembered = toolbar.querySelector<HTMLElement>('[data-toolbar-active]')
  const current =
    (active && items.includes(active) ? active : null) ??
    (remembered && items.includes(remembered) ? remembered : null) ??
    items[0] ??
    null

  for (const item of Array.from(toolbar.querySelectorAll<HTMLElement>(ITEM_SELECTOR))) {
    if (item.closest('[role="toolbar"]') !== toolbar || item.closest('[role="menu"]')) continue

    item.tabIndex = item === current ? 0 : -1

    if (item === current) item.setAttribute('data-toolbar-active', '')
    else item.removeAttribute('data-toolbar-active')
  }

  return current
}

/**
 * Focus the first toolbar (in order) that has an item: its remembered item. Returns false
 * when none can take focus.
 */
export function focusToolbar(toolbars: Array<HTMLElement | null | undefined>): boolean {
  for (const toolbar of toolbars) {
    if (!toolbar?.isConnected) continue

    const item = syncToolbarTabStops(toolbar)

    if (item) {
      item.focus()

      return true
    }
  }

  return false
}

/** The item a navigation key moves to, or null for other keys. */
export function nextToolbarItem(
  items: HTMLElement[],
  current: HTMLElement,
  key: string,
  rtl: boolean,
): HTMLElement | null {
  const index = items.indexOf(current)

  if (items.length === 0) return null

  const step = (offset: number) =>
    items[(Math.max(index, 0) + offset + items.length) % items.length] ?? null

  switch (key) {
    case 'ArrowRight':
      return step(rtl ? -1 : 1)
    case 'ArrowLeft':
      return step(rtl ? 1 : -1)
    case 'ArrowDown':
      return step(1)
    case 'ArrowUp':
      return step(-1)
    case 'Home':
      return items[0] ?? null
    case 'End':
      return items[items.length - 1] ?? null
    default:
      return null
  }
}

/**
 * Make `toolbar` keyboard navigable. Returns the cleanup. Safe to call on the server (does
 * nothing without a DOM).
 */
export function attachToolbarKeyboard(
  toolbar: HTMLElement,
  options: ToolbarKeyboardOptions,
): () => void {
  if (typeof document === 'undefined') return () => {}

  const onKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null

    if (event.defaultPrevented || !target || target.closest('[role="menu"]')) return
    if (target.closest('[role="toolbar"]') !== toolbar) return

    if (isToolbarShortcut(event)) {
      const toolbars = (options.toolbars?.() ?? []).filter((candidate): candidate is HTMLElement =>
        Boolean(candidate?.isConnected),
      )
      const index = toolbars.indexOf(toolbar)
      const ordered = [...toolbars.slice(index + 1), ...toolbars.slice(0, Math.max(index, 0))]

      if (focusToolbar(ordered)) event.preventDefault()

      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      options.onEscape()

      return
    }

    // Text inputs (the colour picker) keep their own arrow keys.
    if (target instanceof HTMLInputElement && target.type !== 'color' && target.type !== 'button')
      return

    const next = nextToolbarItem(toolbarItems(toolbar), target, event.key, isRightToLeft(toolbar))

    if (!next) return

    event.preventDefault()
    syncToolbarTabStops(toolbar, next)
    next.focus()
  }

  const onFocusIn = (event: FocusEvent) => {
    const target = event.target as HTMLElement | null

    if (target && toolbarItems(toolbar).includes(target)) syncToolbarTabStops(toolbar, target)
  }

  // Buttons appear, disappear and get disabled as the selection moves.
  const observer =
    typeof MutationObserver === 'undefined'
      ? null
      : new MutationObserver(() => {
          const active = toolbar.contains(document.activeElement)
            ? (document.activeElement as HTMLElement)
            : null

          syncToolbarTabStops(toolbar, active)
        })

  toolbar.addEventListener('keydown', onKeyDown)
  toolbar.addEventListener('focusin', onFocusIn)
  observer?.observe(toolbar, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['disabled', 'aria-disabled', 'hidden'],
  })
  syncToolbarTabStops(toolbar)

  return () => {
    toolbar.removeEventListener('keydown', onKeyDown)
    toolbar.removeEventListener('focusin', onFocusIn)
    observer?.disconnect()
  }
}
