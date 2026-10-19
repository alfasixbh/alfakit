/** Context key: closes the enclosing `Popover` (set by Popover.svelte). */
export const POPOVER_CLOSE = Symbol('alfakit.popover.close')

/**
 * Whether a pointerdown should close a popover right away: outside its content, its
 * trigger and any other floating layer (a nested select's options are portaled).
 */
export function closesPopover(target: EventTarget | null, content: HTMLElement | null): boolean {
  if (!(target instanceof Element) || !content || !target.isConnected) return false
  if (content.contains(target)) return false

  const trigger = content.id ? document.querySelector(`[aria-controls="${content.id}"]`) : null

  if (trigger?.contains(target)) return false

  return !target.closest('[data-bits-floating-content-wrapper]')
}
