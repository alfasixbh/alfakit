<script setup lang="ts">
import type { ActionContext, ActionSchema, FormBlock as FormBlockSchema } from '@alfakit/core'
import {
  FormStore,
  applyFormRefresh,
  formActionsVisible,
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
  wizardProgressStore,
} from '@alfakit/core'
import { router } from '@inertiajs/vue3'
import { computed, onBeforeUnmount, onMounted, onScopeDispose, watch } from 'vue'
import { useStore } from '../../composables/use-store'
import { useActionRunner, useAlfakitProps, usePageSchema, usePanel, useT } from '../../context'
import ActionList from '../actions/ActionList.vue'
import SchemaRenderer from '../schema/SchemaRenderer.vue'
import { showToast } from '../notifications/flash-toasts'
import { provideForm } from './form-context'

/**
 * A page form: its state lives in a FormStore, and its buttons are actions that post the
 * current values through the action endpoint.
 */
const props = defineProps<{ block: FormBlockSchema }>()

const panel = usePanel()
const page = usePageSchema()
const pageProps = useAlfakitProps()
const runner = useActionRunner()
const t = useT()
const token = computed(() => page.value?.token ?? '')

const store = new FormStore(props.block, {
  token: token.value,
  component: props.block.component,
  refreshUrl: panel.value.endpoints.schemaRefresh,
  optionsUrl: panel.value.endpoints.schemaOptions,
  validateUrl: panel.value.endpoints.schemaValidate,
  // A halted wizard step shows what its hook sent.
  onNotifications: (notifications) => notifications.forEach((n) => showToast(n)),
  // Live dashboard filters are applied by the refresh; the widgets reload to follow.
  onRefreshed: () => {
    if (props.block.liveFilters) router.reload({ only: resolvePartialProps(['page']) })
  },
})

provideForm(store)

// Named forms of custom pages (`<PageForm name>`) publish their store for page method calls
// (browser only: mounted hooks never run during a server render).
let unregisterPageForm: (() => void) | undefined

onMounted(() => {
  const name = pageFormName(props.block.component)

  if (name) unregisterPageForm = registerPageForm(name, store)
})

// Edit pages: the conflict banner diffs and merges the main form (`detectConflicts()`).
let unregisterConflictForm: (() => void) | undefined

onMounted(() => {
  if (props.block.component === 'form') unregisterConflictForm = registerConflictForm(store)
})

onBeforeUnmount(() => unregisterConflictForm?.())

// Buttons elsewhere with `formId('form')` (a header "Save") submit through this form.
let unregisterSubmitter: (() => void) | undefined

onMounted(() => {
  unregisterSubmitter = registerFormSubmitter(props.block.component, (action, ctx) =>
    trigger(action, ctx),
  )
})

onBeforeUnmount(() => {
  unregisterPageForm?.()
  unregisterSubmitter?.()
})

// The store survives reloads of the same form (table sorting/paging, polling,
// relation-manager actions all deliver a new `block` object); only a different form
// identity starts from server state again. The token is re-issued per response, so it
// is swapped in place instead of being part of the identity.
watch(
  () => formIdentity(page.value, props.block),
  () => store.fill(props.block),
)

watch(token, (value) => store.setToken(value))

// After this form's own successful submit, refill from the server's new state. The new
// block may arrive before or after Inertia's `success` event, so handle both orders.
let submittedBlock: FormBlockSchema | null = null
let refillPending = false

watch(
  () => props.block,
  (block) => {
    if (refillPending) {
      refillPending = false
      store.fill(block)
    }
  },
)

watch(
  () => pageProps.value.errors,
  (errors) => store.setErrors((errors as Record<string, string>) ?? {}),
  { immediate: true },
)

const state = useStore(store.store)
const context = computed<ActionContext>(() => ({ token: token.value, component: 'page' }))
let submitting = false

const actions = computed<ActionSchema[]>(() =>
  props.block.actions.map((action) => ({ ...action, hasModal: false })),
)
const primary = computed(() => actions.value[0])

// Wizard forms (`HasWizard` pages) show their buttons on the last step only.
const progress = useStore(wizardProgressStore(store))
const showActions = computed(() => formActionsVisible(props.block, progress.value))

const trigger = async (action: ActionSchema, ctx: ActionContext) => {
  if (action.url && !action.hasAction) {
    return runner.trigger(action, ctx)
  }

  submitting = true
  submittedBlock = props.block
  store.setProcessing(true)
  runner.execute(action, ctx, store.state.values)
}

// Track this form's own submit visit so unrelated reloads finishing meanwhile (polling,
// relation-manager paging) neither end its processing state nor count as its success.
let submitVisit: string | null = null

const offStart = router.on('start', (event) => {
  const visit = event.detail.visit

  if (submitting && !submitVisit && visit.method !== 'get') {
    submitVisit = visit.id
  }
})

const offSuccess = router.on('success', (event) => {
  const id = submitVisit

  if (!id || (event.detail.visitId ?? id) !== id) return

  // A halted action (rate limit, `halt()`) saved nothing: keep what the user typed.
  if (pageFlash(event.detail.page).alfakitAction?.status === 'halted') return

  if (props.block !== submittedBlock) {
    store.fill(props.block)
  } else {
    refillPending = true
  }
})

// `refreshFormData([...])`: an action changed the record; copy those fields in.
const offRefresh = router.on('success', (event) => {
  const refresh = formRefreshFor(pageFlash(event.detail.page), props.block.component)

  if (refresh) applyFormRefresh(store, refresh)
})

const offFinish = router.on('finish', (event) => {
  if (submitVisit && event.detail.visit.id !== submitVisit) return

  store.setProcessing(false)
  submitting = false
  submitVisit = null
})

const offBefore = router.on('before', (event) => {
  if (!panel.value.unsavedChangesAlerts) {
    return
  }

  if (
    store.isDirty &&
    !submitting &&
    isLeavingVisit(event.detail.visit) &&
    !window.confirm(t('unsaved_changes', {}, 'You have unsaved changes. Leave anyway?'))
  ) {
    event.preventDefault()
  }
})

onScopeDispose(() => {
  offStart()
  offSuccess()
  offRefresh()
  offFinish()
  offBefore()
  store.destroy()
})

const onSubmit = () => {
  if (primary.value && showActions.value) {
    void trigger(primary.value, context.value)
  }
}

// Enter in a text field runs the primary action (actions are type="button").
const onKeydown = (event: KeyboardEvent) => {
  if (
    primary.value &&
    showActions.value &&
    isImplicitSubmit(event, event.currentTarget as HTMLFormElement)
  ) {
    event.preventDefault()
    void trigger(primary.value, context.value)
  }
}
</script>

<template>
  <form
    data-slot="form-block"
    class="flex flex-col gap-6"
    @submit.prevent="onSubmit"
    @keydown="onKeydown"
  >
    <fieldset :disabled="state.processing || props.block.operation === 'view'" class="contents">
      <SchemaRenderer :components="state.components" :columns="state.columns" />
    </fieldset>
    <div v-if="actions.length > 0 && showActions" data-slot="form-actions" class="border-t pt-6">
      <ActionList :actions="actions" :context="context" :on-trigger="trigger" />
    </div>
  </form>
</template>
