import type { Page } from '@inertiajs/core'
import { revealAutofocusField } from './autofocus'
import {
  CONFLICT_ERROR_KEY,
  currentRecordVersion,
  markRecordSubmitted,
  RECORD_VERSION_INPUT,
  reportSaveConflict,
} from './conflicts'
import { isFieldActionContext } from './field-actions'
import { pageFlash } from './flash'
import { isLeavingVisit, type FormStore } from './form'
import { HttpError, inertiaPost, requestJson, router } from './http'
import { ACTION_PATH_SEPARATOR, actionPath, PASSWORD_CONFIRMATION_INPUT } from './modal-actions'
import { openDatabaseNotifications } from './notifications'
import { submitFormById } from './page-actions'
import { currentPageQuery } from './page-query'
import type {
  ActionModalCancelledResponse,
  ActionModalSchema,
  ActionSchema,
  AnyActionSchema,
} from './schema/actions'
import { isActionGroup } from './schema/actions'
import type { RecordKey, Size } from './schema/common'
import type { FieldActionResponse } from './schema/form'
import type { NotificationSchema } from './schema/notifications'
import { createStore, type Store } from './store'

export interface ActionContext {
  /** Encrypted page context token. */
  token: string
  /** `page`, `table`, `relationManager:Class`, `widget:Class`. */
  component?: string
  record?: RecordKey | null
  /** Selected record keys for bulk actions. */
  records?: RecordKey[]
  /** "All filtered records" bulk selection. */
  allRecords?: boolean
  arguments?: Record<string, unknown>
  /**
   * Names of the actions whose modals this action sits in, outermost first (actions in a
   * modal's footer). The server resolves the action by its path, `parent>child`.
   */
  parents?: string[]
  /**
   * Field actions (`component` = `field:{schema}::{key}`): the form the field belongs to.
   * Its state is sent with the action and the refreshed form is merged back into it.
   */
  form?: FormStore
}

export interface ExecuteOptions {
  /** The current password, for actions with `requiresPasswordConfirmation()`. */
  password?: string
  /**
   * "Create & create another": run with the `another` argument and, when the server keeps
   * the modal open, reload it with a fresh form (keeping `preserveFormData` fields).
   */
  createAnother?: boolean
}

/** The argument `CreateAction` reads for "Create & create another". */
export const CREATE_ANOTHER_ARGUMENT = 'another'

/**
 * The state of the fresh form after "Create & create another": the server's defaults,
 * plus the previous values of the fields `preserveFormData` names (all of them for `true`).
 */
export function createAnotherState(
  fresh: Record<string, unknown>,
  previous: Record<string, unknown>,
  preserve: boolean | string[] | undefined,
): Record<string, unknown> {
  if (!preserve) {
    return fresh
  }

  const keys = preserve === true ? Object.keys(previous) : preserve
  const state = { ...fresh }

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(previous, key)) {
      state[key] = previous[key]
    }
  }

  return state
}

export interface OpenModal {
  action: ActionSchema
  context: ActionContext
  modal: ActionModalSchema
  /** Current form values of the modal form. */
  errors: Record<string, string[]>
  processing: boolean
  /** Field actions: settles `runField()` with the action's result (undefined when closed). */
  resolve?: (result: unknown) => void
  /**
   * Bumped by `resetModal()` ("Create & create another"): the renderer focuses the form's
   * `autofocus()` field again (`focusAutofocusField()`) once the fresh form rendered.
   */
  refocus?: number
}

export interface ActionRunnerState {
  /** Stack of open modals (nested modals are possible). */
  modals: OpenModal[]
  /** Name of the action currently loading its modal. */
  loading: string | null
  /**
   * Which run of it (component, action path and record): a table renders the same action
   * once per row, and only the clicked row's button is loading (`isActionLoading()`).
   */
  loadingKey?: string | null
}

export interface ActionRunnerOptions {
  endpoints: { action: string; modal: string }
  onError?: (error: unknown) => void
  /** Called after a successful run so the UI can e.g. clear a table selection. */
  onSuccess?: (action: ActionSchema, context: ActionContext) => void
  /**
   * Shows notifications that arrive in JSON responses (a modal that `mountUsing()`
   * cancelled, field actions). Renderers can also set it with `setNotificationHandler()`.
   */
  onNotifications?: (notifications: NotificationSchema[]) => void
}

