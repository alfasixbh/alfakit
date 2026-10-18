import { Loader2Icon } from 'lucide-react'
import type { ComponentProps } from 'react'
import { useT } from '../../context'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'

/**
 * The loading indicator. Its glyph is the `alfakit::support.loading-indicator` icon alias,
 * so an app replaces it everywhere with `Icons::register()` (or a `panel:icon` component).
 */
function Spinner({ className, ...props }: Omit<ComponentProps<'svg'>, 'ref'>) {
  const t = useT()
  return (
    <span
      role="status"
      aria-label={t('loading', {}, 'Loading')}
      data-slot="spinner"
      className="inline-flex shrink-0"
    >
      <Icon
        name="alfakit::support.loading-indicator"
        fallback={Loader2Icon}
        aria-hidden="true"
        className={cn('size-4 animate-spin', className)}
        {...props}
      />
    </span>
  )
}

export { Spinner }
