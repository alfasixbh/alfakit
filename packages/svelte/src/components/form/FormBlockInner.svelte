<script lang="ts">
  import type { ActionContext, ActionSchema, FormBlock as FormBlockSchema } from '@alfakit/core'
  import {
    FormStore,
    applyFormRefresh,
    formActionsVisible,
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
  import { router } from '@inertiajs/svelte'
  import { onDestroy, untrack } from 'svelte'
  import {
    useActionRunner,
    useAlfakitProps,
    usePageSchema,
    usePanel,
    useT,
  } from '../../context.svelte'
  import { useStore } from '../../hooks/store.svelte'
  import ActionList from '../actions/ActionList.svelte'
  import SchemaRenderer from '../schema/SchemaRenderer.svelte'
  import { showToast } from '../notifications/toast'
  import { provideForm } from './form-context.svelte'

  let { block }: { block: FormBlockSchema } = $props()

  const panel = usePanel()
  const runner = useActionRunner()
  const t = useT()
  // The token is re-issued on every response; keep the latest without resetting the form.
  const token = $derived(usePageSchema()?.token ?? '')

  /** A page form: its state lives in a FormStore, and its buttons are actions that post the current values through the action endpoint. */
  const store = provideForm(
    untrack(
      () =>
        new FormStore(block, {
          token,
          component: block.component,
          refreshUrl: panel.endpoints.schemaRefresh,
          optionsUrl: panel.endpoints.schemaOptions,
          validateUrl: panel.endpoints.schemaValidate,
          // A halted wizard step shows what its hook sent.
          onNotifications: (notifications) => notifications.forEach((n) => showToast(n)),
          // Live dashboard filters are applied by the refresh; the widgets reload to follow.
          onRefreshed: () => {
            if (block.liveFilters) router.reload({ only: resolvePartialProps(['page']) })
          },
        }),
    ),
  )

  const state = useStore(store.store)

  // Named forms of custom pages (`<PageForm name>`) publish their store for page method calls.
  $effect(() => {
    const name = pageFormName(block.component)

    return name ? registerPageForm(name, store) : undefined
  })

  // Edit pages: the conflict banner diffs and merges the main form (`detectConflicts()`).
  $effect(() => (block.component === 'form' ? registerConflictForm(store) : undefined))
  const context = $derived<ActionContext>({ token, component: 'page' })
  let submitting = false

  $effect(() => {
    store.setToken(token)
  })

  // After this form's own successful submit, refill from the server's new state. The new
  // block may arrive before or after Inertia's `success` event, so handle both orders.
  let submittedBlock: FormBlockSchema | null = null
  let refillPending = false
  // Another action succeeded and its new block has not arrived yet.
  let resyncPending = false

  $effect(() => {
    const next = block

    untrack(() => {
      if (refillPending) {
        refillPending = false
        store.fill(next)
      }

      if (resyncPending) {
        resyncPending = false

        if (!store.isDirty) store.fill(next)
      }
    })
  })

  const actions = $derived<ActionSchema[]>(
    block.actions.map((action) => ({ ...action, hasModal: false })),
  )
  const primary = $derived(actions[0])

  $effect(() => {
    store.setErrors((useAlfakitProps().errors as Record<string, string>) ?? {})
  })

  const trigger = async (action: ActionSchema, ctx: ActionContext) => {
    if (action.url && !action.hasAction) {
      return runner.trigger(action, ctx)
    }

    submitting = true
    submittedBlock = untrack(() => block)
    store.setProcessing(true)
    runner.execute(action, ctx, store.state.values)
  }

  // Buttons elsewhere with `formId('form')` (a header "Save") submit through this form.
  $effect(() => registerFormSubmitter(block.component, trigger))

  // `refreshFormData([...])`: an action changed the record; copy those fields in.
  const offRefresh = router.on('success', (event) => {
    const refresh = formRefreshFor(
      pageFlash(event.detail.page),
      untrack(() => block.component),
    )

    if (refresh) applyFormRefresh(store, refresh)
  })

  // Wizard forms (`HasWizard` pages) show their buttons on the last step only.
  const progress = useStore(wizardProgressStore(store))
  const showActions = $derived(formActionsVisible(block, progress.current))

  // Track this form's own submit visit so unrelated reloads finishing meanwhile (polling,
  // relation-manager paging) neither end its processing state nor count as its success.
  let submitVisit: string | null = null
  // The block when the latest non-GET visit started, to tell whether its response arrived.
  let visitBlock: FormBlockSchema | null = null

  const offStart = router.on('start', (event) => {
    const visit = event.detail.visit

    if (submitting && !submitVisit && visit.method !== 'get') {
      submitVisit = visit.id
    }

    if (visit.method !== 'get') visitBlock = untrack(() => block)
  })

  const offSuccess = router.on('success', (event) => {
    const id = submitVisit

    // Another action changed the record: show the server's new form unless it holds edits.
    if (!id && shouldResyncForm(pageFlash(event.detail.page), store)) {
      const current = untrack(() => block)

      if (current !== visitBlock) {
        store.fill(current)
      } else {
        resyncPending = true
      }

      return
    }

    if (!id || (event.detail.visitId ?? id) !== id) return

    // A halted action (rate limit, `halt()`) saved nothing: keep what the user typed.
    if (pageFlash(event.detail.page).alfakitAction?.status === 'halted') return

    const current = untrack(() => block)

    if (current !== submittedBlock) {
      store.fill(current)
    } else {
      refillPending = true
    }
  })

  const offFinish = router.on('finish', (event) => {
    if (submitVisit && event.detail.visit.id !== submitVisit) return

    store.setProcessing(false)
    submitting = false
    submitVisit = null
  })

  const offBefore = panel.unsavedChangesAlerts
    ? router.on('before', (event) => {
        if (
          store.isDirty &&
          !submitting &&
          isLeavingVisit(event.detail.visit) &&
          !window.confirm(t('unsaved_changes', {}, 'You have unsaved changes. Leave anyway?'))
        ) {
          event.preventDefault()
        }
      })
    : () => {}

  onDestroy(() => {
    offStart()
    offSuccess()
    offRefresh()
    offFinish()
    offBefore()
    store.destroy()
  })
</script>

<!-- Enter in a text field submits (keydown bubbles from the fields; the form is not focusable). -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<form
  data-slot="form-block"
  class="flex flex-col gap-6"
  onsubmit={(event) => {
    event.preventDefault()

    if (primary && showActions) {
      void trigger(primary, context)
    }
  }}
  onkeydown={(event) => {
    // Enter in a text field runs the primary action (actions are type="button").
    if (primary && showActions && isImplicitSubmit(event, event.currentTarget)) {
      event.preventDefault()
      void trigger(primary, context)
    }
  }}
>
  <fieldset disabled={state.current.processing || block.operation === 'view'} class="contents">
    <SchemaRenderer components={state.current.components} columns={state.current.columns} />
  </fieldset>
  {#if actions.length > 0 && showActions}
    <div data-slot="form-actions" class="border-t pt-6">
      <ActionList {actions} {context} onTrigger={trigger} />
    </div>
  {/if}
</form>
