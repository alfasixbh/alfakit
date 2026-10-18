import type { FormStore } from './form'
import { HttpError, requestJson } from './http'
import type { NotificationSchema } from './schema/notifications'

/**
 * Calls of `#[Expose]` page methods from a custom page component, the pieces every
 * renderer's `usePageMethod()` is built from:
 *
 * - `callPageMethod()` posts `{ token, method, arguments, forms }` to `/_alfakit/pages/call`,
 *   uploading any `File` among the arguments first (the method receives a `TemporaryUpload`).
 * - `PageMethodError` carries the validation errors and notifications of a failed call.
 * - `registerPageForm()` lets `<PageForm name="…">` publish its store, so a call can send the
 *   form's state (`forms: ['customer']`) and show its validation errors on the fields.
 * - `optimistic()` applies a change right away and rolls it back when the call fails.
 */

/** The JSON answer of `/_alfakit/pages/call`. */
export interface PageMethodResponse<TResult = unknown> {
  result: TResult
  /** Notifications sent during the call (shown as toasts by the renderers). */
  notifications: NotificationSchema[]
  /** Validation errors by argument (`items.0.quantity`) or form field (`forms.customer.email`). */
  errors: Record<string, string[]> | null
  /** The method returned a redirect: the renderer visits it. */
  redirect?: string | null
  /** Props to reload with an Inertia partial reload (`$this->reloadProps('cart')`); `true` = all. */
  reload?: string[] | true | null
  /** The method halted (`throw new Halt`): nothing happened, no error either. */
  halted?: boolean
  message?: string
  retryAfter?: number
}

export type PageMethodArguments = Record<string, unknown> | unknown[]

export interface CallPageMethodOptions {
  /** The page context token (`page.token`). */
  token: string
  /** `panel.endpoints.pageCall`. */
  endpoint: string
  /** `panel.endpoints.upload`: needed when the arguments contain files. */
  uploadEndpoint?: string
  /** Named forms (`<PageForm name>`) whose current state is sent along. */
  forms?: string[]
  signal?: AbortSignal
}

/** A call that failed: validation (422), rate limit (429), authorisation (403), server error… */
export class PageMethodError extends Error {
  constructor(
    public readonly status: number,
    public readonly response: Partial<PageMethodResponse> | null,
    message?: string,
    public override readonly cause?: unknown,
  ) {
    super(message ?? response?.message ?? `The page method call failed with status ${status}.`)
    this.name = 'PageMethodError'
  }

  get errors(): Record<string, string[]> {
    return this.response?.errors ?? {}
  }

  get notifications(): NotificationSchema[] {
    return this.response?.notifications ?? []
  }

  /** True for validation errors (shown on fields and returned by the hooks' `errors`). */
  get isValidation(): boolean {
    return this.status === 422
  }
}

// ---------------------------------------------------------------- Named forms on the page

const pageForms = new Map<string, FormStore>()
const pageFormListeners = new Set<() => void>()

/** Publish the store of a named form (`form:customer` → `customer`). Returns the cleanup. */
export function registerPageForm(name: string, store: FormStore): () => void {
  pageForms.set(name, store)
  pageFormListeners.forEach((listener) => listener())

  return () => {
    if (pageForms.get(name) === store) {
      pageForms.delete(name)
      pageFormListeners.forEach((listener) => listener())
    }
  }
}

/** The store of a mounted named form, if any. */
export function getPageForm(name: string): FormStore | undefined {
  return pageForms.get(name)
}

/** Run `listener` whenever a named form mounts or unmounts. */
export function onPageFormsChanged(listener: () => void): () => void {
  pageFormListeners.add(listener)

  return () => {
    pageFormListeners.delete(listener)
  }
}

/** The form name of a content block component (`form:customer` → `customer`). */
export function pageFormName(component: string | undefined): string | null {
  return component?.startsWith('form:') ? component.slice('form:'.length) : null
}

/**
 * Put `forms.{name}.{field}` errors on the named forms' fields and return the rest (the
 * errors of the call's own arguments). Forms that were sent and have no errors are cleared.
 */
export function distributePageFormErrors(
  errors: Record<string, string[]>,
  forms: string[] = [],
): Record<string, string[]> {
  const byForm = new Map<string, Record<string, string[]>>(forms.map((name) => [name, {}]))
  const rest: Record<string, string[]> = {}

  for (const [key, messages] of Object.entries(errors)) {
    const match = /^forms\.([^.]+)\.(.+)$/.exec(key)

    if (match && pageForms.has(match[1]!)) {
      const target = byForm.get(match[1]!) ?? {}
      target[match[2]!] = messages
      byForm.set(match[1]!, target)
    } else {
      rest[key] = messages
    }
  }

  for (const [name, formErrors] of byForm) {
    pageForms.get(name)?.setErrors(formErrors)
  }

  return rest
}

