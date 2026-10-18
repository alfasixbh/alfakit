import { useT } from '../../context'
import { cn } from '../../lib/utils'
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
