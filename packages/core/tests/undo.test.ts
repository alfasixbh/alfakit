import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as Http from '../src/http'
import { bindUndo, isUndoShortcut, startUndoCountdown, UndoShortcuts } from '../src/undo'

const visits: Array<{ url: string; data: unknown }> = []

vi.mock('../src/http', async (importOriginal) => {
  const original = await importOriginal<typeof Http>()

  return {
    ...original,
    router: {
      post: (url: string, data: unknown, options: { onFinish?: () => void }) => {
        visits.push({ url, data })
        options.onFinish?.()
      },
    },
  }
})

const press = (init: KeyboardEventInit, target: EventTarget = window) => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)

  return event
}

describe('undo', () => {
  beforeEach(() => {
    visits.length = 0
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('recognises Ctrl+Z and Cmd+Z only', () => {
    expect(isUndoShortcut(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))).toBe(true)
    expect(isUndoShortcut(new KeyboardEvent('keydown', { key: 'Z', metaKey: true }))).toBe(true)
    expect(
      isUndoShortcut(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true })),
    ).toBe(false)
    expect(isUndoShortcut(new KeyboardEvent('keydown', { key: 'z' }))).toBe(false)
  })

  it('counts down and ends the offer', () => {
    const ticks: number[] = []
    const done = vi.fn()

    startUndoCountdown(3, (remaining) => ticks.push(remaining), done)
    vi.advanceTimersByTime(3000)

    expect(ticks).toEqual([3, 2, 1, 0])
    expect(done).toHaveBeenCalledTimes(1)
  })

  it('runs the newest offer on Ctrl/Cmd+Z, but not while typing in a field', () => {
    const shortcuts = new UndoShortcuts()
    const first = vi.fn()
    const second = vi.fn()

    shortcuts.register('a', first)
    shortcuts.register('b', second)

    const input = document.createElement('input')
    document.body.append(input)
    press({ key: 'z', ctrlKey: true }, input)
    expect(second).not.toHaveBeenCalled()

    const event = press({ key: 'z', metaKey: true })
    expect(event.defaultPrevented).toBe(true)
    expect(second).toHaveBeenCalledTimes(1)
    expect(first).not.toHaveBeenCalled()
    expect(shortcuts.size).toBe(1)

    shortcuts.unregister('a')
    press({ key: 'z', ctrlKey: true })
    expect(first).not.toHaveBeenCalled()
    input.remove()
  })

  it('posts the token once and closes the toast', async () => {
    const onClose = vi.fn()
    const binding = bindUndo(
      'n1',
      { token: 'tok', seconds: 8, url: '/_alfakit/actions/undo' },
      { onTick: () => {}, onClose },
    )

    await binding.undo()
    await binding.undo()

    expect(visits).toEqual([{ url: '/_alfakit/actions/undo', data: { undo: 'tok' } }])
    expect(onClose).toHaveBeenCalledTimes(1)

    // The shortcut was withdrawn with it.
    press({ key: 'z', ctrlKey: true })
    expect(visits).toHaveLength(1)
  })

  it('closes the toast when the countdown ends without undoing', () => {
    const onClose = vi.fn()

    bindUndo('n2', { token: 'tok', seconds: 2, url: '/undo' }, { onTick: () => {}, onClose })
    vi.advanceTimersByTime(2000)

    expect(onClose).toHaveBeenCalledTimes(1)
    press({ key: 'z', ctrlKey: true })
    expect(visits).toHaveLength(0)
  })
})