/**
 * Drives action buttons: plain links navigate, actions without a modal post straight to
 * the server, and actions with a modal fetch the modal schema first.
 */
export class ActionRunner {
  public readonly store: Store<ActionRunnerState>

  /** Runs in flight, so a double click or a repeated shortcut doesn't submit twice. */
  private readonly running = new Set<string>()

  /** The form of each open modal (registered by the renderer), by modal path. */
  private readonly modalForms = new Map<string, FormStore>()

  constructor(private readonly options: ActionRunnerOptions) {
    this.store = createStore<ActionRunnerState>({ modals: [], loading: null, loadingKey: null })
  }

  get state(): ActionRunnerState {
    return this.store.get()
  }

  /** Show notifications from JSON responses with this handler (e.g. the renderer's toasts). */
  setNotificationHandler(
    handler: ((notifications: NotificationSchema[]) => void) | undefined,
  ): void {
    this.options.onNotifications = handler
  }

  private notify(notifications: NotificationSchema[] | undefined): void {
    if (notifications && notifications.length > 0) {
      this.options.onNotifications?.(notifications)
    }
  }

  /** Point the runner at the current panel's endpoints (they change per tenant/panel). */
  setEndpoints(endpoints: Partial<ActionRunnerOptions['endpoints']>): void {
    Object.assign(this.options.endpoints, endpoints)
  }

  /**
   * The renderer registers the form of an open modal, so nested actions can send its state
   * (`$mountedActions`, `getRawData()`) and `fillData()` can write into it. Returns the
   * function that unregisters it.
   */
  registerModalForm(action: ActionSchema, context: ActionContext, form: FormStore): () => void {
    const key = actionPath(action, context)
    this.modalForms.set(key, form)

    return () => {
      if (this.modalForms.get(key) === form) this.modalForms.delete(key)
    }
  }

  /** The open modals of the actions a nested action sits in, outermost first. */
  parentModals(context: ActionContext): Array<OpenModal | undefined> {
    const parents = context.parents ?? []

    return parents.map((_, index) => {
      const path = parents.slice(0, index + 1).join(ACTION_PATH_SEPARATOR)

      return this.state.modals.find(
        (modal) =>
          modal.context.component === context.component &&
          actionPath(modal.action, modal.context) === path,
      )
    })
  }

  /**
   * The form state of the modals a nested action sits in, outermost first (undefined when
   * none of them has a form).
   */
  mountedData(context: ActionContext): Array<Record<string, unknown>> | undefined {
    const parents = context.parents ?? []

    if (parents.length === 0) {
      return undefined
    }

    const forms = parents.map((_, index) =>
      this.modalForms.get(parents.slice(0, index + 1).join(ACTION_PATH_SEPARATOR)),
    )

    // Parents without a form have nothing to send.
    if (forms.every((form) => !form)) {
      return undefined
    }

    return forms.map((form) => form?.state.values ?? {})
  }

  /** Entry point for a click on an action button. */
  async trigger(action: ActionSchema, context: ActionContext): Promise<void> {
    if (action.disabled) {
      return
    }

    // `openDatabaseNotifications()`: a client-side button.
    if (action.opensDatabaseNotifications) {
      openDatabaseNotifications()

      return
    }

    // `makeModalSubmitAction()`: submit the modal this button sits in, with its arguments.
    if (action.submitsModal) {
      this.submitParentModal(action, context)

      return
    }

    // `formId()`: the page form submits itself with its state, wherever the button is.
    if (submitFormById(action, context)) {
      return
    }

    // `postToUrl()`: a POST request to the URL (e.g. "lock session"), not a visit.
    if (action.url && action.postToUrl) {
      const { router } = await import('@inertiajs/core')
      router.post(action.url)

      return
    }

    if (action.url && !action.hasAction && !action.hasModal) {
      if (action.openUrlInNewTab) {
        window.open(action.url, '_blank', 'noopener')
      } else {
        const { router } = await import('@inertiajs/core')
        router.visit(action.url)
      }

      return
    }

    if (isFieldActionContext(context)) {
      await this.runField(action, context)

      return
    }

    if (action.hasModal) {
      await this.openModal(action, context)

      return
    }

    this.execute(action, context)
  }

