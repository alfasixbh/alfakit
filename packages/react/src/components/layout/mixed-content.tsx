import type { AnyActionSchema, ContentSlotItem } from '@alfakit/core'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { usePageActionContext } from '../actions/action-context'
import { ActionList } from '../actions/action-list'
import { RenderComponent } from '../schema/schema-renderer'

/**
 * Actions and components placed in a layout component's fixed spot (a section's
 * `afterHeader()`, a callout's `controls()`). Actions run in the page's action context,
 * like section header actions.
 */
export function MixedContent({
  items,
  name,
  className,
}: {
  items: ContentSlotItem[] | undefined
  name: string
  className?: string
}) {
  const context = usePageActionContext()

  if (!items?.length) {
    return null
  }

  // Consecutive actions share one action list so they sit together.
  const nodes: ReactNode[] = []
  let actions: AnyActionSchema[] = []

  const flush = () => {
    if (actions.length === 0) return

    nodes.push(
      <ActionList key={`actions-${nodes.length}`} actions={actions} context={context} size="sm" />,
    )
    actions = []
  }

  for (const item of items) {
    if (item.action) {
      actions.push(item.action)

      continue
    }

    flush()
    nodes.push(<RenderComponent key={item.component.key} component={item.component} />)
  }

  flush()

  return (
    <div data-slot={name} className={cn('flex flex-wrap items-center gap-2', className)}>
      {nodes}
    </div>
  )
}
