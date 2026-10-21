export interface Debounced<TArgs extends unknown[]> {
  (...args: TArgs): void
  cancel: () => void
  flush: () => void
  /** A call is waiting for its timer. */
  readonly pending: boolean
}

export function debounce<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  wait: number,
): Debounced<TArgs> {
  let timer: ReturnType<typeof setTimeout> | null = null
  let pending: TArgs | null = null

  const debounced = ((...args: TArgs) => {
    pending = args

    if (timer !== null) {
      clearTimeout(timer)
    }

    timer = setTimeout(() => {
      timer = null
      const current = pending
      pending = null

      if (current) {
        callback(...current)
      }
    }, wait)
  }) as Debounced<TArgs>

  debounced.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }

    pending = null
  }

  Object.defineProperty(debounced, 'pending', { get: () => timer !== null && pending !== null })

  debounced.flush = () => {
    if (timer !== null && pending) {
      clearTimeout(timer)
      timer = null
      const current = pending
      pending = null
      callback(...current)
    }
  }

  return debounced
}
