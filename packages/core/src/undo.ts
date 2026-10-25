import { router } from './http'
import type { NotificationUndoSchema } from './schema/notifications'
import { isEditableTarget } from './shortcuts'

/**
 * The "Undo" button of `Action::undoable()` toasts: a countdown, the undo request and the
 * Ctrl/Cmd+Z shortcut (while a toast offers undo and focus is not in a text field).
 */

/** Send the undo request; the answer (an Inertia redirect back) flashes its notification. */
export function performUndo(undo: NotificationUndoSchema): Promise<void> {
  return new Promise((resolve) => {
    if (!undo.url) {
      resolve()

      return
    }

    router.post(
      undo.url,
      { undo: undo.token },
      { preserveScroll: true, preserveState: true, onFinish: () => resolve() },
    )
  })
}

/**
 * Count down from `seconds`, calling `onTick` with the seconds left (right away, then once
 * a second) and `onDone` at zero. Returns a function that stops it.
 */
export function startUndoCountdown(
  seconds: number,
  onTick: (remaining: number) => void,
  onDone?: () => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const ends = Date.now() + seconds * 1000
  let stopped = false

  onTick(Math.max(0, seconds))

  const timer = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((ends - Date.now()) / 1000))

    onTick(remaining)

    if (remaining === 0) {
      stop()
      onDone?.()
    }
  }, 1000)

  function stop(): void {
    if (!stopped) {
      stopped = true
      clearInterval(timer)
    }
  }

  return stop
}

/** Ctrl+Z (Cmd+Z on macOS), without Shift or Alt. */
export function isUndoShortcut(event: KeyboardEvent): boolean {
  return (
    (event.ctrlKey || event.metaKey) &&
    !event.shiftKey &&
    !event.altKey &&
    event.key.toLowerCase() === 'z'
  )
}

/**
 * The toasts that offer undo right now. Ctrl/Cmd+Z undoes the newest one, unless focus is
 * in a field (where it undoes typing).
 */
export class UndoShortcuts {
  private readonly entries: Array<{ id: string; run: () => void }> = []

  private listening = false

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || !isUndoShortcut(event) || isEditableTarget(event.target)) {
      return
    }

    const entry = this.entries.at(-1)

    if (!entry) {
      return
    }

    event.preventDefault()
    this.unregister(entry.id)
    entry.run()
  }

  /** Offer `run` for Ctrl/Cmd+Z; returns a function that withdraws it. */
  register(id: string, run: () => void): () => void {
    this.unregister(id)
    this.entries.push({ id, run })
    this.listen()

    return () => this.unregister(id)
  }

  unregister(id: string): void {
    const index = this.entries.findIndex((entry) => entry.id === id)

    if (index !== -1) {
      this.entries.splice(index, 1)
    }

    if (this.entries.length === 0) {
      this.stopListening()
    }
  }

  get size(): number {
    return this.entries.length
  }

  private listen(): void {
    if (this.listening || typeof window === 'undefined') {
      return
    }

    this.listening = true
    window.addEventListener('keydown', this.onKeyDown)
  }

  private stopListening(): void {
    if (!this.listening || typeof window === 'undefined') {
      return
    }

    this.listening = false
    window.removeEventListener('keydown', this.onKeyDown)
  }
}

/** The browser-wide registry the renderers' undo buttons share. */
export const undoShortcuts = new UndoShortcuts()

/**
 * Undo tokens whose offer ended (used or expired) in this browser tab. A toast whose button
 * mounts again (the toaster re-rendering it while it closes, another toast arriving) must
 * not offer a used token to Ctrl/Cmd+Z again.
 */
const finishedUndoTokens = new Set<string>()

/** Whether the offer with this token was used or expired. */
export function isUndoFinished(undo: Pick<NotificationUndoSchema, 'token'>): boolean {
  return finishedUndoTokens.has(undo.token)
}

/**
 * Wire one toast's undo button: the countdown, the shortcut and the request. `onTick` gets
 * the seconds left; `onClose` runs when the offer ends (undone or expired) so the toast can
 * close. Returns `{ undo, stop }`.
 */
export function bindUndo(
  id: string,
  undo: NotificationUndoSchema,
  handlers: {
    onTick: (remaining: number) => void
    onClose: () => void
    onBusy?: (busy: boolean) => void
  },
): { undo: () => Promise<void>; stop: () => void } {
  if (isUndoFinished(undo)) {
    handlers.onTick(0)
    handlers.onClose()

    return { undo: async () => {}, stop: () => {} }
  }

  let done = false
  let stopCountdown: () => void = () => {}
  let withdraw: () => void = () => {}

  const stop = (): void => {
    stopCountdown()
    withdraw()
  }

  const run = async (): Promise<void> => {
    if (done) {
      return
    }

    done = true
    finishedUndoTokens.add(undo.token)
    stop()
    handlers.onBusy?.(true)

    try {
      await performUndo(undo)
    } finally {
      handlers.onBusy?.(false)
      handlers.onClose()
    }
  }

  stopCountdown = startUndoCountdown(undo.seconds, handlers.onTick, () => {
    if (!done) {
      done = true
      finishedUndoTokens.add(undo.token)
      withdraw()
      handlers.onClose()
    }
  })
  withdraw = undoShortcuts.register(id, () => void run())

  return { undo: run, stop }
}
