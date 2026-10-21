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
import { untrack } from 'svelte'
import { showToast } from '../components/notifications/toast'
import { usePageReader, useT } from '../context.svelte'

/**
 * Helpers for custom page components (`Page::$component`): call `#[Expose]` methods, reload
 * and watch view data, keyboard shortcuts, and the state of embedded `<PageForm>`s. Call
 * them while the component initialises; their fields are reactive (read them in markup or
 * `$derived`).
 */

function useRuntime(): () => PageMethodRuntime {
  const t = useT()
  // Calls start outside initialisation (click handlers, timers): read through a reader.
  const reader = usePageReader()

  // The token is re-issued with every response, so it is read when the call starts.
  return () => ({
    token: reader.page()?.token ?? '',
    panel: reader.panel(),
    page: reader.page(),
    showToast: (notification) => showToast(notification),
    t,
  })
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
  readonly loading: boolean
  readonly result: TResult | undefined
  readonly error: unknown
  /** Validation errors of the last call, first message per key (`{ sku: '…' }`). */
  readonly errors: Record<string, string>
  reset: () => void
}

/**
 * Call one `#[Expose]` method of the page:
 *
 * ```svelte
 * const checkout = usePageMethod<Order>('checkout', { forms: ['customer'] })
 * <Button disabled={checkout.loading} onclick={() => checkout.call({ items })}>Charge</Button>
 * ```
 */
export function usePageMethod<
  TResult = unknown,
  TArgs extends PageMethodArguments = Record<string, unknown>,
>(
  method: string,
  options: UsePageMethodOptions<TResult, TArgs> = {},
): PageMethodBinding<TResult, TArgs> {
  const runtime = useRuntime()
  let pending = $state(0)
  let result = $state.raw<TResult | undefined>(undefined)
  let error = $state.raw<unknown>(null)
  let errors = $state.raw<Record<string, string>>({})

  const callOrThrow = async (
    args?: TArgs,
    overrides: PageMethodCallOptions<TArgs> = {},
  ): Promise<TResult> => {
    const { onSuccess, onError, ...defaults } = options

    pending++
    error = null

    try {
      const value = await runPageMethod<TResult, TArgs>(method, args, runtime(), {
        ...defaults,
        ...overrides,
      })

      result = value
      errors = {}
      onSuccess?.(value, args)

      return value
    } catch (caught) {
      error = caught
      errors =
        caught instanceof PageMethodError && caught.isValidation ? firstErrors(caught.errors) : {}
      onError?.(caught, args)

      throw caught
    } finally {
      pending = Math.max(0, pending - 1)
    }
  }

  return {
    call: (args, overrides) => callOrThrow(args, overrides).catch(() => undefined),
    callOrThrow,
    get loading() {
      return pending > 0
    },
    get result() {
      return result
    },
    get error() {
      return error
    },
    get errors() {
      return errors
    },
    reset: () => {
      result = undefined
      error = null
      errors = {}
    },
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
  readonly loading: boolean
  isLoading: (method: keyof TMap & string) => boolean
  /** Validation errors of the last failed call, by method. */
  readonly errors: Partial<Record<keyof TMap & string, Record<string, string>>>
}

/** Call any `#[Expose]` method of the page by name. */
export function usePageMethods<TMap extends PageMethodMap = PageMethodMap>(
  defaults: PageMethodCallOptions = {},
): PageMethodsBinding<TMap> {
  const runtime = useRuntime()
  let pending = $state.raw<Record<string, number>>({})
  let errors = $state.raw<Record<string, Record<string, string>>>({})

  const callOrThrow = async (
    method: string,
    args?: PageMethodArguments,
    options: PageMethodCallOptions = {},
  ) => {
    pending = { ...pending, [method]: (pending[method] ?? 0) + 1 }

    try {
      const value = await runPageMethod(method, args, runtime(), { ...defaults, ...options })
      const next = { ...errors }
      delete next[method]
      errors = next

      return value
    } catch (caught) {
      if (caught instanceof PageMethodError && caught.isValidation) {
        errors = { ...errors, [method]: firstErrors(caught.errors) }
      }

      throw caught
    } finally {
      pending = { ...pending, [method]: Math.max(0, (pending[method] ?? 1) - 1) }
    }
  }

  return {
    callOrThrow,
    call: (method: string, args?: PageMethodArguments, options?: PageMethodCallOptions) =>
      callOrThrow(method, args, options).catch(() => undefined),
    get loading() {
      return Object.values(pending).some((count) => count > 0)
    },
    isLoading: (method: string) => (pending[method] ?? 0) > 0,
    get errors() {
      return errors
    },
  } as unknown as PageMethodsBinding<TMap>
}

/** Reload view data (`getViewData()` keys) with an Inertia partial reload. */
export function useReloadProps(only?: string[]): {
  reload: (props?: string[]) => Promise<void>
  readonly reloading: boolean
} {
  let pending = $state(0)

  return {
    reload: async (props?: string[]) => {
      pending++

      try {
        await reloadPageProps(props ?? only)
      } finally {
        pending = Math.max(0, pending - 1)
      }
    },
    get reloading() {
      return pending > 0
    },
  }
}

/**
 * Keep view data props fresh while the component is mounted: every `poll` interval, and/or
 * when a Laravel Echo event arrives (`echo: { channel, events }`).
 */
export function useLiveProps(only: string[], options: LivePropsOptions): void {
  $effect(() => watchPageProps(only, options))
}

/** A keyboard shortcut while the component is mounted: `useShortcut('mod+k', openSearch)`. */
export function useShortcut(
  keys: string | string[],
  handler: (event: KeyboardEvent) => void,
  options: ShortcutOptions & { enabled?: () => boolean } = {},
): void {
  $effect(() => {
    if (options.enabled && !options.enabled()) return

    return registerShortcut(keys, (event) => handler(event), {
      allowInInputs: options.allowInInputs,
      preventDefault: options.preventDefault,
    })
  })
}

/**
 * The store and state of an embedded `<PageForm name>`: read its values, or reset fields
 * with `store.setValue()`. `store` is undefined until the form has mounted.
 */
export function usePageForm(name: string): {
  readonly store: FormStore | undefined
  readonly values: Record<string, unknown>
  readonly errors: Record<string, string[]>
} {
  let store = $state.raw<FormStore | undefined>(getPageForm(name))
  let state = $state.raw<FormState | undefined>(store?.store.get())

  // Untracked: binding writes `store` and `state`, and the form's own effects publish the
  // store while they run, so a tracked read here would re-run this effect in a loop.
  $effect(() => {
    let unsubscribe: (() => void) | undefined

    const bind = () =>
      untrack(() => {
        unsubscribe?.()
        const next = getPageForm(name)
        store = next
        state = next?.store.get()
        unsubscribe = next?.store.subscribe((value) => {
          state = value
        })
      })

    bind()
    const offChanged = onPageFormsChanged(() => {
      if (getPageForm(name) !== untrack(() => store)) bind()
    })

    return () => {
      offChanged()
      unsubscribe?.()
    }
  })

  return {
    get store() {
      return store
    },
    get values() {
      return state?.values ?? {}
    },
    get errors() {
      return state?.errors ?? {}
    },
  }
}
