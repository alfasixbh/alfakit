import type { GridSchema, GroupSchema } from '@alfakit/core'
import { schemaGapClass } from '@alfakit/core'
import { SchemaRenderer } from '../schema/schema-renderer'
import { DeferredSchema } from './deferred'

export function GridComponent({ component }: { component: GridSchema | GroupSchema }) {
  return (
    <DeferredSchema component={component}>
      {(loaded) => (
        <SchemaRenderer
          components={loaded.schema ?? []}
          columns={loaded.columns}
          attributes={loaded.extraAttributes}
          className={schemaGapClass(loaded) || undefined}
        />
      )}
    </DeferredSchema>
  )
}
