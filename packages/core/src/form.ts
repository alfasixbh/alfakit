import { modalTableQuery } from './advanced-fields'
import { debugRecorder } from './debug'
import { reportRequestError } from './error-notifications'
import { HttpError, requestJson } from './http'
import { currentPageQuery } from './page-query'
import { mergeRefreshResponse } from './partial'
import type { ModalTableSelectResponse } from './schema/advanced-fields'
import type { FieldSchema, SchemaComponent, TabSchema } from './schema/components'
import { isField } from './schema/components'
import type {
  FormPayload,
  SchemaRefreshResponse,
  StepValidationHaltedResponse,
} from './schema/form'
import type { IconPickerResponse } from './schema/icon-picker'
import type { NotificationSchema } from './schema/notifications'
import { createStore, type Store } from './store'
import type { TableQuery } from './table'
import { cloneState } from './utils/clone'
import { debounce, type Debounced } from './utils/debounce'
import { getPath, setPath } from './utils/path'

export interface FormState {
  components: SchemaComponent[]
  values: Record<string, unknown>
  errors: Record<string, string[]>
  /** State paths that changed since the last fill. */
  dirty: Set<string>
  /** True while a live refresh or submit is in flight. */
  processing: boolean
  refreshing: boolean
  columns: FormPayload['columns']
}

export interface FormStoreOptions {
  /** Encrypted page context token. */
  token: string
  /** Context component name (`form`, `action:table.edit`, …). */
  component: string
  /** Record key when the schema belongs to a table action. */
  record?: string | number | null
  /** URL of the schema refresh endpoint. */
  refreshUrl?: string
  /** URL of the select options endpoint. */
  optionsUrl?: string
  /** URL of the step validation endpoint (wizards validate each step on "Next"). */
  validateUrl?: string
  /**
   * Extra parameters for every request (refresh, options). The modal form of a field
   * action sends its owning form's state (`ownerState`) so the server can find the field.
   */
  params?: () => Record<string, unknown>
  onError?: (error: unknown) => void
  /** Shows notifications the server sent with a JSON answer (a halted wizard step). */
  onNotifications?: (notifications: NotificationSchema[]) => void
  /** Called after a live refresh was merged (e.g. to reload what depends on the form). */
  onRefreshed?: (path: string | undefined) => void
  /**
   * Prefix of the fields' DOM ids (`{idPrefix}-{statePath}`), default `alfakit`. Forms shown
   * over another form (action modals) use their own, so ids never repeat on the page.
   */
  idPrefix?: string
}

