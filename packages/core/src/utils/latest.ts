/**
 * Runs async requests so that only the most recent one is applied. Starting a new
 * request (or calling `cancel()`) aborts the previous one and drops its result, so a
 * slow response for an old search term can never overwrite a newer one.
 */
export interface LatestRequest {
  run<T>(
    request: (signal: AbortSignal) => Promise<T>,
    onResult: (value: T) => void,
    onSettled?: () => void,
  ): Promise<void>
  cancel(): void
}

export function createLatestRequest(): LatestRequest {
  let controller: AbortController | null = null
  let generation = 0

  const cancel = () => {
    generation++
    controller?.abort()
    controller = null
  }

  return {
    cancel,
    async run(request, onResult, onSettled) {
      cancel()
      const current = generation
      const own = new AbortController()
      controller = own

      try {
        const value = await request(own.signal)

        if (current === generation) {
          onResult(value)
        }
      } catch (error) {
        if (current === generation && !own.signal.aborted) {
          throw error
        }
      } finally {
        if (current === generation) {
          controller = null
          onSettled?.()
        }
      }
    },
  }
}
