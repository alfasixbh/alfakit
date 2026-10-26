<script setup lang="ts">
import type { WizardSchema } from '@alfakit/core'
import {
  collectFields,
  completedStepIcon,
  initialWizardStep,
  persistWizardStep,
  reportWizardProgress,
  wizardRequestedStepIndex,
  wizardStepFieldPaths,
  wizardStepQueryKey,
  wizardStepToReveal,
  schemaGapClass,
} from '@alfakit/core'
import { CheckIcon } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useStoreSelector } from '../../composables/use-store'
import { useT } from '../../context'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import ActionButton from '../actions/ActionButton.vue'
import { usePageActionContext } from '../actions/action-context'
import { useOptionalFormStore } from '../form/form-context'
import { useFieldActionContext } from '../schema/field-actions'
import SchemaRenderer from '../schema/SchemaRenderer.vue'
import Button from '../ui/Button.vue'
import DeferredSchema from './DeferredSchema.vue'

/**
 * "Next" validates the current step's fields on the server before moving on; the submit
 * validates the whole form, and the wizard jumps to the first step containing an error
 * when new errors arrive (the user can still move between steps afterwards).
 */
const props = defineProps<{ component: WizardSchema }>()
const t = useT()
const steps = computed(() => props.component.schema ?? [])
const current = ref(
  initialWizardStep(
    steps.value.length,
    props.component.startStep,
    props.component.persistStepInQueryString,
  ),
)

const stepQueryKey = computed(() => wizardStepQueryKey(props.component.persistStepInQueryString))
const actionContext = usePageActionContext()

watch(
  current,
  (step) => {
    if (stepQueryKey.value) persistWizardStep(step, stepQueryKey.value)
  },
  { immediate: true },
)
const store = useOptionalFormStore()
// Inside a form the submit action runs as a field action, so `$get` / `$set` work (W-S2-09).
const fieldContext = useFieldActionContext(() => props.component)
const submitContext = computed(() => (store ? fieldContext.value : actionContext))

// An action modal around this wizard shows its submit button on the last step only.
watch(
  [current, () => steps.value.length],
  ([step, count]) => reportWizardProgress(store, step, count),
  { immediate: true },
)
const errors = useStoreSelector(
  store?.store ?? {
    get: () => ({ errors: {} as Record<string, string[]> }),
    subscribe: () => () => {},
  },
  (state) => state.errors,
)

const stepHasError = (index: number) => {
  const step = steps.value[index]

  return step
    ? collectFields(step.schema ?? []).some((field) => errors.value[field.statePath])
    : false
}

watch(
  errors,
  (next, previous) => {
    const reveal = wizardStepToReveal(steps.value, previous ?? {}, next)

    if (reveal !== null) current.value = reveal
  },
  { immediate: true },
)

// `goToStep()` from the server: move once per request (each carries a new id).
watch(
  () => props.component.goToStep?.id,
  (id) => {
    if (!id) return

    const requested = wizardRequestedStepIndex(
      steps.value,
      props.component.goToStep,
      current.value,
      props.component.skippable,
    )

    if (requested !== null) current.value = requested
  },
)

const activeIndex = computed(() => current.value)
const validating = ref(false)

const next = async () => {
  const step = steps.value[activeIndex.value]

  if (store && step) {
    validating.value = true
    const valid = await store.validateStep(
      step.key,
      step.deferred ? (step.deferredPaths ?? []) : wizardStepFieldPaths(step),
    )
    validating.value = false

    if (!valid) return
  }

  current.value = activeIndex.value + 1
}
</script>

<template>
  <div
    data-surface="wizard"
    class="bg-card rounded-xl border shadow-xs"
    v-bind="props.component.extraAttributes"
  >
    <ol class="flex flex-wrap gap-2 border-b p-4" :aria-label="t('steps', {}, 'Steps')">
      <li v-for="(step, index) in steps" :key="step.key" class="flex items-center gap-2">
        <button
          type="button"
          :disabled="!(props.component.skippable || index <= activeIndex)"
          :class="
            cn(
              'flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors disabled:cursor-default',
              index === activeIndex ? 'text-foreground font-medium' : 'text-muted-foreground',
              (props.component.skippable || index <= activeIndex) &&
                index !== activeIndex &&
                'hover:text-foreground',
            )
          "
          @click="current = index"
        >
          <span
            :class="
              cn(
                'flex size-6 items-center justify-center rounded-full border text-xs',
                index === activeIndex && 'border-primary bg-primary text-primary-foreground',
                index < activeIndex && 'border-success bg-success text-success-foreground',
                stepHasError(index) && 'border-destructive text-destructive',
              )
            "
          >
            <template v-if="index < activeIndex">
              <Icon
                v-if="completedStepIcon(step, props.component)"
                :name="completedStepIcon(step, props.component)"
                class="size-3.5"
              />
              <Icon
                v-else
                name="alfakit::schemas.wizard.completed-step"
                :fallback="CheckIcon"
                class="size-3.5"
              />
            </template>
            <Icon v-else-if="step.icon" :name="step.icon" class="size-3.5" />
            <template v-else>{{ index + 1 }}</template>
          </span>
          <span class="flex flex-col items-start leading-tight">
            {{ step.label }}
            <span v-if="step.description" class="text-muted-foreground text-xs font-normal">{{
              step.description
            }}</span>
          </span>
        </button>
        <span v-if="index < steps.length - 1" class="bg-border hidden h-px w-6 sm:block" />
      </li>
    </ol>
    <div
      v-for="(step, index) in steps"
      :key="step.key"
      :class="cn('p-6', index !== activeIndex && 'hidden')"
    >
      <DeferredSchema v-slot="{ component: loaded }" :component="step">
        <SchemaRenderer
          :components="loaded.schema ?? []"
          :columns="loaded.columns"
          :attributes="loaded.extraAttributes"
          :class="schemaGapClass(loaded) || undefined"
        />
      </DeferredSchema>
    </div>
    <div class="flex items-center justify-between gap-2 border-t p-4">
      <span v-if="props.component.previousAction === false" />
      <ActionButton
        v-else-if="props.component.previousAction"
        :action="{ ...props.component.previousAction, disabled: activeIndex === 0 || undefined }"
        :context="actionContext"
        :on-trigger="() => void (current = activeIndex - 1)"
      />
      <Button
        v-else
        type="button"
        variant="outline"
        :disabled="activeIndex === 0"
        @click="current = activeIndex - 1"
        >{{ props.component.previousActionLabel ?? t('form.previous_step', {}, 'Back') }}</Button
      >
      <template v-if="activeIndex < steps.length - 1">
        <span v-if="props.component.nextAction === false" />
        <ActionButton
          v-else-if="props.component.nextAction"
          :action="{
            ...props.component.nextAction,
            disabled: props.component.nextAction.disabled || validating || undefined,
          }"
          :context="actionContext"
          :on-trigger="() => next()"
        />
        <Button
          v-else
          type="button"
          :disabled="validating"
          :aria-busy="validating || undefined"
          @click="next"
          >{{ props.component.nextActionLabel ?? t('form.next_step', {}, 'Next') }}</Button
        >
      </template>
      <ActionButton
        v-else-if="props.component.submitAction"
        :action="props.component.submitAction"
        :context="submitContext"
      />
      <div
        v-else-if="props.component.submitActionHtml"
        data-slot="wizard-submit"
        v-html="props.component.submitActionHtml"
      />
      <span v-else class="text-muted-foreground text-xs">{{
        props.component.submitActionLabel
      }}</span>
    </div>
  </div>
</template>
