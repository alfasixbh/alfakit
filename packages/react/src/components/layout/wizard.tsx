import type { WizardSchema } from '@alfakit/core'
import {
  collectFields,
  completedStepIcon,
  initialWizardStep,
  persistWizardStep,
  reportWizardProgress,
  schemaGapClass,
  wizardRequestedStepIndex,
  wizardStepFieldPaths,
  wizardStepQueryKey,
  wizardStepToReveal,
} from '@alfakit/core'
import { CheckIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useT } from '../../context'
import { useStoreSelector } from '../../hooks/use-store'
import { extraProps } from '../../lib/attributes'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { ActionButton } from '../actions/action-button'
import { usePageActionContext } from '../actions/action-context'
import { useOptionalFormStore } from '../form/form-context'
import { SchemaRenderer } from '../schema/schema-renderer'
import { Button } from '../ui/button'
import { DeferredSchema } from './deferred'

/**
 * "Next" validates the current step's fields on the server before moving on; the submit
 * validates the whole form, and the wizard jumps to the first step containing an error
 * when new errors arrive (the user can still move between steps afterwards).
 */
// Used when a wizard renders outside a form. Module-level so the snapshot stays stable;
// a new object per read makes useSyncExternalStore re-render forever.
const NO_ERRORS: Record<string, string[]> = {}
const NO_FORM_STORE = {
  get: () => ({ errors: NO_ERRORS }),
  subscribe: () => () => {},
}

export function WizardComponent({ component }: { component: WizardSchema }) {
  const t = useT()
  const steps = component.schema ?? []
  const [current, setCurrent] = useState(() =>
    initialWizardStep(steps.length, component.startStep, component.persistStepInQueryString),
  )

  const stepQueryKey = wizardStepQueryKey(component.persistStepInQueryString)
  const actionContext = usePageActionContext()

  useEffect(() => {
    if (stepQueryKey) persistWizardStep(current, stepQueryKey)
  }, [current, stepQueryKey])
  const store = useOptionalFormStore()

  // An action modal around this wizard shows its submit button on the last step only.
  useEffect(() => {
    reportWizardProgress(store, current, steps.length)
  }, [store, current, steps.length])
  const errors = useStoreSelector(store?.store ?? NO_FORM_STORE, (state) => state.errors)

  const stepHasError = (index: number) => {
    const step = steps[index]

    return step ? collectFields(step.schema ?? []).some((field) => errors[field.statePath]) : false
  }

  const [seenErrors, setSeenErrors] = useState<Record<string, string[]>>({})

  if (seenErrors !== errors) {
    setSeenErrors(errors)

    const reveal = wizardStepToReveal(steps, seenErrors, errors)

    if (reveal !== null) setCurrent(reveal)
  }

  // `goToStep()` from the server: move once per request (each carries a new id).
  const [seenStepRequest, setSeenStepRequest] = useState(component.goToStep?.id)

  if (seenStepRequest !== component.goToStep?.id) {
    setSeenStepRequest(component.goToStep?.id)

    const requested = wizardRequestedStepIndex(
      steps,
      component.goToStep,
      current,
      component.skippable,
    )

    if (requested !== null) setCurrent(requested)
  }

  const activeIndex = current
  const [validating, setValidating] = useState(false)

  const next = async () => {
    const step = steps[activeIndex]

    if (store && step) {
      setValidating(true)
      const valid = await store.validateStep(
        step.key,
        step.deferred ? (step.deferredPaths ?? []) : wizardStepFieldPaths(step),
      )
      setValidating(false)

      if (!valid) return
    }

    setCurrent(activeIndex + 1)
  }

  return (
    <div
      data-surface="wizard"

      {...extraProps(component.extraAttributes, 'bg-card rounded-xl border shadow-xs')}
    >
      <ol className="flex flex-wrap gap-2 border-b p-4" aria-label={t('steps', {}, 'Steps')}>
        {steps.map((step, index) => {
          const done = index < activeIndex
          const active = index === activeIndex
          const clickable = component.skippable || index <= activeIndex

          return (
            <li key={step.key} className="flex items-center gap-2">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => setCurrent(index)}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors disabled:cursor-default',
                  active ? 'text-foreground font-medium' : 'text-muted-foreground',
                  clickable && !active && 'hover:text-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full border text-xs',
                    active && 'border-primary bg-primary text-primary-foreground',
                    done && 'border-success bg-success text-success-foreground',
                    stepHasError(index) && 'border-destructive text-destructive',
                  )}
                >
                  {done ? (
                    completedStepIcon(step, component) ? (
                      <Icon name={completedStepIcon(step, component)} className="size-3.5" />
                    ) : (
                      <Icon
                        name="alfakit::schemas.wizard.completed-step"
                        fallback={CheckIcon}
                        className="size-3.5"
                      />
                    )
                  ) : step.icon ? (
                    <Icon name={step.icon} className="size-3.5" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="flex flex-col items-start leading-tight">
                  {step.label}
                  {step.description && (
                    <span className="text-muted-foreground text-xs font-normal">
                      {step.description}
                    </span>
                  )}
                </span>
              </button>
              {index < steps.length - 1 && <span className="bg-border hidden h-px w-6 sm:block" />}
            </li>
          )
        })}
      </ol>
      {steps.map((step, index) => (
        <div key={step.key} className={cn('p-6', index !== activeIndex && 'hidden')}>
          <DeferredSchema component={step}>
            {(loaded) => (
              <SchemaRenderer
                components={loaded.schema ?? []}
                columns={loaded.columns}
                attributes={loaded.extraAttributes}
                className={schemaGapClass(loaded) || undefined}
              />
            )}
          </DeferredSchema>
        </div>
      ))}
      <div className="flex items-center justify-between gap-2 border-t p-4">
        {component.previousAction === false ? (
          <span />
        ) : component.previousAction ? (
          <ActionButton
            action={{ ...component.previousAction, disabled: activeIndex === 0 || undefined }}
            context={actionContext}
            onTrigger={() => setCurrent(activeIndex - 1)}
          />
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={activeIndex === 0}
            onClick={() => setCurrent(activeIndex - 1)}
          >
            {component.previousActionLabel ?? t('form.previous_step', {}, 'Back')}
          </Button>
        )}
        {activeIndex < steps.length - 1 ? (
          component.nextAction === false ? (
            <span />
          ) : component.nextAction ? (
            <ActionButton
              action={{
                ...component.nextAction,
                disabled: component.nextAction.disabled || validating || undefined,
              }}
              context={actionContext}
              onTrigger={() => next()}
            />
          ) : (
            <Button
              type="button"
              disabled={validating}
              aria-busy={validating || undefined}
              onClick={() => void next()}
            >
              {component.nextActionLabel ?? t('form.next_step', {}, 'Next')}
            </Button>
          )
        ) : component.submitAction ? (
          <ActionButton action={component.submitAction} context={actionContext} />
        ) : component.submitActionHtml ? (
          <div
            data-slot="wizard-submit"
            dangerouslySetInnerHTML={{ __html: component.submitActionHtml }}
          />
        ) : (
          <span className="text-muted-foreground text-xs">{component.submitActionLabel}</span>
        )}
      </div>
    </div>
  )
}