// ---------------------------------------------------------------- Calling

function isFile(value: unknown): value is Blob {
  return typeof Blob !== 'undefined' && value instanceof Blob
}

function containsFile(value: unknown): boolean {
  if (isFile(value)) return true
  if (Array.isArray(value)) return value.some(containsFile)
  if (value && typeof value === 'object')
    return Object.values(value as Record<string, unknown>).some(containsFile)

  return false
}

/**
 * Upload every `File`/`Blob` in the arguments to the temporary upload endpoint and put its
 * key (`tmp:…`) in its place. Type the PHP parameter as `TemporaryUpload` to receive it.
 */
export async function uploadPageMethodFiles<T>(
  value: T,
  endpoint: string | undefined,
  signal?: AbortSignal,
): Promise<T> {
  if (!containsFile(value)) return value

  if (!endpoint) {
    throw new Error(
      'AlfaKit: page method arguments contain files but the panel has no upload endpoint.',
    )
  }

  const walk = async (item: unknown): Promise<unknown> => {
    if (isFile(item)) {
      const body = new FormData()
      body.append('file', item, (item as File).name ?? 'upload')

      const uploaded = await requestJson<{ key: string }>(endpoint, {
        method: 'POST',
        body,
        signal,
      })

      return uploaded.key
    }

    if (Array.isArray(item)) return Promise.all(item.map(walk))

    if (item && typeof item === 'object' && Object.getPrototypeOf(item) === Object.prototype) {
      const entries = await Promise.all(
        Object.entries(item as Record<string, unknown>).map(
          async ([key, nested]) => [key, await walk(nested)] as const,
        ),
      )

      return Object.fromEntries(entries)
    }

    return item
  }

  return (await walk(value)) as T
}

/**
 * Call an `#[Expose]` method of the current page. Resolves with the whole response; rejects
 * with a `PageMethodError` (validation errors, rate limit, authorisation, server error).
 * Named forms listed in `forms` send their state and get their field errors back.
 */
export async function callPageMethod<TResult = unknown>(
  method: string,
  args: PageMethodArguments | undefined,
  options: CallPageMethodOptions,
): Promise<PageMethodResponse<TResult>> {
  const forms: Record<string, unknown> = {}

  for (const name of options.forms ?? []) {
    const store = pageForms.get(name)

    if (store) forms[name] = store.state.values
  }

  try {
    const uploaded = await uploadPageMethodFiles(args ?? {}, options.uploadEndpoint, options.signal)

    const response = await requestJson<PageMethodResponse<TResult>>(options.endpoint, {
      method: 'POST',
      body: {
        token: options.token,
        method,
        arguments: uploaded,
        ...(Object.keys(forms).length > 0 ? { forms } : {}),
      },
      signal: options.signal,
    })

    // A successful call clears the field errors of the forms it sent.
    if (options.forms?.length) distributePageFormErrors({}, options.forms)

    return {
      ...response,
      notifications: response.notifications ?? [],
      errors: response.errors ?? null,
    }
  } catch (error) {
    if (error instanceof HttpError) {
      const data = (
        error.data && typeof error.data === 'object' ? error.data : null
      ) as Partial<PageMethodResponse> | null

      // Field errors of the named forms are shown on their fields; the error keeps them all.
      if (error.status === 422 && data?.errors) distributePageFormErrors(data.errors, options.forms)

      throw new PageMethodError(error.status, data, error.message, error)
    }

    throw error
  }
}

/**
 * Apply a change before the server answers and undo it when the call fails:
 *
 * ```ts
 * await optimistic(
 *   () => { const before = cards; setCards(moved); return () => setCards(before) },
 *   () => call('moveOrder', { order: id, status }),
 * )
 * ```
 *
 * `apply` returns the rollback. The call's error is re-thrown after rolling back.
 */
export async function optimistic<T>(
  apply: () => (() => void) | void,
  run: () => Promise<T>,
): Promise<T> {
  const rollback = apply()

  try {
    return await run()
  } catch (error) {
    rollback?.()

    throw error
  }
}

/**
 * The first error message of each key, for showing next to inputs:
 * `{ items: 'The items field is required.' }`.
 */
export function firstErrors(errors: Record<string, string[]>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(errors)
      .filter(([, messages]) => messages.length > 0)
      .map(([key, messages]) => [key, messages[0]!]),
  )
}
