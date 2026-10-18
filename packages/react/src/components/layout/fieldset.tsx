import type { FieldsetSchema } from '@alfakit/core'
import { schemaGapClass } from '@alfakit/core'
import { extraProps } from '../../lib/attributes'
import { cn } from '../../lib/utils'
import { SchemaRenderer } from '../schema/schema-renderer'
import { DeferredSchema } from './deferred'

export function FieldsetComponent({ component }: { component: FieldsetSchema }) {
  const contained = component.contained !== false

  return (
    <fieldset
      data-contained={contained ? undefined : 'false'}
      {...extraProps(
        component.extraAttributes,
        cn(contained ? 'rounded-xl border p-4 pt-3' : 'min-w-0'),
      )}
    >
      {component.label && (
        <legend className={cn('text-sm font-medium', contained ? 'px-1' : 'mb-3')}>
          {component.label}
        </legend>
      )}
      <DeferredSchema component={component}>
        {(loaded) => (
          <SchemaRenderer
            components={loaded.schema ?? []}
            columns={loaded.columns}
            className={schemaGapClass(loaded) || undefined}
          />
        )}
      </DeferredSchema>
    </fieldset>
  )
}
