import { requestJson } from './http'
import {
  formatKeyBinding,
  isMacLike,
  parseKeyBinding,
  type ParsedKeyBinding,
} from './utils/keybindings'

/**
 * Keyboard shortcuts: a registry of everything bound on the current page (built-ins, panel
 * commands' `shortcut()`), with the user's customised keys, sequences (`g d`), platform
 * modifiers (`mod` = ⌘ on macOS, Ctrl elsewhere) and no triggering while typing.
 *
 * Bindings are data: a step is `[modifier+]…key`, a binding is up to three steps separated
 * by spaces. Nothing is ever evaluated.
 */

/** Ids of the built-in shortcuts. */
export const SHORTCUT_IDS = {
  palette: 'palette.open',
  search: 'search.focus',
  dashboard: 'go.dashboard',
  overlay: 'help.overlay',
} as const

/** Id of a panel command's shortcut. */
export function commandShortcutId(name: string): string {
  return `command:${name}`
}

export type ShortcutGroup = 'general' | 'navigation' | 'commands' | 'actions'

export interface ShortcutDefinition {
  /** Stable id; the user's customised keys are stored under it. */
  id: string
  /** Default bindings: `mod+k`, `?`, `g d`. */
  keys: string[]
  label: string
  group?: ShortcutGroup
  /** Return `false` when there was nothing to do: the key then keeps its default behaviour. */
  handler: (event: KeyboardEvent | null) => boolean | void
  /** Also while typing in a field (by default only bindings with Ctrl/⌘/Alt are). */
  allowInInputs?: boolean
  /** Keeps working when the panel turns shortcuts off (the palette's own key bindings). */
  essential?: boolean
  /** `false`: the overlay doesn't offer to change it. */
  customizable?: boolean
}

export interface RegisteredShortcut extends ShortcutDefinition {
  /** The keys in effect: the user's (an empty list = turned off) or the defaults. */
  keys: string[]
  defaultKeys: string[]
  customized: boolean
}

const MODIFIER_KEYS = new Set(['shift', 'control', 'alt', 'meta', 'os', 'altgraph', 'capslock'])

