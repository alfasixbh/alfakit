import type { ActionContext, ActionSchema, FormBlock as FormBlockSchema } from '@alfakit/core'
import {
  FormStore,
  applyFormRefresh,
  formActionsVisible,
  formIdPrefix,
  formIdentity,
  formRefreshFor,
  isImplicitSubmit,
  isLeavingVisit,
  pageFlash,
  pageFormName,
  registerConflictForm,
  registerFormSubmitter,
  registerPageForm,
  resolvePartialProps,
  shouldResyncForm,
  wizardProgressStore,
} from '@alfakit/core'
import { router } from '@inertiajs/react'
import { useCallback, useEffect, useId, useMemo, useRef } from 'react'
import {
  useActionRunner,
  useAlfakitProps,
  usePageSchema,
  usePanel,
  useStandalone,
  useT,
} from '../../context'
import { useStore } from '../../hooks/use-store'
import { ActionList } from '../actions/action-list'
import { showToast } from '../notifications/flash-toasts'
import { SchemaRenderer } from '../schema/schema-renderer'
import { FormProvider } from './form-context'

/**
 * A page form: its state lives in a FormStore, and its buttons are actions that post the
 * current values through the action endpoint.
 */
export function FormBlock({ block }: { block: FormBlockSchema }) {
  const panel = usePanel()
  const page = usePageSchema()
  const props = useAlfakitProps()
  const runner = useActionRunner()
  const t = useT()
  const token = page?.token ?? ''

  // The store survives reloads of the same form (table sorting/paging, polling,
  // relation-manager actions all deliver a new `block` object); only a different form
  // identity starts from server state again. The token is re-issued per response, so it
  // is swapped in place instead of being part of the identity.
  const identity = formIdentity(page, block)
  // Several standalone components can share a page (and field names): each form gets its
  // own field id prefix, so labels and errors point at their own inputs.
  const standalone = useStandalone()
  const instanceId = useId()

  const store = useMemo(
    () =>
      new FormStore(block, {
        token,
        component: block.component,
        idPrefix: standalone ? formIdPrefix(`form-${instanceId}`) : undefined,
        refreshUrl: panel.endpoints.schemaRefresh,
        optionsUrl: panel.endpoints.schemaOptions,
        validateUrl: panel.endpoints.schemaValidate,
        // A halted wizard step shows what its hook sent.
        onNotifications: (notifications) => notifications.forEach((n) => showToast(n)),
        // Live dashboard filters are applied by the refresh; the widgets reload to follow.
        onRefreshed: () => {
          if (latestBlock.current.liveFilters)
            router.reload({ only: resolvePartialProps(['page']) })
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [identity],
  )

  useEffect(() => () => store.destroy(), [store])

  // Named forms of custom pages (`<PageForm name>`) publish their store for page method calls.
  useEffect(() => {
    const name = pageFormName(block.component)

    return name ? registerPageForm(name, store) : undefined
  }, [block.component, store])

  // Edit pages: the conflict banner diffs and merges the main form (`detectConflicts()`).
  useEffect(
    () => (block.component === 'form' ? registerConflictForm(store) : undefined),
    [block.component, store],
  )

  useEffect(() => {
    store.setToken(token)
  }, [store, token])

  useEffect(() => {
    store.setErrors((props.errors as Record<string, string>) ?? {})
  }, [props.errors, store])

  const state = useStore(store.store)
  const context = useMemo<ActionContext>(() => ({ token, component: 'page' }), [token])
  const submitting = useRef(false)
  // After this form's own successful submit, refill from the server's new state. The new
  // block may arrive before or after Inertia's `success` event, so handle both orders.
  const latestBlock = useRef(block)
  const submittedBlock = useRef<FormBlockSchema | null>(null)
  const refillPending = useRef(false)
  // Another action succeeded and its new block has not arrived yet.
  const resyncPending = useRef(false)
  // The block when the latest non-GET visit started, to tell whether its response arrived.
  const visitBlock = useRef<FormBlockSchema | null>(null)

  useEffect(() => {
    latestBlock.current = block

    if (refillPending.current) {
      refillPending.current = false
      store.fill(block)
    }

    if (resyncPending.current) {
      resyncPending.current = false

      if (!store.isDirty) store.fill(block)
    }
  }, [block, store])

  const actions: ActionSchema[] = useMemo(
    () => block.actions.map((action) => ({ ...action, hasModal: false })),
    [block.actions],
  )

  const trigger = useCallback(
    async (action: ActionSchema, ctx: ActionContext) => {
      if (action.url && !action.hasAction) {
        return runner.trigger(action, ctx)
      }

      submitting.current = true
      submittedBlock.current = latestBlock.current
      store.setProcessing(true)
      // A click that blurred a live field started a refresh: send the state it returns.
      store.whenSettled(
        () => runner.execute(action, ctx, store.state.values),
        // A picked file failed to upload: nothing is sent, its field shows why.
        () => {
          store.setProcessing(false)
          submitting.current = false
        },
      )
    },
    [runner, store],
  )

  // Buttons elsewhere with `formId('form')` (a header "Save") submit through this form.
  useEffect(() => registerFormSubmitter(block.component, trigger), [block.component, trigger])

  // `refreshFormData([...])`: an action changed the record; copy those fields in.
  useEffect(
    () =>
      router.on('success', (event) => {
        const refresh = formRefreshFor(pageFlash(event.detail.page), block.component)

        if (refresh) applyFormRefresh(store, refresh)
      }),
    [block.component, store],
  )

  // Wizard forms (`HasWizard` pages) show their buttons on the last step only.
  const progressStore = useMemo(() => wizardProgressStore(store), [store])
  const progress = useStore(progressStore)
  const showActions = formActionsVisible(block, progress)

  // Track this form's own submit visit so unrelated reloads finishing meanwhile (polling,
  // relation-manager paging) neither end its processing state nor count as its success.
  const submitVisit = useRef<string | null>(null)

  useEffect(() => {
    const offStart = router.on('start', (event) => {
      const visit = event.detail.visit

      if (submitting.current && !submitVisit.current && visit.method !== 'get') {
        submitVisit.current = visit.id
      }

      if (visit.method !== 'get') visitBlock.current = latestBlock.current
    })

    const offSuccess = router.on('success', (event) => {
      const id = submitVisit.current

      // Another action changed the record: show the server's new form unless it holds edits.
      if (!id && shouldResyncForm(pageFlash(event.detail.page), store)) {
        if (latestBlock.current !== visitBlock.current) {
          store.fill(latestBlock.current)
        } else {
          resyncPending.current = true
        }

        return
      }

      if (!id || (event.detail.visitId ?? id) !== id) return

      // A halted action (rate limit, `halt()`) saved nothing: keep what the user typed.
      if (pageFlash(event.detail.page).alfakitAction?.status === 'halted') return

      if (latestBlock.current !== submittedBlock.current) {
        store.fill(latestBlock.current)
      } else {
        refillPending.current = true
      }
    })

    const offFinish = router.on('finish', (event) => {
      if (submitVisit.current && event.detail.visit.id !== submitVisit.current) return

      store.setProcessing(false)
      submitting.current = false
      submitVisit.current = null
    })

    return () => {
      offStart()
      offSuccess()
      offFinish()
    }
  }, [store])

  useEffect(() => {
    if (!panel.unsavedChangesAlerts) {
      return
    }

    return router.on('before', (event) => {
      if (
        store.isDirty &&
        !submitting.current &&
        isLeavingVisit(event.detail.visit) &&
        !window.confirm(t('unsaved_changes', {}, 'You have unsaved changes. Leave anyway?'))
      ) {
        event.preventDefault()
      }
    })
  }, [panel.unsavedChangesAlerts, store, t])

  const primary = actions[0]

  return (
    <FormProvider store={store}>
      <form
        data-slot="form-block"
        className="flex flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault()

          if (primary && showActions) {
            void trigger(primary, context)
          }
        }}
        onKeyDown={(event) => {
          // Enter in a text field runs the primary action (actions are type="button").
          if (primary && showActions && isImplicitSubmit(event.nativeEvent, event.currentTarget)) {
            event.preventDefault()
            void trigger(primary, context)
          }
        }}
      >
        <fieldset disabled={state.processing || block.operation === 'view'} className="contents">
          <SchemaRenderer components={state.components} columns={state.columns} />
        </fieldset>
        {actions.length > 0 && showActions && (
          <div data-slot="form-actions" className="border-t pt-6">
            <ActionList actions={actions} context={context} onTrigger={trigger} />
          </div>
        )}
      </form>
    </FormProvider>
  )
}
