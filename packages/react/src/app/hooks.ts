import {
  firstErrors,
  getPageForm,
  onPageFormsChanged,
  PageMethodError,
  registerShortcut,
  reloadPageProps,
  runPageMethod,
  watchPageProps,
  type FormState,
  type FormStore,
  type LivePropsOptions,
  type PageMethodArguments,
  type PageMethodCallOptions,
  type PageMethodRuntime,
  type ShortcutOptions,
} from '@alfakit/core'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { showToast } from '../components/notifications/flash-toasts'
import { usePageSchema, usePanel, useT } from '../context'

/**
 * Hooks for custom page components (`Page::$component`): call `#[Expose]` methods, reload
 * and watch view data, keyboard shortcuts, and the state of embedded `<PageForm>`s.
 */

function useRuntime(): () => PageMethodRuntime {
  const page = usePageSchema()
  const panel = usePanel()
  const t = useT()
  const latest = useRef({ page, panel, t })

  useEffect(() => {
    latest.current = { page, panel, t }
  })

  // The token is re-issued with every response, so it is read when the call starts.
  return useCallback(
    () => ({
      token: latest.current.page?.token ?? '',
      panel: latest.current.panel,
      page: latest.current.page,
      showToast: (notification) => showToast(notification),
      t: latest.current.t,
    }),
    [],
  )
}

export interface UsePageMethodOptions<TResult, TArgs> extends PageMethodCallOptions<TArgs> {
  onSuccess?: (result: TResult, args: TArgs | undefined) => void
  onError?: (error: unknown, args: TArgs | undefined) => void
}

export interface PageMethodBinding<TResult, TArgs> {
  /** Call the method. Resolves with its result, or `undefined` when it failed. */
  call: (args?: TArgs, options?: PageMethodCallOptions<TArgs>) => Promise<TResult | undefined>
  /** Like `call`, but rejects with the error (`PageMethodError`) when it fails. */
  callOrThrow: (args?: TArgs, options?: PageMethodCallOptions<TArgs>) => Promise<TResult>
  loading: boolean
  result: TResult | undefined
  error: unknown
  /** Validation errors of the last call, first message per key (`{ sku: '…' }`). */
  errors: Record<string, string>
  reset: () => void
}

/**
 * Call one `#[Expose]` method of the page:
 *
 * ```tsx
 * const checkout = usePageMethod<Order, { items: CartLine[] }>('checkout', { forms: ['customer'] })
 * <Button disabled={checkout.loading} onClick={() => checkout.call({ items })}>Charge</Button>
 * ```
 *
 * Notifications are shown as toasts, redirects followed, `reloadProps()` applied.
 */
export function usePageMethod<
  TResult = unknown,
  TArgs extends PageMethodArguments = Record<string, unknown>,
>(
  method: string,
  options: UsePageMethodOptions<TResult, TArgs> = {},
): PageMethodBinding<TResult, TArgs> {
  const runtime = useRuntime()
  const [state, setState] = useState<{
    loading: number
    result: TResult | undefined
    error: unknown
    errors: Record<string, string>
  }>({ loading: 0, result: undefined, error: null, errors: {} })
  const optionsRef = useRef(options)

  useEffect(() => {
    optionsRef.current = options
  })
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true

    return () => {
      mounted.current = false
    }
  }, [])

  const callOrThrow = useCallback(
    async (args?: TArgs, overrides: PageMethodCallOptions<TArgs> = {}): Promise<TResult> => {
      const { onSuccess, onError, ...defaults } = optionsRef.current

      setState((current) => ({ ...current, loading: current.loading + 1, error: null }))

      try {
        const result = await runPageMethod<TResult, TArgs>(method, args, runtime(), {
          ...defaults,
          ...overrides,
        })

        if (mounted.current) {
          setState((current) => ({
            loading: Math.max(0, current.loading - 1),
            result,
            error: null,
            errors: {},
          }))
        }

        onSuccess?.(result, args)

        return result
      } catch (error) {
        if (mounted.current) {
          setState((current) => ({
            ...current,
            loading: Math.max(0, current.loading - 1),
            error,
            errors:
              error instanceof PageMethodError && error.isValidation
                ? firstErrors(error.errors)
                : {},
          }))
        }

        onError?.(error, args)

        throw error
      }
    },
    [method, runtime],
  )

  const call = useCallback(
    (args?: TArgs, overrides?: PageMethodCallOptions<TArgs>) =>
      callOrThrow(args, overrides).catch(() => undefined),
    [callOrThrow],
  )

  const reset = useCallback(
    () => setState({ loading: 0, result: undefined, error: null, errors: {} }),
    [],
  )

  return {
    call,
    callOrThrow,
    loading: state.loading > 0,
    result: state.result,
    error: state.error,
    errors: state.errors,
    reset,
  }
}

/** A map of method names to their arguments and results, for typed `usePageMethods()`. */
export type PageMethodMap = Record<string, { args?: PageMethodArguments; result?: unknown }>

export interface PageMethodsBinding<TMap extends PageMethodMap> {
  call: <K extends keyof TMap & string>(
    method: K,
    args?: TMap[K]['args'],
    options?: PageMethodCallOptions<TMap[K]['args']>,
  ) => Promise<TMap[K]['result'] | undefined>
  callOrThrow: <K extends keyof TMap & string>(
    method: K,
    args?: TMap[K]['args'],
    options?: PageMethodCallOptions<TMap[K]['args']>,
  ) => Promise<TMap[K]['result']>
  /** True while any call is in flight; `isLoading('checkout')` for one method. */
  loading: boolean
  isLoading: (method: keyof TMap & string) => boolean
  /** Validation errors of the last failed call, by method. */
  errors: Partial<Record<keyof TMap & string, Record<string, string>>>
}