  /**
   * Run a field action (opening its modal first, if it has one) and resolve with its
   * result once it ran, or with undefined when the modal is closed without running it.
   */
  async runField(action: ActionSchema, context: ActionContext): Promise<unknown> {
    if (action.disabled) {
      return undefined
    }

    if (action.hasModal) {
      return new Promise<unknown>((resolve) => {
        void this.openModal(action, context, resolve)
      })
    }

    return this.executeField(action, context)
  }

  /**
   * Run the action whose modal `button` sits in (a `makeModalSubmitAction()` button) with
   * that modal's form state and the button's arguments.
   */
  submitParentModal(button: ActionSchema, context: ActionContext): void {
    const parents = context.parents ?? []
    const open = this.parentModals(context).at(-1)

    if (!open || parents.length === 0) {
      return
    }

    const form = this.modalForms.get(parents.join(ACTION_PATH_SEPARATOR))

    this.execute(
      open.action,
      { ...open.context, arguments: { ...open.context.arguments, ...button.arguments } },
      form?.state.values ?? {},
    )
  }

  /**
   * Close a modal the user dismissed (cancel, Escape, clicking away, close button). With
   * `cancelParentActionsOnClose()` its parents close too.
   */
  cancelModal(name: string): void {
    const open = this.state.modals.find((modal) => modal.action.name === name)
    const cancel = open?.modal.cancelParentActionsOnClose

    this.closeModal(name)

    if (open && cancel) {
      this.closeParents(open.context, cancel)
    }
  }

  /** Close the modals `context` sits in: all of them, or up to and including `until`. */
  closeParents(context: ActionContext, until: true | string): void {
    const parents = [...(context.parents ?? [])].reverse()

    for (const parent of parents) {
      this.closeModal(parent)

      if (until !== true && parent === until) {
        break
      }
    }
  }

  async openModal(
    action: ActionSchema,
    context: ActionContext,
    resolve?: (result: unknown) => void,
  ): Promise<void> {
    const key = `modal:${runKey(action, context)}`

    if (this.running.has(key)) {
      resolve?.(undefined)

      return
    }

    this.running.add(key)
    this.store.update({ loading: action.name, loadingKey: runKey(action, context) })

    try {
      const modal = await this.fetchModal(action, context)

      // `mountUsing()` halted or cancelled the action: the modal stays closed.
      if (isCancelledModal(modal)) {
        this.store.update({ loading: null, loadingKey: null })
        this.notify(modal.notifications)
        resolve?.(undefined)

        return
      }

      this.store.set((state) => ({
        loading: null,
        loadingKey: null,
        modals: [
          ...state.modals,
          { action, context, modal, errors: {}, processing: false, resolve },
        ],
      }))
    } catch (error) {
      this.store.update({ loading: null, loadingKey: null })
      resolve?.(undefined)
      this.options.onError?.(error)
    } finally {
      this.running.delete(key)
    }
  }

  private fetchModal(
    action: ActionSchema,
    context: ActionContext,
  ): Promise<ActionModalSchema | ActionModalCancelledResponse> {
    const params = {
      token: context.token,
      component: context.component,
      action: actionPath(action, context),
      record: context.record ?? undefined,
      arguments: context.arguments,
    }
    const mountedData = this.mountedData(context)

    // Field actions send the form state, and nested actions their parents' form state,
    // which needs a request body.
    if (isFieldActionContext(context)) {
      return requestJson<ActionModalSchema | ActionModalCancelledResponse>(
        this.options.endpoints.modal,
        { method: 'POST', body: { ...params, state: context.form?.state.values ?? {} } },
      )
    }

    return requestJson<ActionModalSchema | ActionModalCancelledResponse>(
      this.options.endpoints.modal,
      mountedData ? { method: 'POST', body: { ...params, mountedData } } : { query: params },
    )
  }

  /**
   * After "Create & create another": load the modal again so its form starts from the
   * server's defaults, keeping the `preserveFormData` fields from the values just sent.
   */
  async resetModal(name: string, previous: Record<string, unknown> = {}): Promise<void> {
    const open = this.state.modals.find((modal) => modal.action.name === name)

    if (!open) {
      return
    }

    try {
      const modal = await this.fetchModal(open.action, open.context)

      if (isCancelledModal(modal)) {
        this.notify(modal.notifications)
        this.closeModal(name)

        return
      }

      if (modal.form) {
        modal.form = {
          ...modal.form,
          // A wizard goes back to the step holding the `autofocus()` field.
          components: revealAutofocusField(modal.form.components),
          state: createAnotherState(modal.form.state, previous, modal.preserveFormData),
        }
      }

      this.store.set((state) => ({
        ...state,
        modals: state.modals.map((entry) =>
          entry === open || entry.action.name === name
            ? { ...entry, modal, errors: {}, refocus: (entry.refocus ?? 0) + 1 }
            : entry,
        ),
      }))
    } catch (error) {
      this.options.onError?.(error)
    }
  }

