<script setup lang="ts">
import type { OpenModal } from '@alfakit/core'
import {
  actionFormComponent,
  formIdPrefix,
  actionFormParams,
  confirmModalClose,
  FormStore,
  guardModalUnload,
  isModalSubmitVisible,
  modalFooterAlignment,
  nestedActionContext,
  PASSWORD_CONFIRMATION_INPUT,
  scheduleAutofocus,
  slideOverSide,
  wizardProgressStore,
} from '@alfakit/core'
import { computed, nextTick, onMounted, onScopeDispose, ref, useId, watch } from 'vue'
import { useStore } from '../../composables/use-store'
import { useActionRunner, useDirection, usePanel, useT } from '../../context'
import {
  colorClass,
  iconBackgroundColorClasses,
  outlineButtonColorClasses,
  solidButtonColorClasses,
} from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { provideForm } from '../form/form-context'
import Slot from '../panel/Slot.vue'
import SchemaRenderer from '../schema/SchemaRenderer.vue'
import Button from '../ui/Button.vue'
import Dialog from '../ui/Dialog.vue'
import DialogContent from '../ui/DialogContent.vue'
import DialogDescription from '../ui/DialogDescription.vue'
import DialogFooter from '../ui/DialogFooter.vue'
import DialogHeader from '../ui/DialogHeader.vue'
import DialogTitle from '../ui/DialogTitle.vue'
import Sheet from '../ui/Sheet.vue'
import SheetContent from '../ui/SheetContent.vue'
import SheetDescription from '../ui/SheetDescription.vue'
import SheetFooter from '../ui/SheetFooter.vue'
import SheetHeader from '../ui/SheetHeader.vue'
import SheetTitle from '../ui/SheetTitle.vue'
import Spinner from '../ui/Spinner.vue'
import ActionList from './ActionList.vue'
import ActionModalPassword from './ActionModalPassword.vue'
import { showToast } from '../notifications/flash-toasts'

const WIDTHS: Record<string, string> = {
  '3xs': 'sm:max-w-3xs',
  '2xs': 'sm:max-w-2xs',
  xs: 'sm:max-w-xs',
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
  '3xl': 'sm:max-w-3xl',
  '4xl': 'sm:max-w-4xl',
  '5xl': 'sm:max-w-5xl',
  '6xl': 'sm:max-w-6xl',
  '7xl': 'sm:max-w-7xl',
  none: 'sm:max-w-none',
  min: 'sm:max-w-min',
  max: 'sm:max-w-max',
  fit: 'sm:max-w-fit',
  prose: 'sm:max-w-prose',
  container: 'sm:container',
  'screen-sm': 'sm:max-w-(--breakpoint-sm)',
  'screen-md': 'sm:max-w-(--breakpoint-md)',
  'screen-lg': 'sm:max-w-(--breakpoint-lg)',
  'screen-xl': 'sm:max-w-(--breakpoint-xl)',
  'screen-2xl': 'sm:max-w-(--breakpoint-2xl)',
  full: 'sm:max-w-[calc(100%-2rem)]',
  screen: 'sm:max-w-[calc(100%-2rem)] h-[calc(100%-2rem)]',
}

const FOOTER_JUSTIFY: Record<string, string> = {
  start: 'sm:justify-start',
  center: 'sm:justify-center',
  end: 'sm:justify-end',
  between: 'sm:justify-between',
}

const props = withDefaults(defineProps<{ modal: OpenModal; hidden?: boolean }>(), {
  hidden: false,
})

const runner = useActionRunner()
const panel = usePanel()
const direction = useDirection()
const t = useT()

const action = props.modal.action
const context = props.modal.context
const schema = computed(() => props.modal.modal)

const form = (() => {
  if (!schema.value.form) {
    return null
  }

  return new FormStore(schema.value.form, {
    token: context.token,
    component: actionFormComponent(action, context),
    // Own field ids: the modal opens over a form whose fields may share names.
    idPrefix: formIdPrefix(actionFormComponent(action, context)),
    record: context.record ?? null,
    refreshUrl: panel.value.endpoints.schemaRefresh,
    optionsUrl: panel.value.endpoints.schemaOptions,
    validateUrl: panel.value.endpoints.schemaValidate,
    // A halted wizard step shows what its hook sent.
    onNotifications: (notifications) => notifications.forEach((n) => showToast(n)),
    params: actionFormParams(context),
  })
})()

if (form) {
  provideForm(form)
}

const formState = form ? useStore(form.store) : null

watch(
  () => props.modal.errors,
  (errors) => form?.setErrors(errors),
  { immediate: true },
)