/**
 * Call any `#[Expose]` method of the page by name. Type it with a map:
 * `usePageMethods<{ addItem: { args: { sku: string }; result: CartLine } }>()`.
 */
export function usePageMethods<TMap extends PageMethodMap = PageMethodMap>(
  defaults: PageMethodCallOptions = {},
): PageMethodsBinding<TMap> {
  const runtime = useRuntime()
  const [pending, setPending] = useState<Record<string, number>>({})
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>({})
  const defaultsRef = useRef(defaults)

  useEffect(() => {
    defaultsRef.current = defaults
  })

  const callOrThrow = useCallback(
    async (method: string, args?: PageMethodArguments, options: PageMethodCallOptions = {}) => {
      setPending((current) => ({ ...current, [method]: (current[method] ?? 0) + 1 }))

      try {
        const result = await runPageMethod(method, args, runtime(), {
          ...defaultsRef.current,
          ...options,
        } as PageMethodCallOptions<PageMethodArguments>)

        setErrors((current) => {
          if (!current[method]) return current
          const next = { ...current }
          delete next[method]

          return next
        })

        return result
      } catch (error) {
        if (error instanceof PageMethodError && error.isValidation) {
          setErrors((current) => ({ ...current, [method]: firstErrors(error.errors) }))
        }

        throw error
      } finally {
        setPending((current) => ({ ...current, [method]: Math.max(0, (current[method] ?? 1) - 1) }))
      }
    },
    [runtime],
  )

  // `call` and `callOrThrow` keep their identity, so they are safe effect dependencies.
  const call = useCallback(
    (method: string, args?: PageMethodArguments, options?: PageMethodCallOptions) =>
      callOrThrow(method, args, options).catch(() => undefined),
    [callOrThrow],
  )

  return useMemo(
    () =>
      ({
        callOrThrow,
        call,
        loading: Object.values(pending).some((count) => count > 0),
        isLoading: (method: string) => (pending[method] ?? 0) > 0,
        errors,
      }) as unknown as PageMethodsBinding<TMap>,
    [callOrThrow, call, pending, errors],
  )
}

/**
 * Reload view data (`getViewData()` keys) with an Inertia partial reload:
 * `const { reload, reloading } = useReloadProps(['cart'])`.
 */
export function useReloadProps(only?: string[]): {
  reload: (props?: string[]) => Promise<void>
  reloading: boolean
} {
  const [reloading, setReloading] = useState(0)
  const key = JSON.stringify(only ?? null)

  const reload = useCallback(
    async (props?: string[]) => {
      setReloading((count) => count + 1)

      try {
        await reloadPageProps(props ?? (JSON.parse(key) as string[] | null) ?? undefined)
      } finally {
        setReloading((count) => Math.max(0, count - 1))
      }
    },
    [key],
  )

  return { reload, reloading: reloading > 0 }
}

/**
 * Keep view data props fresh while the component is mounted: every `poll` interval, and/or
 * when a Laravel Echo event arrives (`echo: { channel, events }`).
 */
export function useLiveProps(only: string[], options: LivePropsOptions): void {
  const key = JSON.stringify([only, options])

  useEffect(() => {
    const [props, live] = JSON.parse(key) as [string[], LivePropsOptions]

    return watchPageProps(props, live)
  }, [key])
}

/**
 * A keyboard shortcut while the component is mounted: `useShortcut('mod+k', openSearch)`.
 * Shortcuts without a modifier are ignored while typing unless `allowInInputs` is set.
 */
export function useShortcut(
  keys: string | string[],
  handler: (event: KeyboardEvent) => void,
  options: ShortcutOptions & { enabled?: boolean } = {},
): void {
  const handlerRef = useRef(handler)

  useEffect(() => {
    handlerRef.current = handler
  })
  const key = JSON.stringify([keys, options.allowInInputs, options.preventDefault])
  const enabled = options.enabled !== false

  useEffect(() => {
    if (!enabled) return

    const [bindings, allowInInputs, preventDefault] = JSON.parse(key) as [
      string | string[],
      boolean | undefined,
      boolean | undefined,
    ]

    return registerShortcut(bindings, (event) => handlerRef.current(event), {
      allowInInputs,
      preventDefault,
    })
  }, [key, enabled])
}

const noopSubscribe = () => () => {}

/**
 * The store and state of an embedded `<PageForm name>`: read its values, or reset fields
 * with `store.setValue()`. `store` is undefined until the form has mounted.
 */
export function usePageForm(name: string): {
  store: FormStore | undefined
  values: Record<string, unknown>
  errors: Record<string, string[]>
} {
  const store = useSyncExternalStore(
    onPageFormsChanged,
    () => getPageForm(name),
    () => undefined,
  )

  const subscribe = useCallback(
    (listener: () => void) => (store ? store.store.subscribe(listener) : noopSubscribe()),
    [store],
  )
  const state = useSyncExternalStore<FormState | undefined>(
    subscribe,
    () => store?.store.get(),
    () => undefined,
  )

  return { store, values: state?.values ?? {}, errors: state?.errors ?? {} }
}
