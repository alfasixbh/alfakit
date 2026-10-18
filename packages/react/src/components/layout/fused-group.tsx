import type { FormStore, FusedGroupSchema } from '@alfakit/core'
import { collectFieldStatePaths, gridColumnsClasses } from '@alfakit/core'
import { useId, useMemo } from 'react'
import { useStoreSelector } from '../../hooks/use-store'
import { extraProps } from '../../lib/attributes'
import { cn } from '../../lib/utils'
import { useOptionalFormStore } from '../form/form-context'
import { FusedGroupContext } from '../schema/fused-group-context'
import { RenderComponent } from '../schema/schema-renderer'

/**
 * Fields fused into one control: one border around them (styled by `themes.css`), the
 * group label above, and the fields' validation errors below.
 */
export function FusedGroupComponent({ component }: { component: FusedGroupSchema }) {
  const labelId = `${useId()}-label`
  const store = useOptionalFormStore()
  const paths = useMemo(() => collectFieldStatePaths(component.schema), [component.schema])

  return (
    <div
      data-slot="fused-group"
      role="group"
      aria-labelledby={component.label ? labelId : undefined}
      {...extraProps(component.extraAttributes, 'flex flex-col gap-1.5')}
    >
      {component.label && (
        <span id={labelId} className="text-sm leading-none font-medium select-none">
          {component.label}
        </span>
      )}
      {store ? (
        <FusedGroupBody component={component} store={store} paths={paths} />
      ) : (
        <FusedGroupControls component={component} />
      )}
    </div>
  )
}

function FusedGroupBody({
  component,
  store,
  paths,
}: {
  component: FusedGroupSchema
  store: FormStore
  paths: string[]
}) {
  // A joined string keeps the selected snapshot stable between renders.
  const joined = useStoreSelector(store.store, (state) =>
    paths
      .map((path) => state.errors[path]?.[0])
      .filter((message): message is string => Boolean(message))
      .join('\n'),
  )
  const errors = joined === '' ? [] : joined.split('\n')

  return (
    <>
      <FusedGroupControls component={component} invalid={errors.length > 0} />
      {errors.length > 0 && (
        // The fields announce their own errors; this list is the visible copy.
        <div aria-hidden="true" className="flex flex-col gap-0.5">
          {errors.map((message, index) => (
            <p key={index} className="text-destructive text-xs">
              {message}
            </p>
          ))}
        </div>
      )}
    </>
  )
}

function FusedGroupControls({
  component,
  invalid = false,
}: {
  component: FusedGroupSchema
  invalid?: boolean
}) {
  return (
    <FusedGroupContext.Provider value={true}>
      <div
        data-slot="fused-group-controls"
        data-invalid={invalid ? '' : undefined}
        className={cn('grid', gridColumnsClasses(component.columns ?? { default: 1 }))}
      >
        {(component.schema ?? []).map((child) => (
          <RenderComponent key={child.key} component={child} />
        ))}
      </div>
    </FusedGroupContext.Provider>
  )
}
