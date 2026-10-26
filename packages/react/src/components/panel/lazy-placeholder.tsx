import { widgetPollTarget, type LazyWidgetSchema } from '@alfakit/core'
import { useState } from 'react'
import { useRefreshComponents, useT } from '../../context'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { Skeleton } from '../ui/skeleton'

/**
 * Stands in for a lazy widget or relation manager until the `alfakitLazy` deferred prop
 * brings its schema. `table` mimics a table (relation managers, table widgets).
 */
export function LazyPlaceholder({
  variant = 'widget',
  className,
}: {
  variant?: 'widget' | 'table'
  className?: string
}) {
  const t = useT()

  return (
    <div
      data-slot="lazy-placeholder"
      data-variant={variant}
      role="status"
      aria-busy="true"
      className={cn('bg-card flex flex-col gap-3 rounded-xl border p-6', className)}
    >
      <span className="sr-only">{t('loading', {}, 'Loading…')}</span>
      <Skeleton className="h-5 w-1/3" />
      {variant === 'table' ? (
        <>
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </>
      ) : (
        <Skeleton className="h-20 w-full" />
      )}
    </div>
  )
}

/**
 * A lazy widget's cell: the skeleton while its schema loads, or, when the request failed
 * (outside panels: a refused or failed fetch), a message with a retry.
 */
export function LazyWidgetPlaceholder({ widget }: { widget: LazyWidgetSchema }) {
  const t = useT()
  const refresh = useRefreshComponents()
  const [retrying, setRetrying] = useState(false)
  const variant = widget.type === 'TableWidget' ? 'table' : 'widget'

  if (!widget.failed) return <LazyPlaceholder variant={variant} />

  const retry = () => {
    if (!refresh) return

    setRetrying(true)
    void Promise.resolve(refresh([widgetPollTarget(widget)])).finally(() => setRetrying(false))
  }

  return (
    <div
      data-slot="lazy-placeholder"
      data-variant={variant}
      data-failed=""
      role="alert"
      className="bg-card text-muted-foreground flex min-h-28 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-6 text-center text-sm"
    >
      <p>{t('widget_failed', {}, 'This widget could not be loaded.')}</p>
      {refresh && (
        <Button type="button" variant="outline" size="sm" disabled={retrying} onClick={retry}>
          {t('retry', {}, 'Retry')}
        </Button>
      )}
    </div>
  )
}
