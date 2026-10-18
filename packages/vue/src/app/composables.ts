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
import {
  computed,
  onMounted,
  onScopeDispose,
  readonly,
  ref,
  shallowRef,
  watch,
  type ComputedRef,
  type Ref,
  type ShallowRef,
} from 'vue'
import { showToast } from '../components/notifications/flash-toasts'
import { usePageSchema, usePanel, useT } from '../context'

/**
 * Composables for custom page components (`Page::$component`): call `#[Expose]` methods,
 * reload and watch view data, keyboard shortcuts, and the state of embedded `<PageForm>`s.
 */

function useRuntime(): () => PageMethodRuntime {
  const page = usePageSchema()
  const panel = usePanel()
  const t = useT()

  // The token is re-issued with every response, so it is read when the call starts.
  return () => ({
    token: page.value?.token ?? '',
    panel: panel.value,
    page: page.value,
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
  loading: Readonly<Ref<boolean>>
  result: Readonly<ShallowRef<TResult | undefined>>
  error: Readonly<ShallowRef<unknown>>
  /** Validation errors of the last call, first message per key (`{ sku: '…' }`). */
  errors: Readonly<Ref<Record<string, string>>>
  reset: () => void
}

/**
 * Call one `#[Expose]` method of the page:
 *
 * ```ts
 * const checkout = usePageMethod<Order, { items: CartLine[] }>('checkout', { forms: ['customer'] })
 * // <Button :disabled="checkout.loading.value" @click="checkout.call({ items })">Charge</Button>
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
  const pending = ref(0)
  const result = shallowRef<TResult | undefined>(undefined)
  const error = shallowRef<unknown>(null)
  const errors = ref<Record<string, string>>({})

  const callOrThrow = async (
    args?: TArgs,
    overrides: PageMethodCallOptions<TArgs> = {},
  ): Promise<TResult> => {
    const { onSuccess, onError, ...defaults } = options

    pending.value++
    error.value = null

    try {
      const value = await runPageMethod<TResult, TArgs>(method, args, runtime(), {
        ...defaults,
        ...overrides,
      })

      result.value = value
      errors.value = {}
      onSuccess?.(value, args)

      return value
    } catch (caught) {
      error.value = caught
      errors.value =
        caught instanceof PageMethodError && caught.isValidation ? firstErrors(caught.errors) : {}
      onError?.(caught, args)

      throw caught
    } finally {
      pending.value = Math.max(0, pending.value - 1)
    }
  }

  return {
    call: (args, overrides) => callOrThrow(args, overrides).catch(() => undefined),
    callOrThrow,
    loading: readonly(computed(() => pending.value > 0)),
    result,
    error,
    errors,
    reset: () => {
      result.value = undefined
      error.value = null
      errors.value = {}
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
  loading: ComputedRef<boolean>
  isLoading: (method: keyof TMap & string) => boolean
  /** Validation errors of the last failed call, by method. */
  errors: Readonly<Ref<Partial<Record<keyof TMap & string, Record<string, string>>>>>
}

/** Call any `#[Expose]` method of the page by name. */
export function usePageMethods<TMap extends PageMethodMap = PageMethodMap>(
  defaults: PageMethodCallOptions = {},
): PageMethodsBinding<TMap> {
  const runtime = useRuntime()
  const pending = ref<Record<string, number>>({})
  const errors = ref<Record<string, Record<string, string>>>({})

  const callOrThrow = async (
    method: string,
    args?: PageMethodArguments,
    options: PageMethodCallOptions = {},
  ) => {
    pending.value = { ...pending.value, [method]: (pending.value[method] ?? 0) + 1 }

    try {
      const value = await runPageMethod(method, args, runtime(), { ...defaults, ...options })
      const next = { ...errors.value }
      delete next[method]
      errors.value = next

      return value
    } catch (caught) {
      if (caught instanceof PageMethodError && caught.isValidation) {
        errors.value = { ...errors.value, [method]: firstErrors(caught.errors) }
      }

      throw caught
    } finally {
      pending.value = { ...pending.value, [method]: Math.max(0, (pending.value[method] ?? 1) - 1) }
    }
  }

  return {
    callOrThrow,
    call: (method: string, args?: PageMethodArguments, options?: PageMethodCallOptions) =>
      callOrThrow(method, args, options).catch(() => undefined),
    loading: computed(() => Object.values(pending.value).some((count) => count > 0)),
    isLoading: (method: string) => (pending.value[method] ?? 0) > 0,
    errors,
  } as unknown as PageMethodsBinding<TMap>
}

/** Reload view data (`getViewData()` keys) with an Inertia partial reload. */
export function useReloadProps(only?: string[]): {
  reload: (props?: string[]) => Promise<void>
  reloading: ComputedRef<boolean>
} {
  const pending = ref(0)

  return {
    reload: async (props?: string[]) => {
      pending.value++

      try {
        await reloadPageProps(props ?? only)
      } finally {
        pending.value = Math.max(0, pending.value - 1)
      }
    },
    reloading: computed(() => pending.value > 0),
  }
}

/**
 * Keep view data props fresh while the component is mounted: every `poll` interval, and/or
 * when a Laravel Echo event arrives (`echo: { channel, events }`).
 */
export function useLiveProps(only: string[], options: LivePropsOptions): void {
  let stop: (() => void) | undefined

  onMounted(() => {
    stop = watchPageProps(only, options)
  })

  onScopeDispose(() => stop?.())
}

/** A keyboard shortcut while the component is mounted: `useShortcut('mod+k', openSearch)`. */
export function useShortcut(
  keys: string | string[],
  handler: (event: KeyboardEvent) => void,
  options: ShortcutOptions & { enabled?: Ref<boolean> | boolean } = {},
): void {
  let stop: (() => void) | undefined
  const enabled = computed(() =>
    typeof options.enabled === 'object' ? options.enabled.value : options.enabled !== false,
  )

  const start = () => {
    stop?.()
    stop = enabled.value
      ? registerShortcut(keys, (event) => handler(event), {
          allowInInputs: options.allowInInputs,
          preventDefault: options.preventDefault,
        })
      : undefined
  }

  onMounted(() => {
    start()
    watch(enabled, start)
  })

  onScopeDispose(() => stop?.())
}

/**
 * The store and state of an embedded `<PageForm name>`: read its values, or reset fields
 * with `store.setValue()`. `store` is undefined until the form has mounted.
 */
export function usePageForm(name: string): {
  store: ShallowRef<FormStore | undefined>
  values: ComputedRef<Record<string, unknown>>
  errors: ComputedRef<Record<string, string[]>>
} {
  const store = shallowRef<FormStore | undefined>(getPageForm(name))
  const state = shallowRef<FormState | undefined>(store.value?.store.get())
  let unsubscribe: (() => void) | undefined

  const bind = () => {
    unsubscribe?.()
    state.value = store.value?.store.get()
    unsubscribe = store.value?.store.subscribe((next) => {
      state.value = next
    })
  }

  // Browser only: a server render has no mounted forms, and must not keep listeners.
  if (typeof window === 'undefined') {
    return { store, values: computed(() => ({})), errors: computed(() => ({})) }
  }

  const offChanged = onPageFormsChanged(() => {
    const next = getPageForm(name)

    if (next !== store.value) {
      store.value = next
      bind()
    }
  })

  bind()

  onScopeDispose(() => {
    offChanged()
    unsubscribe?.()
  })

  return {
    store,
    values: computed(() => state.value?.values ?? {}),
    errors: computed(() => state.value?.errors ?? {}),
  }
}
