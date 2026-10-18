import type { TreeSchema, TreeWidgetSchema } from '@alfakit/core'
import { lazyComponent } from '../../lib/lazy'
import { Card, CardContent } from '../ui/card'
import { Skeleton } from '../ui/skeleton'

function TreeSkeleton({
  component,
  widget,
}: {
  component?: TreeSchema
  widget?: TreeWidgetSchema
}) {
  const count = Math.min(6, Math.max(1, (component ?? widget?.tree)?.nodes.length ?? 3))

  return (
    <Card className="gap-4 py-4" aria-busy="true" data-slot="tree-widget">
      <CardContent className="flex flex-col gap-2 px-5" aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
          <Skeleton key={index} className="h-9" />
        ))}
      </CardContent>
    </Card>
  )
}

/** The tree; its code loads the first time a tree is shown. */
export const Tree = lazyComponent<{ component?: TreeSchema; widget?: TreeWidgetSchema }>(
  () => import('./tree').then((module) => module.Tree),
  (props) => <TreeSkeleton {...props} />,
)
