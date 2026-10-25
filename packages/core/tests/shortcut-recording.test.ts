import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShortcutRecorder, ShortcutRegistry, shortcutsClash } from '../src/shortcuts'

/*
 * W-V1-09: a binding that starts another one's sequence ("g" and "g o") shadows it, and the
 * overlay must be able to record sequences.
 */

const key = (k: string, init: KeyboardEventInit = {}) =>
  new KeyboardEvent('keydown', {
    key: k,
    code: /^[a-z]$/.test(k) ? `Key${k.toUpperCase()}` : '',
    ...init,
  })

describe('shortcut conflicts', () => {
  it('treats a binding that starts another sequence as a conflict', () => {
    expect(shortcutsClash('g', 'g o')).toBe(true)
    expect(shortcutsClash('g o', 'g')).toBe(true)
    expect(shortcutsClash('g o', 'g o')).toBe(true)
    expect(shortcutsClash('g o', 'g d')).toBe(false)
    expect(shortcutsClash('mod+k', 'k')).toBe(false)

    const registry = new ShortcutRegistry()
    const dispose = registry.register({
      id: 'orders',
      keys: ['g o'],
      label: 'Open orders',
      handler: () => {},
    })

    expect(registry.conflict(['g'], 'dashboard')?.id).toBe('orders')
    expect(registry.conflict(['g h'], 'dashboard')).toBeUndefined()
    dispose()
  })
})

describe('shortcut recorder', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('records a sequence until the keys stop', () => {
    const onDone = vi.fn()
    const recorder = new ShortcutRecorder({ onDone, timeout: 1000 })

    recorder.press(key('g'))
    vi.advanceTimersByTime(500)
    recorder.press(key('h'))
    expect(onDone).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1000)
    expect(onDone).toHaveBeenCalledWith('g h')
  })

  it('finishes at three steps, ignores lone modifiers and can be cancelled', () => {
    const onDone = vi.fn()
    const recorder = new ShortcutRecorder({ onDone })

    expect(recorder.press(key('Shift', { shiftKey: true }))).toBe(false)
    recorder.press(key('a'))
    recorder.press(key('b'))
    recorder.press(key('c'))
    expect(onDone).toHaveBeenCalledWith('a b c')

    recorder.press(key('k', { ctrlKey: true }))
    recorder.cancel()
    vi.advanceTimersByTime(2000)
    expect(onDone).toHaveBeenCalledTimes(1)
  })
})
