import type { AnyActionSchema, ContentSlotName, ContentSlots, FieldActions } from '@alfakit/core'
import { slotAlignmentClass } from '@alfakit/core'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { ActionList } from '../actions/action-list'
import { useFieldActionContext } from './field-actions'
import { RenderComponent } from './schema-renderer'

type SlotOwner = ContentSlots & FieldActions & { key: string }

/**
 * One content slot of a field or entry (`aboveLabel()`, `belowContent()`…): a small row
 * of schema components and actions. Actions run as the owner's field actions.
 */
export function ContentSlot(props: {
  component: SlotOwner
  name: ContentSlotName
  className?: string
}) {
  // Most fields have no slots: skip the hooks of the row entirely.
  return props.component.slots?.[props.name]?.items.length ? <ContentSlotRow {...props} /> : null
}

function ContentSlotRow({
  component,
  name,
  className,
}: {
  component: SlotOwner
  name: ContentSlotName
  className?: string
}) {
  const slot = component.slots![name]!
  const context = useFieldActionContext(component)

  // Consecutive actions share one action list, so they sit together like hint actions.
  const nodes: ReactNode[] = []
  let actions: AnyActionSchema[] = []

  const flush = () => {
    if (actions.length === 0) return

    nodes.push(
      <ActionList
        key={`actions-${nodes.length}`}
        actions={actions}
        context={context}
        size="xs"
        className="gap-1"
      />,
    )
    actions = []
  }

  for (const item of slot.items) {
    if (item.action) {
      actions.push(item.action)

      continue
    }

    flush()
    nodes.push(<RenderComponent key={item.component.key} component={item.component} />)
  }

  flush()

  return (
    <div
      data-slot="field-content-slot"
      data-content-slot={name}
      className={cn(
        'flex min-w-0 flex-wrap items-center gap-2 text-sm',
        slotAlignmentClass(slot.alignment),
        className,
      )}
    >
      {nodes}
    </div>
  )
}
