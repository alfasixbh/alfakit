<script lang="ts">
  import { uniqueKey } from '../../lib/keys'
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
  } from '@alfakit/core'
  import CheckIcon from '@lucide/svelte/icons/check'
  import { untrack } from 'svelte'
  import { useT } from '../../context.svelte'
  import { useStore } from '../../hooks/store.svelte'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import ActionButton from '../actions/ActionButton.svelte'
  import { usePageActionContext } from '../actions/action-context'
  import { useOptionalFormStore } from '../form/form-context.svelte'
  import { fieldActionContext, schemaGapClass } from '@alfakit/core'
  import SchemaRenderer from '../schema/SchemaRenderer.svelte'
  import DeferredSchema from './DeferredSchema.svelte'
  import { Button } from '../ui/button'
  import { extraProps } from '../../lib/attributes'

  let { component }: { component: WizardSchema } = $props()

  /**
   * "Next" validates the current step's fields on the server before moving on; the submit
   * validates the whole form, and the wizard jumps to the first step containing an error
   * when new errors arrive (the user can still move between steps afterwards).
   */
  const t = useT()
  const steps = $derived(component.schema ?? [])
  let current = $state(
    untrack(() =>
      initialWizardStep(
        (component.schema ?? []).length,
        component.startStep,
        component.persistStepInQueryString,
      ),
    ),
  )

  const stepQueryKey = $derived(wizardStepQueryKey(component.persistStepInQueryString))
  const actionContext = usePageActionContext()

  $effect(() => {
    const step = current
    const key = stepQueryKey

    if (key) untrack(() => persistWizardStep(step, key))
  })
  const store = useOptionalFormStore()
  // Inside a form the submit action runs as a field action, so `$get` / `$set` work (W-S2-09).
  const submitContext = $derived(
    store
      ? fieldActionContext({ token: actionContext.token, form: store, key: component.key })
      : actionContext,
  )

  // An action modal around this wizard shows its submit button on the last step only.
  $effect(() => {
    reportWizardProgress(store, current, steps.length)
  })
  const formState = useStore(
    store?.store ?? {
      get: () => ({ errors: {} as Record<string, string[]> }),
      subscribe: () => () => {},
    },
  )
  const errors = $derived(formState.current.errors)

  const stepHasError = (index: number) => {
    const step = steps[index]

    return step ? collectFields(step.schema ?? []).some((field) => errors[field.statePath]) : false
  }

  let seenErrors: Record<string, string[]> = {}

  $effect.pre(() => {
    const next = errors

    untrack(() => {
      const reveal = wizardStepToReveal(steps, seenErrors, next)

      seenErrors = next
      if (reveal !== null) current = reveal
    })
  })

  // `goToStep()` from the server: move once per request (each carries a new id).
  let seenStepRequest: string | undefined = untrack(() => component.goToStep?.id)

  $effect.pre(() => {
    const request = component.goToStep

    untrack(() => {
      if (!request || request.id === seenStepRequest) return

      seenStepRequest = request.id
      const requested = wizardRequestedStepIndex(steps, request, current, component.skippable)

      if (requested !== null) current = requested
    })
  })

  const activeIndex = $derived(current)
  let validating = $state(false)

  const next = async () => {
    const step = steps[activeIndex]

    if (store && step) {
      validating = true
      const valid = await store.validateStep(
        step.key,
        step.deferred ? (step.deferredPaths ?? []) : wizardStepFieldPaths(step),
      )
      validating = false

      if (!valid) return
    }

    current = activeIndex + 1
  }
</script>

<div
  data-surface="wizard"
  {...extraProps(component.extraAttributes, 'bg-card rounded-xl border shadow-xs')}
>
  <ol class="flex flex-wrap gap-2 border-b p-4" aria-label={t('steps', {}, 'Steps')}>
    {#each steps as step, index (uniqueKey(steps, index, (item) => item.key))}
      {@const done = index < activeIndex}
      {@const active = index === activeIndex}
      {@const clickable = component.skippable || index <= activeIndex}
      <li class="flex items-center gap-2">
        <button
          type="button"
          disabled={!clickable}
          onclick={() => (current = index)}
          class={cn(
            'flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors disabled:cursor-default',
            active ? 'text-foreground font-medium' : 'text-muted-foreground',
            clickable && !active && 'hover:text-foreground',
          )}
        >
          <span
            class={cn(
              'flex size-6 items-center justify-center rounded-full border text-xs',
              active && 'border-primary bg-primary text-primary-foreground',
              done && 'border-success bg-success text-success-foreground',
              stepHasError(index) && 'border-destructive text-destructive',
            )}
          >
            {#if done && completedStepIcon(step, component)}<Icon
                name={completedStepIcon(step, component)}
                class="size-3.5"
              />{:else if done}<Icon
                name="alfakit::schemas.wizard.completed-step"
                fallback={CheckIcon}
                class="size-3.5"
              />{:else if step.icon}<Icon name={step.icon} class="size-3.5" />{:else}{index +
                1}{/if}
          </span>
          <span class="flex flex-col items-start leading-tight">
            {step.label}
            {#if step.description}<span class="text-muted-foreground text-xs font-normal"
                >{step.description}</span
              >{/if}
          </span>
        </button>
        {#if index < steps.length - 1}<span class="bg-border hidden h-px w-6 sm:block"></span>{/if}
      </li>
    {/each}
  </ol>
  {#each steps as step, index (uniqueKey(steps, index, (item) => item.key))}
    <div class={cn('p-6', index !== activeIndex && 'hidden')}>
      <DeferredSchema component={step}>
        {#snippet children(loaded)}
          <SchemaRenderer
            components={loaded.schema ?? []}
            columns={loaded.columns}
            attributes={loaded.extraAttributes}
            class={schemaGapClass(loaded) || undefined}
          />
        {/snippet}
      </DeferredSchema>
    </div>
  {/each}
  <div class="flex items-center justify-between gap-2 border-t p-4">
    {#if component.previousAction === false}
      <span></span>
    {:else if component.previousAction}
      <ActionButton
        action={{ ...component.previousAction, disabled: activeIndex === 0 || undefined }}
        context={actionContext}
        onTrigger={() => void (current = activeIndex - 1)}
      />
    {:else}
      <Button
        type="button"
        variant="outline"
        disabled={activeIndex === 0}
        onclick={() => (current = activeIndex - 1)}
      >
        {component.previousActionLabel ?? t('form.previous_step', {}, 'Back')}
      </Button>
    {/if}
    {#if activeIndex < steps.length - 1}
      {#if component.nextAction === false}
        <span></span>
      {:else if component.nextAction}
        <ActionButton
          action={{
            ...component.nextAction,
            disabled: component.nextAction.disabled || validating || undefined,
          }}
          context={actionContext}
          onTrigger={() => next()}
        />
      {:else}
        <Button
          type="button"
          disabled={validating}
          aria-busy={validating || undefined}
          onclick={() => void next()}
          >{component.nextActionLabel ?? t('form.next_step', {}, 'Next')}</Button
        >
      {/if}
    {:else if component.submitAction}
      <ActionButton action={component.submitAction} context={submitContext} />
    {:else if component.submitActionHtml}
      <div data-slot="wizard-submit">{@html component.submitActionHtml}</div>
    {:else}
      <span class="text-muted-foreground text-xs">{component.submitActionLabel}</span>
    {/if}
  </div>
</div>