  /** Whether this action is currently being submitted for this context. */
  isRunning(action: ActionSchema, context: ActionContext): boolean {
    return this.running.has(runKey(action, context))
  }

  closeModal(name?: string): void {
    const modals = this.state.modals
    const remaining = name
      ? modals.filter((modal) => modal.action.name !== name)
      : modals.slice(0, -1)

    this.store.set((state) => ({ ...state, modals: remaining }))

    // A field action's caller learns that its modal closed without running.
    for (const modal of modals) {
      if (!remaining.includes(modal)) modal.resolve?.(undefined)
    }
  }

  /** Submit the topmost modal (or run a modal-less action) through Inertia. */
  execute(
    action: ActionSchema,
    context: ActionContext,
    data: Record<string, unknown> = {},
    options: ExecuteOptions = {},
  ): void {
    if (isFieldActionContext(context)) {
      void this.executeField(action, context, data)

      return
    }

    const key = runKey(action, context)

    if (this.running.has(key)) {
      return
    }

    this.running.add(key)
    this.setProcessing(action.name, true)

    // Edit pages (`detectConflicts()`): page actions send the version the form was loaded
    // from, so the server refuses to save over somebody else's changes.
    const version = context.component === 'page' ? currentRecordVersion() : null

    if (version !== null) markRecordSubmitted()

    inertiaPost(
      actionEndpoint(this.options.endpoints.action, context),
      {
        ...(version !== null ? { [RECORD_VERSION_INPUT]: version } : {}),
        token: context.token,
        component: context.component,
        action: actionPath(action, context),
        record: context.record ?? undefined,
        records: context.records,
        allRecords: context.allRecords ? 1 : undefined,
        bulk: context.records !== undefined ? 1 : undefined,
        arguments: options.createAnother
          ? { ...context.arguments, [CREATE_ANOTHER_ARGUMENT]: true }
          : context.arguments,
        tableQuery: currentPageQuery(),
        data,
        mountedData: this.mountedData(context),
        [PASSWORD_CONFIRMATION_INPUT]: options.password || undefined,
      },
      {
        onError: (errors) => {
          if (CONFLICT_ERROR_KEY in (errors as Record<string, unknown>)) reportSaveConflict()

          // A nested action without a modal of its own (e.g. `getValidatedData()` on its
          // parent failed): the parent's modal shows the errors.
          const hasModal = this.state.modals.some((modal) => modal.action.name === action.name)
          const parent = hasModal ? undefined : this.parentModals(context).at(-1)

          this.setErrors(
            parent ? parent.action.name : action.name,
            errors as Record<string, string>,
          )
        },
        onSuccess: (page) => {
          const flash = pageFlash(page as Page).alfakitAction

          // `fillData()`: values written into the parents' forms.
          for (const filled of flash?.parentData ?? []) {
            const parents = context.parents ?? []
            const index = parents.lastIndexOf(filled.name)
            const form =
              index >= 0
                ? this.modalForms.get(parents.slice(0, index + 1).join(ACTION_PATH_SEPARATOR))
                : undefined

            for (const [path, value] of Object.entries(filled.data)) {
              form?.setValue(path, value, { silent: true })
            }
          }

          if (
            !flash ||
            flash.status === 'cancelled' ||
            (flash.status === 'success' && flash.closeModal !== false)
          ) {
            this.closeModal(action.name)
          }

          // `cancelParentActions()`: the modals this nested action was opened from close too.
          if (flash?.status === 'success' && flash.cancelParentActions) {
            this.closeParents(
              context,
              typeof flash.cancelParentActions === 'string' ? flash.cancelParentActions : true,
            )
          }

          // `replaceMountedAction()`: the next action opens (or runs) in place of this one.
          const replacement = flash?.status === 'success' ? flash.replaceMountedAction : undefined

          if (replacement) {
            const next: ActionSchema = {
              type: 'Action',
              name: replacement.name,
              hasModal: replacement.hasModal || undefined,
              hasAction: true,
            }
            const nextContext: ActionContext = {
              ...context,
              arguments: replacement.arguments ?? undefined,
            }

            if (replacement.hasModal) {
              void this.openModal(next, nextContext)
            } else {
              this.execute(next, nextContext)
            }
          }

          if (flash?.status === 'success' && flash.closeModal === false && options.createAnother) {
            void this.resetModal(action.name, data)
          }

          if (!flash || flash.status === 'success') {
            this.options.onSuccess?.(action, context)
          }
        },
        onFinish: () => {
          this.running.delete(key)
          this.setProcessing(action.name, false)
        },
      },
    )
  }