const STEP_PATTERN =
  /^(?:(?:mod|ctrl|control|meta|cmd|command|alt|option|shift)\+){0,4}(?:[a-z0-9]|f[1-9]|f1[0-2]|[/?.,;'[\]\\=`-]|escape|esc|enter|tab|space|backspace|delete|arrowup|arrowdown|arrowleft|arrowright|home|end|pageup|pagedown)$/

/** Whether a binding is well formed (the server applies the same rule). */
export function isValidShortcut(binding: string): boolean {
  if (binding === '' || binding.length > 60 || binding !== binding.toLowerCase()) {
    return false
  }

  const steps = binding.split(' ')

  return steps.length <= 3 && steps.every((step) => STEP_PATTERN.test(step))
}

/** Whether the event comes from a field the user is typing in. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as HTMLElement).tagName !== 'string') {
    return false
  }

  const element = target as HTMLElement

  if (
    element.isContentEditable ||
    element.closest?.('[contenteditable=""],[contenteditable="true"]')
  ) {
    return true
  }

  if (element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
    return true
  }

  if (element.tagName === 'INPUT') {
    const type = (element as HTMLInputElement).type
    return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file'].includes(
      type,
    )
  }

  return element.getAttribute('role') === 'textbox' || element.getAttribute('role') === 'combobox'
}

function parseSteps(binding: string): ParsedKeyBinding[] {
  return binding
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((step) => {
      const parsed = parseKeyBinding(step)

      return parsed.key === 'space' ? { ...parsed, key: ' ' } : parsed
    })
}

function hasModifier(step: ParsedKeyBinding | undefined): boolean {
  return Boolean(step && (step.mod || step.ctrl || step.meta || step.alt))
}

/**
 * Whether a keydown matches one step. Single punctuation keys (`?`, `/`) ignore Shift
 * unless the binding names it, since many layouts need Shift to type them.
 */
export function matchesShortcutStep(event: KeyboardEvent, step: ParsedKeyBinding): boolean {
  const key = (event.key ?? '').toLowerCase()
  const code = (event.code ?? '').toLowerCase()

  const keyMatches =
    key === step.key ||
    (step.key === 'escape' && key === 'esc') ||
    (/^[a-z]$/.test(step.key) && code === `key${step.key}`) ||
    (/^[0-9]$/.test(step.key) && code === `digit${step.key}`)

  if (!keyMatches) {
    return false
  }

  const mac = isMacLike()
  const wantsMeta = step.meta || (step.mod && mac)
  const wantsCtrl = step.ctrl || (step.mod && !mac)
  const punctuation = step.key.length === 1 && !/^[a-z0-9 ]$/.test(step.key)

  return (
    event.metaKey === wantsMeta &&
    event.ctrlKey === wantsCtrl &&
    event.altKey === step.alt &&
    (punctuation && !step.shift ? true : event.shiftKey === step.shift)
  )
}

/** The keys of a binding for display, one entry per step (`['G', 'D']`, `['⌘K']`). */
export function shortcutSteps(binding: string): string[] {
  return binding
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((step) => (step === '?' || step === '/' ? step : formatKeyBinding(step)))
}

/** A binding for display: steps separated by spaces. */
export function formatShortcut(binding: string): string {
  return shortcutSteps(binding).join(' ')
}

/**
 * The binding a keydown would record in the overlay ("press the new keys"), or null for a
 * lone modifier and keys a binding can't hold.
 */
export function bindingFromEvent(event: KeyboardEvent): string | null {
  const key = (event.key ?? '').toLowerCase()

  if (key === '' || MODIFIER_KEYS.has(key) || key === 'dead' || key === 'unidentified') {
    return null
  }

  const mac = isMacLike()
  const parts: string[] = []

  if (mac ? event.metaKey : event.ctrlKey) parts.push('mod')
  if (mac && event.ctrlKey) parts.push('ctrl')
  if (!mac && event.metaKey) parts.push('meta')
  if (event.altKey) parts.push('alt')

  const named = key === ' ' ? 'space' : key
  const punctuation = named.length === 1 && !/^[a-z0-9]$/.test(named)
  // Letters and digits from `code`, so Alt/Option combinations don't record `å`.
  const fromCode = /^key[a-z]$/.test(event.code?.toLowerCase() ?? '')
    ? event.code.toLowerCase().slice(3)
    : /^digit[0-9]$/.test(event.code?.toLowerCase() ?? '')
      ? event.code.toLowerCase().slice(5)
      : null
  const finalKey = event.altKey && fromCode ? fromCode : named

  if (event.shiftKey && !punctuation) parts.push('shift')

  parts.push(finalKey)

  const binding = parts.join('+')

  return isValidShortcut(binding) ? binding : null
}

/**
 * Whether two bindings can't both work: the same keys, or one is the start of the other's
 * sequence ("g" would run before "g o" could finish).
 */
export function shortcutsClash(a: string, b: string): boolean {
  const left = a.trim().toLowerCase().split(/\s+/)
  const right = b.trim().toLowerCase().split(/\s+/)
  const length = Math.min(left.length, right.length)

  return left.slice(0, length).every((step, index) => step === right[index])
}

/**
 * Records a new binding in the shortcuts overlay: a key (with modifiers) or a sequence of up
 * to `maxSteps` keys ("g o"). The binding is finished `timeout` ms after the last key (the
 * matcher's sequence timeout) or at `maxSteps`. Escape is the caller's (cancel).
 */
export class ShortcutRecorder {
  private steps: string[] = []

  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private readonly options: {
      onDone: (binding: string) => void
      onStep?: (steps: string[]) => void
      timeout?: number
      maxSteps?: number
    },
  ) {}

  /** Record a keydown; returns false for keys a binding can't hold (lone modifiers). */
  press(event: KeyboardEvent): boolean {
    const step = bindingFromEvent(event)

    if (!step) {
      return false
    }

    this.steps.push(step)
    this.options.onStep?.([...this.steps])
    this.clearTimer()

    if (this.steps.length >= (this.options.maxSteps ?? 3)) {
      this.finish()
    } else {
      this.timer = setTimeout(() => this.finish(), this.options.timeout ?? 1000)
    }

    return true
  }

  /** Stop without a binding. */
  cancel(): void {
    this.clearTimer()
    this.steps = []
  }

  private finish(): void {
    this.clearTimer()
    const binding = this.steps.join(' ')
    this.steps = []

    if (binding !== '') {
      this.options.onDone(binding)
    }
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }
}

export interface ShortcutRegistryOptions {
  /** Milliseconds between the keys of a sequence (default 1000). */
  sequenceTimeout?: number
}

interface PendingSequence {
  id: string
  steps: ParsedKeyBinding[]
  index: number
}

/**
 * The shortcuts of the current page. Renderers register in effects (never while server
 * rendering) and dispose on unmount; the registry listens on `window` while it has entries.
 */
export class ShortcutRegistry {
  private readonly entries = new Map<string, ShortcutDefinition>()
  private overrides: Record<string, string[]> = {}
  private enabled = true
  private paused = false
  private pending: PendingSequence[] = []
  private timer: ReturnType<typeof setTimeout> | null = null
  private readonly listeners = new Set<() => void>()
  private detach: (() => void) | null = null
  private version = 0

  constructor(private readonly options: ShortcutRegistryOptions = {}) {}

  /** Add (or replace) a shortcut. Returns a disposer that removes this registration only. */
  register(definition: ShortcutDefinition): () => void {
    this.entries.set(definition.id, definition)
    this.attach()
    this.changed()

    return () => {
      if (this.entries.get(definition.id) === definition) {
        this.entries.delete(definition.id)
        this.changed()

        if (this.entries.size === 0) {
          this.detach?.()
          this.detach = null
        }
      }
    }
  }

  has(id: string): boolean {
    return this.entries.has(id)
  }

  /** Run a shortcut's handler as if its keys were pressed (e.g. from the palette). */
  trigger(id: string): boolean {
    const entry = this.entries.get(id)

    if (!entry) return false

    entry.handler(null)

    return true
  }

  /** The user's customised keys by id (from `alfakit.keyboardShortcuts.overrides`). */
  setOverrides(overrides: Record<string, string[]> | null | undefined): void {
    const next: Record<string, string[]> = {}

    for (const [id, keys] of Object.entries(overrides ?? {})) {
      if (Array.isArray(keys)) next[id] = keys.filter((key) => isValidShortcut(key))
    }

    this.overrides = next
    this.changed()
  }

  getOverrides(): Record<string, string[]> {
    return { ...this.overrides }
  }

  /** `keyboardShortcuts(false)`: only essential shortcuts (the palette's key bindings) stay. */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    this.reset()
    this.changed()
  }

  isEnabled(): boolean {
    return this.enabled
  }

  /** Ignore keys while the overlay records a new binding. */
  setPaused(paused: boolean): void {
    this.paused = paused
    this.reset()
  }

  keysFor(id: string): string[] {
    const entry = this.entries.get(id)

    if (!entry) return []

    return this.overrides[id] ?? entry.keys
  }

  /** Every active shortcut with the keys in effect, in registration order. */
  list(): RegisteredShortcut[] {
    return [...this.entries.values()]
      .filter((entry) => this.enabled || entry.essential)
      .map((entry) => ({
        ...entry,
        keys: this.overrides[entry.id] ?? entry.keys,
        defaultKeys: entry.keys,
        customized: Object.prototype.hasOwnProperty.call(this.overrides, entry.id),
      }))
  }

  /** Another shortcut already using one of these keys. */
  conflict(keys: string[], exceptId?: string): RegisteredShortcut | undefined {
    return this.list().find(
      (entry) =>
        entry.id !== exceptId &&
        entry.keys.some((key) => keys.some((candidate) => shortcutsClash(key, candidate))),
    )
  }

  /** Re-render hook for the overlay; returns an unsubscribe function. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)

    return () => this.listeners.delete(listener)
  }

  /** Bumped on every change (for `useSyncExternalStore`-style snapshots). */
  getVersion(): number {
    return this.version
  }

  /** Handle a keydown; returns whether a shortcut ran or a sequence continues. */
  handleKeydown(event: KeyboardEvent): boolean {
    if (this.paused || event.defaultPrevented || event.isComposing) {
      return false
    }

    const key = (event.key ?? '').toLowerCase()

    if (MODIFIER_KEYS.has(key)) {
      return false
    }

    const editable = isEditableTarget(event.target)

    if (this.pending.length > 0) {
      const advanced = this.pending.filter((pending) =>
        matchesShortcutStep(event, pending.steps[pending.index]!),
      )
      const complete = advanced.find((pending) => pending.index + 1 === pending.steps.length)

      if (complete) {
        this.reset()
        return this.run(complete.id, event)
      }

      this.reset()

      if (advanced.length > 0) {
        this.pending = advanced.map((pending) => ({ ...pending, index: pending.index + 1 }))
        this.startTimer()
        event.preventDefault()

        return true
      }
    }

    const started: PendingSequence[] = []

    for (const entry of this.entries.values()) {
      if (!this.enabled && !entry.essential) continue

      for (const binding of this.overrides[entry.id] ?? entry.keys) {
        const steps = parseSteps(binding)
        const first = steps[0]

        if (!first || (editable && !entry.allowInInputs && !hasModifier(first))) continue
        if (!matchesShortcutStep(event, first)) continue

        if (steps.length === 1) {
          this.reset()
          return this.run(entry.id, event)
        }

        if (!event.repeat) started.push({ id: entry.id, steps, index: 1 })
      }
    }

    if (started.length > 0) {
      this.pending = started
      this.startTimer()

      return true
    }

    return false
  }

  private run(id: string, event: KeyboardEvent): boolean {
    const entry = this.entries.get(id)

    if (!entry) return false

    if (entry.handler(event) === false) return false

    event.preventDefault()

    return true
  }

  private startTimer(): void {
    if (this.timer) clearTimeout(this.timer)

    this.timer = setTimeout(() => this.reset(), this.options.sequenceTimeout ?? 1000)
  }

  private reset(): void {
    this.pending = []

    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  private attach(): void {
    if (this.detach || typeof window === 'undefined') return

    const listener = (event: KeyboardEvent) => {
      this.handleKeydown(event)
    }

    window.addEventListener('keydown', listener)
    this.detach = () => window.removeEventListener('keydown', listener)
  }

  private changed(): void {
    this.version++

    for (const listener of this.listeners) listener()
  }
}

/**
 * The page's shortcut registry. Only touched from effects and event handlers, so a server
 * render never shares state between requests.
 */
export const shortcuts = new ShortcutRegistry()

/**
 * Store customised keys (`null` restores the default, `[]` turns the shortcut off) and
 * return every stored override.
 */
export async function saveShortcutOverrides(
  endpoint: string,
  changes: Record<string, string[] | null>,
): Promise<Record<string, string[]>> {
  const response = await requestJson<{ shortcuts: Record<string, string[]> }>(endpoint, {
    method: 'POST',
    body: { shortcuts: changes },
  })

  return response.shortcuts ?? {}
}

/** Focus the page's table search field (`/`). Returns whether one was found. */
export function focusTableSearch(
  root: ParentNode | null = typeof document === 'undefined' ? null : document,
): boolean {
  const content = root?.querySelector('[data-slot="content"]') ?? root
  const input = content?.querySelector<HTMLInputElement>('input[type="search"]:not([disabled])')

  if (!input) return false

  input.focus()
  input.select?.()

  return true
}

export interface ShortcutListItem {
  id: string
  label: string
  keys: string[]
  defaultKeys: string[]
  customized: boolean
  customizable: boolean
}

export interface ShortcutListGroup {
  group: ShortcutGroup
  items: ShortcutListItem[]
}

const GROUP_ORDER: ShortcutGroup[] = ['general', 'navigation', 'commands', 'actions']

/**
 * What the overlay lists: registered shortcuts plus the page's action key bindings
 * (`keyBindings()`, listed only), grouped and in a stable order.
 */
export function shortcutOverlayGroups(
  registered: RegisteredShortcut[],
  actions: Array<{
    name: string
    label?: string | null
    keyBindings?: string[]
    disabled?: boolean
  }> = [],
): ShortcutListGroup[] {
  const groups = new Map<ShortcutGroup, ShortcutListItem[]>()
  const add = (group: ShortcutGroup, item: ShortcutListItem) => {
    groups.set(group, [...(groups.get(group) ?? []), item])
  }

  for (const entry of registered) {
    add(entry.group ?? 'general', {
      id: entry.id,
      label: entry.label,
      keys: entry.keys,
      defaultKeys: entry.defaultKeys,
      customized: entry.customized,
      customizable: entry.customizable !== false,
    })
  }

  for (const action of actions) {
    if (!action.keyBindings?.length || action.disabled) continue

    add('actions', {
      id: `action:${action.name}`,
      label: action.label ?? action.name,
      keys: action.keyBindings,
      defaultKeys: action.keyBindings,
      customized: false,
      customizable: false,
    })
  }

  return GROUP_ORDER.filter((group) => groups.has(group)).map((group) => ({
    group,
    items: groups.get(group)!,
  }))
}
