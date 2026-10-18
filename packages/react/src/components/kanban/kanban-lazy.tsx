import type { KanbanSchema, KanbanWidgetSchema } from '@alfakit/core'
import { lazyComponent } from '../../lib/lazy'
import { Card, CardContent } from '../ui/card'
import { Skeleton } from '../ui/skeleton'

function KanbanSkeleton({
  component,
  widget,
}: {
  component?: KanbanSchema
  widget?: KanbanWidgetSchema
}) {
  const count = Math.min(5, Math.max(1, (component ?? widget?.kanban)?.columns.length ?? 3))

  return (
    <Card className="gap-4 py-4" aria-busy="true" data-slot="kanban">
      <CardContent className="flex gap-3 overflow-hidden px-4" aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className="flex w-64 shrink-0 flex-col gap-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

/** The Kanban board; its code loads the first time a board is shown. */
export const Kanban = lazyComponent<{ component?: KanbanSchema; widget?: KanbanWidgetSchema }>(
  () => import('./kanban').then((module) => module.Kanban),
  (props) => <KanbanSkeleton {...props} />,
)