  /**
   * Run an action and resolve with its JSON result (for callers that don't want an
   * Inertia visit, e.g. a custom widget).
   */
  async executeJson<T = unknown>(
    action: ActionSchema,
    context: ActionContext,
    data: Record<string, unknown> = {},
  ): Promise<T> {
    try {
      const response = await requestJson<{ result: T }>(
        actionEndpoint(this.options.endpoints.action, context),
        {
          method: 'POST',
          body: {
            token: context.token,
            component: context.component,
            action: actionPath(action, context),
            record: context.record ?? undefined,
            records: context.records,
            allRecords: context.allRecords ? 1 : undefined,
            bulk: context.records !== undefined ? 1 : undefined,
            arguments: context.arguments,
            tableQuery: currentPageQuery(),
            data,
          },
        },
      )

      return response.result
    } catch (error) {
      if (error instanceof HttpError && error.status === 422) {
        this.setErrors(
          action.name,
          Object.fromEntries(
            Object.entries(error.errors).map(([key, messages]) => [key, messages[0] ?? '']),
          ),
        )
      }

      throw error
    }
  }

  /**
   * Run a field action as JSON with its form's state; merge the refreshed form from the
   * response, settle the modal's `runField()` promise and close the modal.
   */
  async executeField(
    action: ActionSchema,
    context: ActionContext,
    data: Record<string, unknown> = {},
  ): Promise<unknown> {
    const key = runKey(action, context)

    if (this.running.has(key)) {
      return undefined
    }

    this.running.add(key)
    this.setProcessing(action.name, true)

    const form = context.form
    const sent = form?.state.values ?? {}

    try {
      const response = await requestJson<FieldActionResponse>(
        actionEndpoint(this.options.endpoints.action, context),
        {
          method: 'POST',
          body: {
            token: context.token,
            component: context.component,
            action: actionPath(action, context),
            record: context.record ?? undefined,
            arguments: context.arguments,
            data,
            state: sent,
            fingerprints: form?.currentFingerprints,
          },
        },
      )

      // A partial response that doesn't fit the tree falls back to a full refresh.
      if (response.form && form && !form.applyResponse(response.form, sent)) {
        void form.refresh()
      }

      this.notify(response.notifications)

      if (response.status === 'halted') {
        return undefined
      }

      if (response.status === 'success') {
        const modal = this.state.modals.find((open) => open.action.name === action.name)
        modal?.resolve?.(response.result)
      }

      if (response.status === 'cancelled' || response.closeModal !== false) {
        this.closeModal(action.name)
      }

      if (response.status === 'success') {
        this.options.onSuccess?.(action, context)

        if (response.redirect) {
          const { router } = await import('@inertiajs/core')
          router.visit(response.redirect)
        }
      }

      return response.status === 'success' ? response.result : undefined
    } catch (error) {
      if (error instanceof HttpError && error.status === 422) {
        this.setErrors(
          action.name,
          Object.fromEntries(
            Object.entries(error.errors).map(([field, messages]) => [field, messages[0] ?? '']),
          ),
        )
      } else {
        this.options.onError?.(error)
      }

      return undefined
    } finally {
      this.running.delete(key)
      this.setProcessing(action.name, false)
    }
  }

  private setProcessing(name: string, processing: boolean): void {
    this.store.set((state) => ({
      ...state,
      modals: state.modals.map((modal) =>
        modal.action.name === name
          ? { ...modal, processing, errors: processing ? {} : modal.errors }
          : modal,
      ),
    }))
  }

