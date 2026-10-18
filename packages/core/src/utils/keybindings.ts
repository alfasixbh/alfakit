/**
 * Parse `mod+s`-style bindings (mod = ⌘ on macOS, Ctrl elsewhere) and match keyboard events.
 */
export interface ParsedKeyBinding {
  key: string
  mod: boolean
  ctrl: boolean
  meta: boolean
  alt: boolean
  shift: boolean
}

export function parseKeyBinding(binding: string): ParsedKeyBinding {
  const parts = binding
    .toLowerCase()
    .split('+')
    .map((part) => part.trim())
  const key = parts.pop() ?? ''

  return {
    key: key === 'esc' ? 'escape' : key,
    mod: parts.includes('mod'),
    ctrl: parts.includes('ctrl') || parts.includes('control'),
    meta: parts.includes('meta') || parts.includes('cmd') || parts.includes('command'),
    alt: parts.includes('alt') || parts.includes('option'),
    shift: parts.includes('shift'),
  }
}

export function isMacLike(): boolean {
  // Node has a `navigator` too (reporting the server's platform), so a server render must
  // not consult it: renderers show shortcut hints only after hydration.
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false
  }

  return /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent)
}

export function matchesKeyBinding(
  event: KeyboardEvent,
  binding: string | ParsedKeyBinding,
): boolean {
  const parsed = typeof binding === 'string' ? parseKeyBinding(binding) : binding
  const key = event.key.toLowerCase()

  if (key !== parsed.key && event.code.toLowerCase() !== `key${parsed.key}`) {
    return false
  }

  const mac = isMacLike()
  const wantsMeta = parsed.meta || (parsed.mod && mac)
  const wantsCtrl = parsed.ctrl || (parsed.mod && !mac)

  return (
    event.metaKey === wantsMeta &&
    event.ctrlKey === wantsCtrl &&
    event.altKey === parsed.alt &&
    event.shiftKey === parsed.shift
  )
}

export function formatKeyBinding(binding: string): string {
  const parsed = parseKeyBinding(binding)
  const mac = isMacLike()
  const parts: string[] = []

  if (parsed.mod) parts.push(mac ? '⌘' : 'Ctrl')
  if (parsed.ctrl) parts.push(mac ? '⌃' : 'Ctrl')
  if (parsed.meta && !parsed.mod) parts.push(mac ? '⌘' : 'Win')
  if (parsed.alt) parts.push(mac ? '⌥' : 'Alt')
  if (parsed.shift) parts.push(mac ? '⇧' : 'Shift')

  parts.push(
    parsed.key.length === 1
      ? parsed.key.toUpperCase()
      : parsed.key.charAt(0).toUpperCase() + parsed.key.slice(1),
  )

  return parts.join(mac ? '' : '+')
}

/**
 * Register global key bindings. Returns a disposer. Bindings inside inputs are ignored
 * unless they include a modifier.
 */
export function registerKeyBindings(
  bindings: Array<{ keys: string[]; handler: (event: KeyboardEvent) => void }>,
): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const parsed = bindings.map((binding) => ({
    ...binding,
    parsed: binding.keys.map(parseKeyBinding),
  }))

  const listener = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null
    const inEditable =
      target !== null &&
      (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

    for (const binding of parsed) {
      for (const key of binding.parsed) {
        const hasModifier = key.mod || key.ctrl || key.meta || key.alt

        if (inEditable && !hasModifier) {
          continue
        }

        if (matchesKeyBinding(event, key)) {
          event.preventDefault()
          binding.handler(event)

          return
        }
      }
    }
  }

  window.addEventListener('keydown', listener)

  return () => window.removeEventListener('keydown', listener)
}
