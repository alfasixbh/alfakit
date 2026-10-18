import type { CalendarWidgetSchema } from '@alfakit/core'
import { useT } from '../../context'
import { lazyComponent } from '../../lib/lazy'
import { Card, CardContent } from '../ui/card'
import { Skeleton } from '../ui/skeleton'

/** The server render and the first paint: the calendar's outline, without FullCalendar. */
export function CalendarSkeleton({ widget }: { widget: CalendarWidgetSchema }) {
  const t = useT()

  return (
    <Card className="gap-4 py-4" aria-busy="true" data-slot="calendar-widget">
      <CardContent className="flex flex-col gap-4 px-5">
        <span className="sr-only">{t('calendar.loading', {}, 'Loading calendar')}</span>
        {widget.heading && <Skeleton className="h-5 w-1/3" aria-hidden="true" />}
        <div className="flex items-center justify-between gap-3" aria-hidden="true">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-40" />
        </div>
        <Skeleton className="h-[28rem]" aria-hidden="true" />
      </CardContent>
    </Card>
  )
}

/** The calendar widget; FullCalendar loads the first time a calendar is shown. */
export const CalendarWidget = lazyComponent<{ widget: CalendarWidgetSchema }>(
  () => import('./calendar').then((module) => module.CalendarWidget),
  (props) => <CalendarSkeleton {...props} />,
)
