import type { TranslationManagerSchema } from '@alfakit/core'
import { lazyComponent } from '../../lib/lazy'
import { Card, CardContent } from '../ui/card'
import { Skeleton } from '../ui/skeleton'

function TranslationManagerSkeleton({ component }: { component?: TranslationManagerSchema }) {
  const count = Math.min(8, Math.max(3, component?.rows.length ?? 5))

  return (
    <Card className="gap-4 py-4" aria-busy="true" data-slot="translation-manager">
      <CardContent className="flex flex-col gap-2 px-5" aria-hidden="true">
        <Skeleton className="h-9" />
        {Array.from({ length: count }, (_, index) => (
          <Skeleton key={index} className="h-12" />
        ))}
      </CardContent>
    </Card>
  )
}

/** The translation editor; its code loads the first time it is shown. */
export const TranslationManager = lazyComponent<{ component?: TranslationManagerSchema }>(
  () => import('./translation-manager').then((module) => module.TranslationManager),
  (props) => <TranslationManagerSkeleton {...props} />,
)
