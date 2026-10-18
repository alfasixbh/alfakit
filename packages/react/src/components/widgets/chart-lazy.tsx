import type { ChartWidgetSchema } from '@alfakit/core'
import { lazyComponent } from '../../lib/lazy'
import { Card, CardContent } from '../ui/card'
import { Skeleton } from '../ui/skeleton'

function ChartSkeleton({ widget }: { widget: ChartWidgetSchema }) {
  return (
    <Card className="gap-4 py-4" aria-busy="true">
      <CardContent className="flex flex-col gap-4 px-5">
        {widget.heading && <Skeleton className="h-5 w-1/3" aria-hidden="true" />}
        <Skeleton style={{ height: widget.maxHeight ?? '18rem' }} aria-hidden="true" />
      </CardContent>
    </Card>
  )
}

/** The chart widget; Chart.js loads the first time a chart is shown. */
export const ChartWidget = lazyComponent<{ widget: ChartWidgetSchema }>(
  () => import('./chart').then((module) => module.ChartWidget),
  (props) => <ChartSkeleton {...props} />,
)