onScopeDispose(() => form?.destroy())

// Nested actions read this form (`$mountedActions`, `getRawData()`) and write into it
// (`fillData()`).
if (form) {
  onScopeDispose(runner.registerModalForm(action, context, form))
}

// `extraModalWindowAttributes()`: `class` joins the window's classes.
const windowClass = computed(() => schema.value.windowAttributes?.class as string | undefined)
const windowAttributes = computed(() => {
  const { class: _class, ...rest } = schema.value.windowAttributes ?? {}

  return rest
})

// `extraModalOverlayAttributes()`: the backdrop is the content's previous sibling.
const modalId = useId()

// A marker inside the content finds the window and its backdrop (the dialog primitives
// render through a portal and don't pass other attributes on).
const setAttributes = (element: Element, attributes: Record<string, unknown>) => {
  for (const [name, value] of Object.entries(attributes)) {
    if (value === null || value === undefined || value === false) continue

    if (name === 'class') {
      element.classList.add(...String(value).split(/\s+/).filter(Boolean))
    } else {
      element.setAttribute(name, value === true ? '' : String(value))
    }
  }
}

const applyOverlayAttributes = () => {
  if (props.hidden || typeof document === 'undefined') return

  const element = document
    .querySelector(`[data-alfakit-modal="${modalId}"]`)
    ?.closest('[role="dialog"]')
  const overlay = element?.previousElementSibling

  if (element) setAttributes(element, windowAttributes.value)

  if (overlay?.getAttribute('data-slot')?.endsWith('-overlay') && schema.value.overlayAttributes) {
    setAttributes(overlay, schema.value.overlayAttributes)
  }
}

onMounted(() => void nextTick(applyOverlayAttributes))
watch(
  () => props.hidden,
  () => void nextTick(applyOverlayAttributes),
  { flush: 'post' },
)

const footerJustify = computed(() => FOOTER_JUSTIFY[modalFooterAlignment(schema.value)])
const footerActionsClass = computed(() =>
  modalFooterAlignment(schema.value) === 'end' ? 'sm:me-auto' : undefined,
)
const side = computed(() => slideOverSide(schema.value.slideOverPosition, direction.value))

// A wizard form reports its step, so the submit button waits for the last one.
const progress = form ? useStore(wizardProgressStore(form)) : null
const submitVisible = computed(() => isModalSubmitVisible(schema.value, progress?.value))

const password = ref('')
const passwordError = computed(() => props.modal.errors[PASSWORD_CONFIRMATION_INPUT]?.[0])
const footerContext = nestedActionContext(context, action)

const run = (createAnother: boolean) => {
  // A click that blurred a live field started a refresh: send the state it returns.
  if (form) {
    form.whenSettled(() => execute(createAnother))
  } else {
    execute(createAnother)
  }
}

const execute = (createAnother: boolean) => {
  const values = form?.state.values ?? {}
  const options = {
    ...(schema.value.passwordConfirmation ? { password: password.value } : {}),
    ...(createAnother ? { createAnother: true } : {}),
  }

  if (Object.keys(options).length > 0) {
    runner.execute(action, context, values, options)
  } else {
    runner.execute(action, context, values)
  }
}
const submit = () => run(false)
// "Create & create another": the runner reloads the modal, and its fresh form fills this one.
const submitAnother = () => run(true)

watch(
  () => schema.value.form,
  (payload, previous) => {
    if (payload && payload !== previous) form?.fill(payload)
  },
)

// "Create & create another": back to the `autofocus()` field of the fresh form.
watch(
  () => props.modal.refocus,
  (refocus, _previous, onCleanup) => {
    const components = schema.value.form?.components

    if (!refocus || !components) return

    onCleanup(
      scheduleAutofocus(() => document.getElementById(`action-form-${action.name}`), components),
    )
  },
)

// Dismissing the modal (not submitting it): `cancelParentActionsOnClose()` applies.
const close = () => runner.cancelModal(action.name)
const unsavedMessage = t('unsaved_changes_close', {}, 'You have unsaved changes. Close anyway?')
// Cancel, Escape, clicking away and the close button ask first when the form changed.
const requestClose = () => {
  if (confirmModalClose(schema.value, form, unsavedMessage)) close()
}
onScopeDispose(guardModalUnload(schema.value, form, unsavedMessage))
const cancelClass = computed(() =>
  schema.value.cancelColor ? colorClass(outlineButtonColorClasses, schema.value.cancelColor) : '',
)
// `createAnotherAction()`: the "Create & create another" button's colour.
const createAnotherClass = computed(() =>
  schema.value.createAnotherColor
    ? colorClass(outlineButtonColorClasses, schema.value.createAnotherColor)
    : '',
)
// Every dialog needs an accessible name: without a heading it stays visually hidden.
const title = computed(() => schema.value.heading ?? action.label ?? t('actions', {}, 'Actions'))

