import { describe, expect, it } from 'vitest'
import { createLatestRequest } from '../src/utils/latest'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => (resolve = done))

  return { promise, resolve }
}

describe('createLatestRequest', () => {
  it('drops responses that arrive after a newer request started', async () => {
    const latest = createLatestRequest()
    const results: string[] = []
    const slow = deferred<string>()
    const fast = deferred<string>()
    let firstSignal: AbortSignal | null = null

    const first = latest.run(
      (signal) => {
        firstSignal = signal

        return slow.promise
      },
      (value) => results.push(value),
    )
    const second = latest.run(
      () => fast.promise,
      (value) => results.push(value),
    )

    fast.resolve('new')
    await second
    slow.resolve('old')
    await first

    expect(results).toEqual(['new'])
    expect(firstSignal!.aborted).toBe(true)
  })

  it('ignores the result of a cancelled request and only settles the current one', async () => {
    const latest = createLatestRequest()
    const results: string[] = []
    let settled = 0
    const pending = deferred<string>()

    const run = latest.run(
      () => pending.promise,
      (value) => results.push(value),
      () => settled++,
    )
    latest.cancel()
    pending.resolve('late')
    await run

    expect(results).toEqual([])
    expect(settled).toBe(0)
  })

  it('rethrows errors from the current request', async () => {
    const latest = createLatestRequest()

    await expect(
      latest.run(
        () => Promise.reject(new Error('boom')),
        () => undefined,
      ),
    ).rejects.toThrow('boom')
  })
})
