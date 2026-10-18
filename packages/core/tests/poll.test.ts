import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PollScheduler, mergePolledComponents } from '../src/poll'
import type { PageSchema } from '../src/schema'

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('PollScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setVisibility('visible')
  })

  afterEach(() => vi.useRealTimers())

  it('coalesces components with the same interval into one request', async () => {
    const request = vi.fn().mockResolvedValue(undefined)
    const scheduler = new PollScheduler(request)

    const stopA = scheduler.subscribe('table', '5s')
    const stopB = scheduler.subscribe('widget:stats', 5000)
    const stopC = scheduler.subscribe('widget:chart', '10s')

    await vi.advanceTimersByTimeAsync(5000)

    expect(request).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledWith(['table', 'widget:stats'])

    await vi.advanceTimersByTimeAsync(5000)

    expect(request).toHaveBeenCalledTimes(3)
    expect(request).toHaveBeenCalledWith(['widget:chart'])

    stopA()
    stopB()
    stopC()
    await vi.advanceTimersByTimeAsync(20000)

    expect(request).toHaveBeenCalledTimes(3)
  })

  it('pauses while the tab is hidden and catches up when it is visible again', async () => {
    const request = vi.fn().mockResolvedValue(undefined)
    const scheduler = new PollScheduler(request)
    const stop = scheduler.subscribe('table', '5s')

    setVisibility('hidden')
    await vi.advanceTimersByTimeAsync(30000)

    expect(request).not.toHaveBeenCalled()

    setVisibility('visible')
    await vi.advanceTimersByTimeAsync(0)

    expect(request).toHaveBeenCalledTimes(1)

    stop()
  })

  it('skips a tick while the previous request is still running', async () => {
    let finish: () => void = () => {}
    const request = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)))
    const scheduler = new PollScheduler(request)
    const stop = scheduler.subscribe('table', '1s')

    await vi.advanceTimersByTimeAsync(3000)

    expect(request).toHaveBeenCalledTimes(1)

    finish()
    await vi.advanceTimersByTimeAsync(1000)

    expect(request).toHaveBeenCalledTimes(2)

    stop()
  })

  it('ignores components without an interval', () => {
    const request = vi.fn()
    const scheduler = new PollScheduler(request)

    scheduler.subscribe('table', null)()
    vi.advanceTimersByTime(60000)

    expect(request).not.toHaveBeenCalled()
  })
})

describe('mergePolledComponents', () => {
  const form = { type: 'Form', key: 'form', components: [] }
  const page = {
    class: 'P',
    layout: 'app',
    title: 'P',
    token: 't',
    content: [
      form,
      { type: 'Table', key: 'table', component: 'table', records: [] },
      {
        type: 'Widgets',
        key: 'widgets',
        columns: { default: 1 },
        widgets: [
          { type: 'Chart', key: 'chart', id: 'chart', data: { old: true } },
          { type: 'TableWidget', key: 'latest', id: 'latest', component: 'widget:App\\Latest' },
        ],
      },
      {
        type: 'RelationManagers',
        key: 'relationManagers',
        managers: [{ type: 'RelationManager', key: 'rm', component: 'relationManager:App\\Rm' }],
      },
    ],
  } as unknown as PageSchema

  it('replaces polled components and keeps the identity of everything else', () => {
    const merged = mergePolledComponents(page, {
      'widget:chart': { type: 'Chart', key: 'chart', id: 'chart', data: { fresh: true } },
      'widget:App\\Latest': { type: 'TableWidget', key: 'latest', id: 'latest', fresh: true },
      'relationManager:App\\Rm': { type: 'RelationManager', key: 'rm', fresh: true },
    } as never)

    const widgets = merged.content[2] as unknown as { widgets: Record<string, unknown>[] }
    const managers = merged.content[3] as unknown as { managers: Record<string, unknown>[] }

    expect(merged).not.toBe(page)
    expect(merged.content[0]).toBe(form)
    expect(merged.content[1]).toBe(page.content[1])
    expect(widgets.widgets[0]!.data).toEqual({ fresh: true })
    expect(widgets.widgets[1]!.fresh).toBe(true)
    expect(managers.managers[0]!.fresh).toBe(true)
  })

  it('replaces the page table', () => {
    const fresh = { type: 'Table', key: 'table', component: 'table', records: [{ key: 1 }] }
    const merged = mergePolledComponents(page, { table: fresh } as never)

    expect(merged.content[1]).toBe(fresh)
    expect(merged.content[2]).toBe(page.content[2])
  })

  it('returns the same page when nothing matched', () => {
    expect(mergePolledComponents(page, { 'widget:missing': {} } as never)).toBe(page)
  })
})