  private setErrors(name: string, errors: Record<string, string>): void {
    const normalized: Record<string, string[]> = {}

    for (const [key, message] of Object.entries(errors)) {
      normalized[key] = [message]
    }

    this.store.set((state) => ({
      ...state,
      modals: state.modals.map((modal) =>
        modal.action.name === name ? { ...modal, errors: normalized } : modal,
      ),
    }))
  }
}

/**
 * Whether an action button should bind its key bindings globally. Record actions repeat
 * on every row, so a page-wide shortcut would run them once per record; they only bind
 * when rendered outside a record (header, page and bulk actions).
 */
export function bindsKeyBindings(
  action: Pick<ActionSchema, 'keyBindings' | 'disabled'>,
  context: Pick<ActionContext, 'record'>,
): boolean {
  return Boolean(action.keyBindings?.length) && !action.disabled && context.record == null
}

/** Button sizes every renderer's shadcn `Button` understands. */
export type ActionButtonSize = 'xs' | 'sm' | 'default' | 'lg'

/**
 * The button size for an action: its own `size()` wins over the size the surrounding
 * list asks for (`md` is the default button, `xl` the largest one).
 */
export function resolveActionSize(
  size: Size | null | undefined,
  fallback: ActionButtonSize = 'default',
): ActionButtonSize {
  switch (size) {
    case 'xs':
      return 'xs'
    case 'sm':
      return 'sm'
    case 'md':
      return 'default'
    case 'lg':
    case 'xl':
      return 'lg'
    default:
      return fallback
  }
}

/** The square icon-only button that matches a button size. */
export function iconButtonSize(size: ActionButtonSize): 'icon-xs' | 'icon-sm' | 'icon' {
  return size === 'xs' ? 'icon-xs' : size === 'sm' ? 'icon-sm' : 'icon'
}

export interface DropdownPlacement {
  side: 'top' | 'right' | 'bottom' | 'left'
  align: 'start' | 'center' | 'end'
}

/**
 * Parse an ActionGroup `dropdownPlacement()` (`bottom-start`, `top-end`, `left`, …) into the
 * side/align pair dropdown primitives take. Defaults to `bottom` / `end`.
 */
export function parseDropdownPlacement(placement: string | null | undefined): DropdownPlacement {
  const [side, align] = (placement ?? '').split('-')
  const sides = ['top', 'right', 'bottom', 'left'] as const
  const aligns = ['start', 'center', 'end'] as const

  const knownSide = sides.find((candidate) => candidate === side)
  const resolvedAlign =
    aligns.find((candidate) => candidate === align) ?? (knownSide && !align ? 'center' : 'end')

  return { side: knownSide ?? 'bottom', align: resolvedAlign }
}

/** Every action inside a group, nested groups flattened. */
export function flattenActionGroup(actions: AnyActionSchema[]): ActionSchema[] {
  return actions.flatMap((action) =>
    isActionGroup(action) ? flattenActionGroup(action.actions) : [action],
  )
}

/**
 * Whether an open modal is hidden because a nested modal was opened from it. Nested modals
 * hide their parents unless they opt into `overlayParentActions()`; a hidden parent shows
 * again when the child closes.
 */
export function isModalHiddenByChild(modals: OpenModal[], index: number): boolean {
  const modal = modals[index]

  if (!modal) {
    return false
  }

  const path = actionPath(modal.action, modal.context)

  return modals.slice(index + 1).some((child) => {
    if (child.modal.overlayParent === true) return false

    const parents = child.context.parents ?? []

    return parents.some(
      (_, position) => parents.slice(0, position + 1).join(ACTION_PATH_SEPARATOR) === path,
    )
  })
}

/** Justify class keyword for modal footer buttons: `footerActionsAlignment`, else `alignment`. */
export function modalFooterAlignment(
  modal: Pick<ActionModalSchema, 'alignment' | 'footerActionsAlignment'>,
): 'start' | 'center' | 'end' | 'between' {
  const alignment = modal.footerActionsAlignment ?? modal.alignment

  switch (alignment) {
    case 'start':
    case 'center':
    case 'between':
      return alignment
    default:
      return 'end'
  }
}

/**
 * The physical side a slide-over enters from: `end` (default) is the right edge in
 * left-to-right documents and the left edge in right-to-left ones.
 */
export function slideOverSide(
  position: 'start' | 'end' | null | undefined,
  direction: 'ltr' | 'rtl' = 'ltr',
): 'left' | 'right' {
  const atStart = position === 'start'

  return atStart === (direction === 'rtl') ? 'right' : 'left'
}

