import { slotItems } from '@alfakit/core'
import { usePanel } from '../../context'
import { cn } from '../../lib/utils'
import { RenderComponent } from '../schema/schema-renderer'

/**
 * Renders content added with `Panel::slot('name', …)` or `Slots::register()` on the
 * server: HTML or schema components (`Text`, `Html`, `View`, …). Renders nothing when the
 * slot is empty. `scope` is the component key (`relationManager:<class>`, `widget:<id>`)
 * of the table, relation manager or widget the slot belongs to: content scoped to
 * components only renders in their slots. `data` is what this render is about (the
 * column of a header cell, the action of a modal): items registered with
 * `when: ['column' => 'title']` only render where it matches.
 */
export function Slot({
  name,
  scope,
  data,
  className,
}: {
  name: string
  scope?: string | null
  data?: Record<string, unknown> | null
  className?: string
}) {
  const items = slotItems(usePanel().slots, name, scope, data)

  if (items.length === 0) {
    return null
  }

  return (
    <div data-slot-name={name} className={cn('contents', className)}>
      {items.map((item, index) =>
        item.type === 'html' ? (
          <div key={index} className="contents" dangerouslySetInnerHTML={{ __html: item.html }} />
        ) : (
          <RenderComponent key={index} component={item.component} />
        ),
      )}
    </div>
  )
}