/** A DOM-safe id prefix for a form, e.g. `action:field.category_id.createOption` -> `alfakit-action-field-category_id-createOption`. */
export function formIdPrefix(scope: string): string {
  return `alfakit-${scope.replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

/** The DOM id of a field: `{prefix}-{statePath}` with unsafe characters replaced. */
export function fieldDomId(prefix: string, statePath: string): string {
  return `${prefix}-${statePath.replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

/**
 * Walk a component tree and collect every field (including those inside Repeater items).
 */
export function collectFields(
  components: SchemaComponent[],
  into: FieldSchema[] = [],
): FieldSchema[] {
  for (const component of components) {
    if (isField(component)) {
      into.push(component)

      if (component.type === 'Repeater' || component.type === 'Builder') {
        for (const item of component.items) {
          collectFields(item.schema, into)
        }
      }
    }

    if (component.schema) {
      collectFields(component.schema, into)
    }
  }

  return into
}

/**
 * The field at `path`. Items the browser added (or cloned) before the server has seen
 * them have no per-item schema yet: their fields are found in the Repeater's `template`
 * (or the Builder block's schema, preferring the block named by the item's `type` in
 * `values`), whose `__INDEX__` placeholders stand for any item index, so `live()` fields
 * of fresh items refresh like any other.
 */
export function findFieldByPath(
  components: SchemaComponent[],
  path: string,
  values: Record<string, unknown> = {},
): FieldSchema | undefined {
  return (
    collectFields(components).find((field) => field.statePath === path) ??
    findTemplateField(components, path, values)
  )
}

function findTemplateField(
  components: SchemaComponent[],
  path: string,
  values: Record<string, unknown>,
): FieldSchema | undefined {
  for (const field of collectFields(components)) {
    for (const template of itemTemplates(field, path, values)) {
      const found =
        collectFields(template).find((candidate) =>
          templatePathMatches(candidate.statePath, path),
        ) ?? findTemplateField(template, path, values)

      if (found) return found
    }
  }

  return undefined
}

/** The blank item schemas of a Repeater or Builder (the item's own block first). */
function itemTemplates(
  field: FieldSchema,
  path: string,
  values: Record<string, unknown>,
): SchemaComponent[][] {
  if (field.type === 'Repeater') {
    return [(field as unknown as { template?: SchemaComponent[] }).template ?? []]
  }

  if (field.type !== 'Builder') return []

  const blocks =
    (field as unknown as { blocks?: Array<{ name: string; schema: SchemaComponent[] }> }).blocks ??
    []
  const item = new RegExp(`^(${templatePathPattern(field.statePath)}\\.\\d+)\\.`).exec(path)
  const type = item ? getPath<unknown>(values, `${item[1]}.type`) : undefined

  return [...blocks]
    .sort((a, b) => Number(b.name === type) - Number(a.name === type))
    .map((block) => block.schema)
}

function templatePathPattern(statePath: string): string {
  return statePath
    .split('__INDEX__')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\d+')
}

function templatePathMatches(statePath: string, path: string): boolean {
  return (
    statePath.includes('__INDEX__') && new RegExp(`^${templatePathPattern(statePath)}$`).test(path)
  )
}

/**
 * The wizard step to reveal after the errors change: the first step with an error, but
 * only when new error keys arrived (a submit or validation response), so the user can
 * still move between steps while errors are shown.
 */
export function wizardStepToReveal(
  steps: SchemaComponent[],
  previousErrors: Record<string, unknown>,
  errors: Record<string, unknown>,
): number | null {
  if (!Object.keys(errors).some((key) => !(key in previousErrors))) {
    return null
  }

  const index = steps.findIndex((step) =>
    collectFields(step.schema ?? []).some((field) => errors[field.statePath]),
  )

  return index === -1 ? null : index
}

/**
 * Whether a layout component (a tab, a section) holds a field with a validation error:
 * one of its fields, a nested repeater/builder item field (`items.0.sku`), or, while the
 * component is deferred and its fields aren't loaded, one of its `deferredPaths`.
 */
export function componentHasErrors(
  component: Pick<SchemaComponent, 'schema' | 'deferred' | 'deferredPaths'>,
  errors: Record<string, unknown>,
): boolean {
  const keys = Object.keys(errors).filter((key) => errors[key])

  if (keys.length === 0) return false

  const paths =
    component.deferred && !component.schema?.length
      ? (component.deferredPaths ?? [])
      : collectFields(component.schema ?? []).map((field) => field.statePath)

  return paths.some((path) => keys.some((key) => key === path || key.startsWith(`${path}.`)))
}

/**
 * The value a tab is written to the query string as (`persistTabInQueryString()`): its
 * readable `queryValue` (`billing-address`), else its key.
 */
export function tabQueryValue(tab: Pick<TabSchema, 'key' | 'queryValue'>): string {
  return tab.queryValue ?? tab.key
}

/**
 * The key of the tab a query-string value names: a tab's `queryValue`, or its key (links
 * written before tabs had readable values, `?tab=tabs-0.tab-1`). Null when none matches.
 */
export function tabFromQuery(
  tabs: Array<Pick<TabSchema, 'key' | 'queryValue'>>,
  value: string | null | undefined,
): string | null {
  if (!value) return null

  return (
    (tabs.find((tab) => tab.queryValue === value) ?? tabs.find((tab) => tab.key === value))?.key ??
    null
  )
}

/**
 * The tab to show after the errors change: when new error keys arrived (a submit or
 * validation response) and the active tab has none, the first tab with an error.
 */
export function tabToReveal(
  tabs: Array<Pick<SchemaComponent, 'key' | 'schema' | 'deferred' | 'deferredPaths'>>,
  activeKey: string,
  previousErrors: Record<string, unknown>,
  errors: Record<string, unknown>,
): string | null {
  if (!Object.keys(errors).some((key) => !(key in previousErrors))) {
    return null
  }

  const active = tabs.find((tab) => tab.key === activeKey)

  if (active && componentHasErrors(active, errors)) return null

  return tabs.find((tab) => componentHasErrors(tab, errors))?.key ?? null
}

/** Whether `key` is the error of one item of the list field at `path` (`labels.2`). */
function isItemErrorKey(key: string, path: string): boolean {
  return (
    key.length > path.length + 1 &&
    key.startsWith(`${path}.`) &&
    /^\d+$/.test(key.slice(path.length + 1))
  )
}

/**
 * The validation message a field shows: its own, else the first of its items' (`labels.2`
 * for a tag refused by `nestedRecursiveRules()`, `attachments.0` for one upload). Those
 * errors have no field of their own, so without this the form refused to save with no
 * message anywhere. Deeper paths (`items.0.name`) belong to item fields and are left out.
 */
export function fieldError(
  errors: Readonly<Record<string, readonly string[] | undefined>>,
  path: string,
): string | undefined {
  const own = errors[path]?.[0]

  if (own) return own

  for (const key of Object.keys(errors)) {
    if (isItemErrorKey(key, path) && errors[key]?.[0]) return errors[key][0]
  }

  return undefined
}

/**
 * Framework-agnostic form state: values addressed by `statePath`, validation errors,
 * dirty tracking and server round-trips for `live()` fields.
 */
export class FormStore {
  public readonly store: Store<FormState>

  private readonly liveDebouncers = new Map<string, Debounced<[]>>()

  private refreshController: AbortController | null = null

  /**
   * The values as the server last sent them, so a refresh can tell `afterStateUpdated`
   * hooks what the field held before the change (`$old`).
   */
  private serverValues: Record<string, unknown>

  /**
   * Paths the user changed while a live refresh was in flight. Only these keep their
   * client value when the response is merged; every other path takes the server's value
   * (including values set by `$set` in `afterStateUpdated` hooks).
   */
  private editsInFlight: Set<string> | null = null

  /** The fingerprints of the components the store holds (see `PartialFormPayload`). */
  private fingerprints: Record<string, string> | undefined

  constructor(
    payload: FormPayload,
    private options: FormStoreOptions,
  ) {
    this.serverValues = payload.state ?? {}
    this.fingerprints = payload.fingerprints
    this.store = createStore<FormState>({
      components: payload.components,
      values: payload.state ?? {},
      errors: {},
      dirty: new Set(),
      processing: false,
      refreshing: false,
      columns: payload.columns,
    })

    // Listed by the developer debug panel while it is enabled; a no-op otherwise.
    debugRecorder.registerForm(this)
  }

  get state(): FormState {
    return this.store.get()
  }

  /**
   * Swap in a fresher context token (every response re-issues it) without touching the
   * form state, so live refreshes keep working after unrelated reloads.
   */
  setToken(token: string): void {
    this.options = { ...this.options, token }
  }

  /** Context component name of the schema (`form`, `action:table.edit`, …). */
  get component(): string {
    return this.options.component
  }

  /** Prefix of the fields' DOM ids (see `FormStoreOptions.idPrefix`). */
  get idPrefix(): string {
    return this.options.idPrefix ?? 'alfakit'
  }

  get record(): string | number | null {
    return this.options.record ?? null
  }

  get token(): string {
    return this.options.token
  }

  get optionsUrl(): string | undefined {
    return this.options.optionsUrl
  }

  get validateUrl(): string | undefined {
    return this.options.validateUrl
  }

  /** The fingerprints of the held components, sent so responses can be partial. */
  get currentFingerprints(): Record<string, string> | undefined {
    return this.fingerprints
  }

  /** The parameters that identify this schema to the internal endpoints. */
  requestContext(): Record<string, unknown> {
    return {
      token: this.options.token,
      component: this.options.component,
      record: this.options.record ?? undefined,
      // A record action's modal on a list tab: the server finds the record through the
      // page's tab and filters, as the modal request itself does.
      tableQuery: currentPageQuery(),
      ...this.options.params?.(),
    }
  }

  /**
   * `requestContext()` plus the form state for GET requests (options, picker tables,
   * mentions). States travel as JSON: a query string drops nulls and empty arrays, and with
   * them repeater items that are still blank, so the server couldn't find their fields.
   */
  queryContext(): Record<string, unknown> {
    const context = this.requestContext()
    const ownerState = context.ownerState

    return {
      ...context,
      ...(ownerState !== null && typeof ownerState === 'object'
        ? { ownerState: JSON.stringify(ownerState) }
        : {}),
      state: JSON.stringify(this.state.values),
    }
  }

  subscribe(listener: (state: FormState) => void): () => void {
    return this.store.subscribe(listener)
  }

  // ---------------------------------------------------------------- Values

  getValue<T = unknown>(path: string, fallback?: T): T {
    return getPath<T>(this.state.values, path, fallback)
  }

  /**
   * Set a value. Live fields schedule a server refresh (debounced); `onBlur` fields
   * refresh via `blur()` instead.
   */
  setValue(path: string, value: unknown, options: { silent?: boolean } = {}): void {
    const current = this.getValue(path)

    if (Object.is(current, value)) {
      return
    }

    this.store.set((state) => {
      const dirty = new Set(state.dirty)
      dirty.add(path)

      const errors = { ...state.errors }
      delete errors[path]

      // Item errors of a list field (`labels.2` from `nestedRecursiveRules()`) go with it.
      for (const key of Object.keys(errors)) {
        if (isItemErrorKey(key, path)) delete errors[key]
      }

      return { ...state, values: setPath(state.values, path, value), dirty, errors }
    })

    this.editsInFlight?.add(path)

    if (options.silent) {
      return
    }

    const target = this.liveTarget(path)

    if (target?.field.live && !target.field.live.onBlur) {
      this.scheduleRefresh(target.path, target.field.live.debounce ?? 150)
    }
  }

  /** Call when a field loses focus so `live(onBlur: true)` fields refresh. */
  blur(path: string): void {
    const target = this.liveTarget(path)

    if (target?.field.live?.onBlur && this.state.dirty.has(path)) {
      void this.refresh(target.path)
    }
  }

  /**
   * The field whose `live()` a change at `path` triggers, and the path to refresh: a
   * translatable field's language input (`title.en`) reports its field (`title`), whose
   * `afterStateUpdated()` gets the whole `{ code: value }` state.
   */
  private liveTarget(path: string): { field: FieldSchema; path: string } | undefined {
    const field = this.findField(path)

    if (field) return { field, path }

    const dot = path.lastIndexOf('.')

    if (dot <= 0) return undefined

    const parentPath = path.slice(0, dot)
    const parent = this.findField(parentPath)
    const code = path.slice(dot + 1)

    return parent?.translatable?.locales.some((locale) => locale.code === code)
      ? { field: parent, path: parentPath }
      : undefined
  }

  /** Replace the whole state (e.g. after the server returns a refreshed payload). */
  fill(payload: FormPayload, options: { keepDirty?: boolean } = {}): void {
    this.serverValues = payload.state ?? {}
    this.fingerprints = payload.fingerprints
    this.store.set((state) => ({
      ...state,
      components: payload.components,
      values: payload.state ?? {},
      columns: payload.columns ?? state.columns,
      dirty: options.keepDirty ? state.dirty : new Set(),
    }))
  }

  setErrors(errors: Record<string, string[] | string>): void {
    const normalized: Record<string, string[]> = {}

    for (const [key, value] of Object.entries(errors)) {
      normalized[key] = Array.isArray(value) ? value : [value]
    }

    this.store.update({ errors: normalized })
  }

  clearErrors(): void {
    this.store.update({ errors: {} })
  }

  getError(path: string): string | undefined {
    return fieldError(this.state.errors, path)
  }

  setProcessing(processing: boolean): void {
    this.store.update({ processing })
  }

  get isDirty(): boolean {
    return this.state.dirty.size > 0
  }

  findField(path: string): FieldSchema | undefined {
    return findFieldByPath(this.state.components, path, this.state.values)
  }

  // ---------------------------------------------------------------- Live refresh

  private scheduleRefresh(path: string, wait: number): void {
    let debounced = this.liveDebouncers.get(path)

    if (!debounced) {
      debounced = debounce(() => {
        void this.refresh(path)
      }, wait)
      this.liveDebouncers.set(path, debounced)
    }

    debounced()
  }

  /**
   * Send the current state to the server, which re-evaluates closures and
   * `afterStateUpdated` hooks, and replace components + values with the response.
   */
  refresh(path?: string): Promise<void> {
    const request = this.sendRefresh(path)
    this.refreshInFlight = request

    void request.finally(() => {
      if (this.refreshInFlight === request) this.refreshInFlight = null
    })

    return request
  }

  /**
   * Resolves once no live refresh is waiting or in flight: debounced refreshes are sent
   * now and awaited. Submits wait for it, so a click that blurs a `live(onBlur: true)` field
   * sends the state the server computed (`$set` in `afterStateUpdated`), not the one before.
   */
  async settle(): Promise<void> {
    for (const debounced of this.liveDebouncers.values()) debounced.flush()

    while (this.refreshInFlight) {
      await this.refreshInFlight.catch(() => undefined)
    }
  }

  /**
   * Run `callback` once the form is settled (see `settle()`): straight away when no live
   * refresh is waiting or in flight, so a submit stays synchronous in the usual case.
   */
  whenSettled(callback: () => void): void {
    const waiting = [...this.liveDebouncers.values()].some((debounced) => debounced.pending)

    if (!waiting && !this.refreshInFlight) {
      callback()

      return
    }

    void this.settle().then(callback)
  }

  private refreshInFlight: Promise<void> | null = null

  private async sendRefresh(path?: string): Promise<void> {
    if (!this.options.refreshUrl) {
      return
    }

    this.refreshController?.abort()
    const controller = new AbortController()
    this.refreshController = controller
    // The request carries the current state, so only edits made from now on are newer
    // than what the server sees.
    const edits = new Set<string>()
    this.editsInFlight = edits

    this.store.update({ refreshing: true })
    const sent = this.state.values

    try {
      const response = await requestJson<SchemaRefreshResponse>(this.options.refreshUrl, {
        method: 'POST',
        body: {
          ...this.requestContext(),
          state: sent,
          path,
          old: path ? (getPath(this.serverValues, path) ?? null) : undefined,
          // With fingerprints the server answers with only what changed.
          fingerprints: this.fingerprints,
        },
        signal: controller.signal,
      })

      if (controller.signal.aborted) {
        return
      }

      if (this.editsInFlight === edits) {
        this.editsInFlight = null
      }

      if (!this.applyResponse(response, sent, edits)) {
        // The patches didn't fit the tree: ask for the whole form instead.
        this.fingerprints = undefined
        await this.sendRefresh(path)

        return
      }

      this.options.onRefreshed?.(path)
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return
      }

      if (this.editsInFlight === edits) {
        this.editsInFlight = null
      }

      this.store.update({ refreshing: false })
      // Without an `onError`, the panel's error notification for the status is shown.
      ;(this.options.onError ?? reportRequestError)(error)
    }
  }

  /**
   * Merge a refresh response (full or partial) for the state `sent` with the request.
   * Paths in `edits` changed while the request was in flight and keep their client value;
   * everything else takes the server's (including values set by `$set`). Returns false
   * when a partial response doesn't fit the tree the store holds.
   */
  applyResponse(
    response: SchemaRefreshResponse,
    sent: Record<string, unknown>,
    edits: Iterable<string> = [],
  ): boolean {
    const merged = mergeRefreshResponse(this.state.components, sent, response)

    if (!merged) {
      this.store.update({ refreshing: false })

      return false
    }

    this.serverValues = merged.values
    this.fingerprints = merged.fingerprints

    this.store.set((state) => {
      let values = merged.values

      for (const editedPath of edits) {
        values = setPath(values, editedPath, getPath(state.values, editedPath))
      }

      return {
        ...state,
        components: merged.components,
        values,
        columns: merged.columns ?? state.columns,
        refreshing: false,
      }
    })

    return true
  }

  /**
   * Validate the fields of one wizard step (by the Step component's `key`) on the server.
   * Resolves with true when they pass; otherwise the step's errors replace the errors of
   * those fields and false is returned. Without a validation endpoint every step passes.
   */
  async validateStep(stepKey: string, fieldPaths: string[]): Promise<boolean> {
    if (!this.options.validateUrl) {
      return true
    }

    try {
      const response = await requestJson<StepValidationHaltedResponse | null>(
        this.options.validateUrl,
        {
          method: 'POST',
          body: {
            ...this.requestContext(),
            state: this.state.values,
            step: stepKey,
          },
        },
      )

      // A step hook halted: stay on the step, keep the field errors as they are.
      if (response !== null && typeof response === 'object' && response.halted) {
        const notifications = response.notifications ?? []

        if (notifications.length > 0) this.options.onNotifications?.(notifications)

        return false
      }
    } catch (error) {
      if (error instanceof HttpError && error.status === 422) {
        this.store.update({
          errors: { ...withoutStepErrors(this.state.errors, fieldPaths), ...error.errors },
        })

        return false
      }

      ;(this.options.onError ?? reportRequestError)(error)

      return false
    }

    this.store.update({ errors: withoutStepErrors(this.state.errors, fieldPaths) })

    return true
  }

  /** Search options for a searchable select at `path`. */
  async searchOptions(
    path: string,
    search: string,
  ): Promise<Array<{ value: string; label: string }>> {
    if (!this.options.optionsUrl) {
      return []
    }

    const response = await requestJson<{ options?: Array<{ value: string; label: string }> }>(
      this.options.optionsUrl,
      {
        query: { ...this.queryContext(), path, search },
      },
    )

    return response.options ?? []
  }

  async optionLabels(
    path: string,
    values: Array<string | number>,
  ): Promise<Record<string, string>> {
    if (!this.options.optionsUrl || values.length === 0) {
      return {}
    }

    const response = await requestJson<{ labels?: Record<string, string> }>(
      this.options.optionsUrl,
      {
        query: { ...this.queryContext(), path, values },
      },
    )

    return response.labels ?? {}
  }

  /** One page of icons for the IconPicker at `path` (`set`: one of its sets, or all). */
  async searchIcons(
    path: string,
    query: { search?: string; set?: string | null; page?: number },
    signal?: AbortSignal,
  ): Promise<IconPickerResponse | null> {
    if (!this.options.optionsUrl) {
      return null
    }

    return requestJson<IconPickerResponse>(this.options.optionsUrl, {
      query: {
        ...this.queryContext(),
        path,
        search: query.search ?? '',
        ...(query.set ? { set: query.set } : {}),
        page: query.page ?? 1,
      },
      signal,
    })
  }

  /**
   * The picker table of a ModalTableSelect at `path` (`query` is its table state) and the
   * labels of the records it lists.
   */
  async modalTable(
    path: string,
    identifier: string,
    query: TableQuery,
    signal?: AbortSignal,
  ): Promise<ModalTableSelectResponse | null> {
    if (!this.options.optionsUrl) {
      return null
    }

    return requestJson<ModalTableSelectResponse>(this.options.optionsUrl, {
      query: {
        ...this.queryContext(),
        path,
        table: 1,
        ...modalTableQuery(identifier, query),
      },
      signal,
    })
  }

  destroy(): void {
    debugRecorder.unregisterForm(this)
    this.refreshController?.abort()

    for (const debounced of this.liveDebouncers.values()) {
      debounced.cancel()
    }

    this.liveDebouncers.clear()
  }
}

/** The errors without those of the given fields (and of their nested paths). */
function withoutStepErrors(
  errors: Record<string, string[]>,
  fieldPaths: string[],
): Record<string, string[]> {
  const kept: Record<string, string[]> = {}

  for (const [key, messages] of Object.entries(errors)) {
    if (!fieldPaths.some((path) => key === path || key.startsWith(`${path}.`))) {
      kept[key] = messages
    }
  }

  return kept
}

/**
 * A stable key for a page form: the page class, record and the form's own key/component.
 * The context token is re-encrypted on every response, so it cannot identify a form.
 * Renderers re-initialise a FormStore from server state only when this key changes (or
 * after the form's own successful submit), never on unrelated reloads of the same page.
 */
export function formIdentity(
  page: { class?: string; record?: string | number | null } | null | undefined,
  block: { key: string; component: string; operation?: string | null },
): string {
  return JSON.stringify([
    page?.class ?? null,
    page?.record ?? null,
    block.key,
    block.component,
    block.operation ?? null,
  ])
}

/** The parts of an Inertia visit the unsaved-changes guard needs. */
export interface GuardedVisit {
  method: string
  url: URL | string
  only?: string[]
  except?: string[]
  preserveState?: unknown
}

/**
 * True when an Inertia visit would navigate away from the current form, i.e. when the
 * unsaved-changes guard should ask. Partial reloads (`only`/`except`, used by table
 * sorting, paging and polling) and state-preserving visits to the same path stay on the
 * page and keep the form, so they never prompt. Non-GET visits are submissions.
 */
export function isLeavingVisit(visit: GuardedVisit, currentUrl?: string): boolean {
  if (visit.method.toLowerCase() !== 'get') {
    return false
  }

  if ((visit.only?.length ?? 0) > 0 || (visit.except?.length ?? 0) > 0) {
    return false
  }

  const base =
    currentUrl ?? (typeof window !== 'undefined' ? window.location.href : 'http://localhost/')
  const here = new URL(base)
  const target = new URL(String(visit.url), here)

  return !(
    visit.preserveState === true &&
    target.origin === here.origin &&
    target.pathname === here.pathname
  )
}

// ---------------------------------------------------------------- Repeater helpers

export interface RepeaterItemState {
  key: string
  state: Record<string, unknown>
}

/** Append a blank item using the Repeater's template state. */
export function appendRepeaterItem(
  items: unknown[],
  templateState: Record<string, unknown>,
): unknown[] {
  return [...items, cloneState(templateState)]
}

export function removeRepeaterItem(items: unknown[], index: number): unknown[] {
  return items.filter((_, i) => i !== index)
}

export function moveRepeaterItem(items: unknown[], from: number, to: number): unknown[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items
  }

  const copy = [...items]
  const [item] = copy.splice(from, 1)
  copy.splice(to, 0, item)

  return copy
}