function isCancelledModal(
  modal: ActionModalSchema | ActionModalCancelledResponse,
): modal is ActionModalCancelledResponse {
  return (modal as Partial<ActionModalCancelledResponse>).cancelled === true
}

/**
 * Whether closing a modal has to ask first: its form changed and the modal has
 * `unsavedChangesAlert` (the action's own setting or the panel's `unsavedChangesAlerts()`).
 */
export function shouldConfirmModalClose(
  modal: Pick<ActionModalSchema, 'unsavedChangesAlert'>,
  form: { isDirty: boolean } | null | undefined,
): boolean {
  return Boolean(modal.unsavedChangesAlert && form?.isDirty)
}

/**
 * Ask whether to close a modal with unsaved changes (`window.confirm`); true when it may
 * close. Without changes (or the alert) it never asks.
 */
export function confirmModalClose(
  modal: Pick<ActionModalSchema, 'unsavedChangesAlert'>,
  form: { isDirty: boolean } | null | undefined,
  message: string,
): boolean {
  if (!shouldConfirmModalClose(modal, form) || typeof window === 'undefined') {
    return true
  }

  return window.confirm(message)
}

/**
 * Warn before leaving the page (a reload, or an Inertia visit when `message` is given)
 * while a modal form with `unsavedChangesAlert` has unsaved changes. Returns a function
 * that removes the listeners.
 */
export function guardModalUnload(
  modal: Pick<ActionModalSchema, 'unsavedChangesAlert'>,
  form: { isDirty: boolean } | null | undefined,
  message?: string,
): () => void {
  if (!modal.unsavedChangesAlert || !form || typeof window === 'undefined') {
    return () => {}
  }

  const listener = (event: BeforeUnloadEvent) => {
    if (form.isDirty) {
      event.preventDefault()
      event.returnValue = ''
    }
  }

  window.addEventListener('beforeunload', listener)

  const removeVisitGuard = message
    ? router.on('before', (event) => {
        if (form.isDirty && isLeavingVisit(event.detail.visit) && !window.confirm(message)) {
          event.preventDefault()
        }
      })
    : () => {}

  return () => {
    window.removeEventListener('beforeunload', listener)
    removeVisitGuard()
  }
}

/** The context of a user or tenant menu action: the page's token and the menu's component. */
export function menuActionContext(token: string, menu: 'userMenu' | 'tenantMenu'): ActionContext {
  return { token, component: menu }
}

/**
 * Split menu entries into their groups (`group` index, nested arrays in
 * `userMenuItems()`), in order; renderers draw a separator between groups.
 */
export function groupMenuItems<T extends { group?: number }>(items: T[]): T[][] {
  const groups: T[][] = []
  let current: number | null = null

  for (const item of items) {
    const group = item.group ?? 0

    if (current === null || group !== current) {
      groups.push([])
      current = group
    }

    groups[groups.length - 1]!.push(item)
  }

  return groups
}

/** Whether this button's run (this action for this record) is fetching its modal. */
export function isActionLoading(
  state: ActionRunnerState,
  action: ActionSchema,
  context: ActionContext,
): boolean {
  return state.loadingKey === runKey(action, context)
}

/** Whether this button's run (this action for this record) has a modal that is submitting. */
export function isActionProcessing(
  state: ActionRunnerState,
  action: ActionSchema,
  context: ActionContext,
): boolean {
  const key = runKey(action, context)

  return state.modals.some(
    (modal) => modal.processing && runKey(modal.action, modal.context) === key,
  )
}

function runKey(action: Pick<ActionSchema, 'name'>, context: ActionContext): string {
  return [context.component ?? 'page', actionPath(action, context), context.record ?? ''].join(
    '\u0000',
  )
}

/**
 * The action endpoint for a run. "All records" bulk actions carry the page's query string
 * (filters, search, list tab), so the server selects exactly the records the table shows.
 */
export function actionEndpoint(
  endpoint: string,
  context: Pick<ActionContext, 'allRecords'>,
  search: string = typeof window !== 'undefined' ? window.location.search : '',
): string {
  if (!context.allRecords || search.length <= 1) {
    return endpoint
  }

  return endpoint + (endpoint.includes('?') ? '&' : '?') + search.replace(/^\?/, '')
}