const onOpenChange = (open: boolean) => {
  if (!open && !props.modal.processing) {
    requestClose()
  }
}

const hasFooter = computed(() =>
  Boolean(
    schema.value.submitLabel || schema.value.cancelLabel || schema.value.extraFooterActions?.length,
  ),
)
const hasBody = computed(() =>
  Boolean(
    schema.value.content || form || schema.value.contentFooter || schema.value.passwordConfirmation,
  ),
)
</script>

<template>
  <Sheet
    v-if="schema.slideOver"
    :open="!props.hidden"
    :modal="!schema.clickThrough"
    @update:open="onOpenChange"
  >
    <SheetContent
      :side="side"
      :class="
        cn('flex w-full flex-col gap-0 p-0', WIDTHS[schema.width] ?? 'sm:max-w-md', windowClass)
      "
      :show-close-button="schema.closeButton"
      @interact-outside="(event) => !schema.closeByClickingAway && event.preventDefault()"
      @escape-key-down="(event) => !schema.closeByEscaping && event.preventDefault()"
    >
      <span :data-alfakit-modal="modalId" hidden />
      <SheetHeader class="border-b">
        <div
          :class="
            cn('flex gap-4', schema.alignment === 'center' && 'flex-col items-center text-center')
          "
        >
          <div
            v-if="schema.icon"
            :class="
              cn(
                'flex size-10 shrink-0 items-center justify-center rounded-full',
                colorClass(iconBackgroundColorClasses, schema.iconColor, 'primary'),
              )
            "
          >
            <Icon :name="schema.icon" class="size-5" />
          </div>
          <div class="flex flex-col gap-1.5">
            <SheetTitle :class="cn(!schema.heading && 'sr-only')">{{ title }}</SheetTitle>
            <SheetDescription v-if="schema.description"
              ><span v-html="schema.description"
            /></SheetDescription>
            <SheetDescription v-else class="sr-only">{{ title }}</SheetDescription>
          </div>
        </div>
      </SheetHeader>
      <div class="flex-1 overflow-y-auto p-4">
        <div class="flex flex-col gap-6">
          <SchemaRenderer v-if="schema.content" :components="schema.content" />
          <Slot
            v-if="form && formState"
            name="modal.schema.before"
            :data="{ action: action.name }"
          />
          <form
            v-if="form && formState"
            :id="`action-form-${action.name}`"
            @submit.prevent="submit"
          >
            <SchemaRenderer :components="formState.components" :columns="formState.columns" />
          </form>
          <Slot
            v-if="form && formState"
            name="modal.schema.after"
            :data="{ action: action.name }"
          />
          <SchemaRenderer v-if="schema.contentFooter" :components="schema.contentFooter" />
          <ActionModalPassword
            v-if="schema.passwordConfirmation"
            v-model="password"
            :error="passwordError"
            @submit="submit"
          />
        </div>
      </div>
      <SheetFooter
        v-if="hasFooter"
        :class="cn('border-t', schema.stickyFooter && 'bg-background sticky bottom-0')"
      >
        <div
          :class="
            cn('flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center', footerJustify)
          "
        >
          <ActionList
            v-if="schema.extraFooterActions"
            :actions="schema.extraFooterActions"
            :context="footerContext"
            :class="footerActionsClass"
          />
          <Button
            v-if="schema.cancelLabel"
            type="button"
            variant="outline"
            :class="cancelClass"
            :disabled="props.modal.processing"
            @click="requestClose"
            >{{ schema.cancelLabel }}</Button
          >
          <Button
            v-if="schema.createAnotherLabel && schema.submitLabel && submitVisible"
            type="button"
            variant="outline"
            data-slot="create-another"
            :class="createAnotherClass"
            :disabled="props.modal.processing"
            @click="submitAnother"
            ><Icon v-if="schema.createAnotherIcon" :name="schema.createAnotherIcon" />{{
              schema.createAnotherLabel
            }}</Button
          >
          <Button
            v-if="schema.submitLabel && submitVisible"
            type="button"
            :class="colorClass(solidButtonColorClasses, schema.submitColor, 'primary')"
            :disabled="props.modal.processing"
            :autofocus="schema.autofocus && !form"
            @click="submit"
          >
            <Spinner v-if="props.modal.processing" />
            <Icon v-else-if="schema.submitIcon" :name="schema.submitIcon" />
            {{ schema.submitLabel }}
          </Button>
        </div>
      </SheetFooter>
    </SheetContent>
  </Sheet>
  <Dialog v-else :open="!props.hidden" :modal="!schema.clickThrough" @update:open="onOpenChange">
    <DialogContent
      :class="
        cn(
          'max-h-[calc(100vh-2rem)] overflow-y-auto',
          WIDTHS[schema.width] ?? 'sm:max-w-lg',
          windowClass,
        )
      "
      :show-close-button="schema.closeButton"
      @interact-outside="(event) => !schema.closeByClickingAway && event.preventDefault()"
      @escape-key-down="(event) => !schema.closeByEscaping && event.preventDefault()"
    >
      <span :data-alfakit-modal="modalId" hidden />
      <!-- A sticky header stays pinned to the top of the scrolling dialog, edge to edge. -->
      <DialogHeader
        :class="
          cn(
            schema.stickyHeader &&
              'bg-background sticky -top-6 z-10 -mx-6 -mt-6 rounded-t-lg border-b px-6 pt-6 pb-4',
            // Room for the close button (X): a long heading would run under it.
            schema.closeButton !== false && (schema.stickyHeader ? 'pe-12' : 'pe-6'),
          )
        "
      >
        <div
          :class="
            cn('flex gap-4', schema.alignment === 'center' && 'flex-col items-center text-center')
          "
        >
          <div
            v-if="schema.icon"
            :class="
              cn(
                'flex size-10 shrink-0 items-center justify-center rounded-full',
                colorClass(iconBackgroundColorClasses, schema.iconColor, 'primary'),
              )
            "
          >
            <Icon :name="schema.icon" class="size-5" />
          </div>
          <div class="flex flex-col gap-1.5">
            <DialogTitle :class="cn(!schema.heading && 'sr-only')">{{ title }}</DialogTitle>
            <DialogDescription v-if="schema.description"
              ><span v-html="schema.description"
            /></DialogDescription>
            <DialogDescription v-else class="sr-only">{{ title }}</DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <div v-if="hasBody" class="flex flex-col gap-6">
        <SchemaRenderer v-if="schema.content" :components="schema.content" />
        <Slot v-if="form && formState" name="modal.schema.before" :data="{ action: action.name }" />
        <form v-if="form && formState" :id="`action-form-${action.name}`" @submit.prevent="submit">
          <SchemaRenderer :components="formState.components" :columns="formState.columns" />
        </form>
        <Slot v-if="form && formState" name="modal.schema.after" :data="{ action: action.name }" />
        <SchemaRenderer v-if="schema.contentFooter" :components="schema.contentFooter" />
        <ActionModalPassword
          v-if="schema.passwordConfirmation"
          v-model="password"
          :error="passwordError"
          @submit="submit"
        />
      </div>
      <!-- A sticky footer stays pinned to the bottom of the scrolling dialog, edge to edge. -->
      <DialogFooter
        v-if="hasFooter"
        :class="
          cn(
            schema.stickyFooter &&
              'bg-background sticky bottom-0 -mx-6 -mb-6 rounded-b-lg border-t px-6 py-4',
          )
        "
      >
        <div
          :class="
            cn('flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center', footerJustify)
          "
        >
          <ActionList
            v-if="schema.extraFooterActions"
            :actions="schema.extraFooterActions"
            :context="footerContext"
            :class="footerActionsClass"
          />
          <Button
            v-if="schema.cancelLabel"
            type="button"
            variant="outline"
            :class="cancelClass"
            :disabled="props.modal.processing"
            @click="requestClose"
            >{{ schema.cancelLabel }}</Button
          >
          <Button
            v-if="schema.createAnotherLabel && schema.submitLabel && submitVisible"
            type="button"
            variant="outline"
            data-slot="create-another"
            :class="createAnotherClass"
            :disabled="props.modal.processing"
            @click="submitAnother"
            ><Icon v-if="schema.createAnotherIcon" :name="schema.createAnotherIcon" />{{
              schema.createAnotherLabel
            }}</Button
          >
          <Button
            v-if="schema.submitLabel && submitVisible"
            type="button"
            :class="colorClass(solidButtonColorClasses, schema.submitColor, 'primary')"
            :disabled="props.modal.processing"
            :autofocus="schema.autofocus && !form"
            @click="submit"
          >
            <Spinner v-if="props.modal.processing" />
            <Icon v-else-if="schema.submitIcon" :name="schema.submitIcon" />
            {{ schema.submitLabel }}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
