import type { HelpdeskInboxSchema } from '@alfakit/core'
import { useT } from '../../context'
import { lazyComponent } from '../../lib/lazy'
import { Card } from '../ui/card'
import { Skeleton } from '../ui/skeleton'

/** The server render and the first paint: the inbox's outline. */
function HelpdeskInboxSkeleton() {
  const t = useT()

  return (
    <Card
      data-slot="helpdesk-inbox"
      aria-busy="true"
      className="grid h-[calc(100svh-12rem)] min-h-[34rem] grid-cols-1 gap-0 overflow-hidden py-0 md:grid-cols-[18rem_1fr] xl:grid-cols-[13rem_20rem_1fr]"
    >
      <span className="sr-only">{t('helpdesk.loading', {}, 'Loading…')}</span>
      <div className="flex flex-col gap-2 border-e p-2 max-xl:hidden" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-7" />
        ))}
      </div>
      <div className="flex flex-col gap-2 border-e p-2" aria-hidden="true">
        <Skeleton className="h-9" />
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-16" />
        ))}
      </div>
      <div className="flex flex-col gap-3 p-4 max-md:hidden" aria-hidden="true">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    </Card>
  )
}

/** The helpdesk inbox; its code loads the first time the inbox is shown. */
export const HelpdeskInbox = lazyComponent<{ component: HelpdeskInboxSchema }>(
  () => import('./inbox').then((module) => module.HelpdeskInbox),
  () => <HelpdeskInboxSkeleton />,
)
