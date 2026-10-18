import type { FormStore } from './form'
import { requestJson } from './http'
import type { DeferredBadgeSchema, SchemaComponent } from './schema/components'

/**
 * `deferLoading()` components arrive without their children on the page's first response
 * (`deferred: true`); the renderer shows a skeleton and loads the component from the
 * `schemaDeferred` endpoint once the skeleton scrolls into view. `Tab::deferBadge()` tabs
 * load their badge the same way. Both are addressed as `{schema}::{key}`.
 */
export function isDeferredPlaceholder(
  component: { deferred?: boolean } | null | undefined,
): boolean {
  return component?.deferred === true
}

export function deferredComponentReference(schema: string, key: string): string {
  return `${schema}::${key}`
}

export interface DeferredRequestOptions {
  /** The `schemaDeferred` endpoint. */
  url: string
  /** The page context token (used when there is no form). */
  token: string
  /** The component's key. */
  key: string
  /** The form the component belongs to; its token, schema name and state go along. */
  form?: FormStore | null
  /** Schema name when there is no form (`infolist`). */
  schema?: string
  signal?: AbortSignal
}

function deferredBody(options: DeferredRequestOptions): Record<string, unknown> {
  const form = options.form ?? undefined
  const context = form ? form.requestContext() : { token: options.token }

  return {
    ...context,
    token: (context.token as string | undefined) || options.token,
    component: deferredComponentReference(
      form?.component ?? options.schema ?? 'infolist',
      options.key,
    ),
    state: form ? form.state.values : undefined,
  }
}

/** Load a deferred component in full (its children included). */
export async function loadDeferredComponent<T extends SchemaComponent = SchemaComponent>(
  options: DeferredRequestOptions,
): Promise<T> {
  const response = await requestJson<{ component: T }>(options.url, {
    method: 'POST',
    body: deferredBody(options),
    signal: options.signal,
  })

  return response.component
}

/** Load the badge of a `deferBadge()` tab. */
export async function loadDeferredBadge(
  options: DeferredRequestOptions,
): Promise<DeferredBadgeSchema> {
  const response = await requestJson<{ badge: DeferredBadgeSchema }>(options.url, {
    method: 'POST',
    body: { ...deferredBody(options), only: 'badge', state: undefined },
    signal: options.signal,
  })

  return response.badge
}

/**
 * Put `replacement` in place of the component with `key` anywhere in the tree. Returns the
 * same array when the key isn't found, so callers can tell nothing changed.
 */
export function replaceComponentByKey<T extends SchemaComponent>(
  components: T[],
  key: string,
  replacement: SchemaComponent,
): T[] {
  let changed = false

  const next = components.map((component) => {
    if (component.key === key) {
      changed = true

      return replacement as T
    }

    if (component.schema?.length) {
      const children = replaceComponentByKey(component.schema, key, replacement)

      if (children !== component.schema) {
        changed = true

        return { ...component, schema: children }
      }
    }

    return component
  })

  return changed ? next : components
}

/** Whether one of the deferred component's fields has a validation error. */
export function deferredHasErrors(
  component: { deferredPaths?: string[] },
  errors: Record<string, unknown>,
): boolean {
  const paths = component.deferredPaths ?? []

  if (paths.length === 0) return false

  return Object.keys(errors).some((errorPath) =>
    paths.some((path) => errorPath === path || errorPath.startsWith(`${path}.`)),
  )
}

/**
 * Call `onVisible` once `element` enters the viewport (immediately where
 * `IntersectionObserver` is missing, e.g. in tests or old browsers). A hidden element
 * (collapsed section, inactive tab) never intersects, so it waits until it is revealed.
 * Returns a cleanup function.
 */
export function whenVisible(element: Element | null, onVisible: () => void): () => void {
  if (!element) return () => {}

  if (typeof IntersectionObserver === 'undefined') {
    onVisible()

    return () => {}
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect()
        onVisible()
      }
    },
    { rootMargin: '200px' },
  )

  observer.observe(element)

  return () => observer.disconnect()
}

/**
 * Merge a loaded component into the form's tree, so live fields inside it work like any
 * other. Returns false when the form doesn't hold the placeholder (e.g. after a refresh
 * already replaced it).
 */
export function mergeDeferredComponent(form: FormStore, component: SchemaComponent): boolean {
  let merged = false

  form.store.set((state) => {
    const components = replaceComponentByKey(state.components, component.key, component)

    merged = components !== state.components

    return merged ? { ...state, components } : state
  })

  return merged
}