export function cloneRepeaterItem(items: unknown[], index: number): unknown[] {
  const copy = [...items]
  copy.splice(index + 1, 0, cloneState(items[index]))

  return copy
}

/**
 * Per-item UI state (collapsed flags, …) keyed by item index, remapped after the items
 * are reordered, removed or cloned with the helpers above so it stays with its item.
 */
export type IndexedState<T> = Record<number, T>

function remapIndexedState<T>(
  state: IndexedState<T>,
  newIndex: (index: number) => number | null,
): IndexedState<T> {
  const result: IndexedState<T> = {}

  for (const [key, value] of Object.entries(state) as [string, T][]) {
    const index = newIndex(Number(key))

    if (index !== null) result[index] = value
  }

  return result
}

export function moveIndexedState<T>(
  state: IndexedState<T>,
  from: number,
  to: number,
): IndexedState<T> {
  if (from === to) return state

  return remapIndexedState(state, (index) => {
    if (index === from) return to
    if (from < to && index > from && index <= to) return index - 1
    if (from > to && index >= to && index < from) return index + 1

    return index
  })
}

export function removeIndexedState<T>(state: IndexedState<T>, removed: number): IndexedState<T> {
  return remapIndexedState(state, (index) =>
    index === removed ? null : index > removed ? index - 1 : index,
  )
}

export function cloneIndexedState<T>(state: IndexedState<T>, cloned: number): IndexedState<T> {
  const result = remapIndexedState(state, (index) => (index > cloned ? index + 1 : index))

  if (cloned in state) result[cloned + 1] = state[cloned] as T

  return result
}
