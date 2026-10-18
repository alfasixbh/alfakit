import type { BaseComponent } from '@alfakit/core'
import { schemaGapClass } from '@alfakit/core'
import { cn } from '../../lib/utils'
import { SchemaRenderer } from '../schema/schema-renderer'

/**
 * Renders a layout component's child schema (`component.schema`) in its grid
 * (`columns`, `dense()`, `gap(false)`), for custom schema components:
 *
 * ```tsx
 * export default function Panel({ component }: { component: BaseComponent }) {
 *   return <div className="rounded border p-4"><SchemaChildren component={component} /></div>
 * }
 * ```
 */
export function SchemaChildren({
  component,
  className,
}: {
  component: Pick<BaseComponent, 'schema' | 'columns' | 'dense' | 'gap'>
  className?: string
}) {
  return (
    <SchemaRenderer
      components={component.schema ?? []}
      columns={component.columns}
      className={cn(schemaGapClass(component), className)}
    />
  )
}
