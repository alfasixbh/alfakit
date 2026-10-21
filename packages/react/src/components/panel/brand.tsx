import { Link } from '@inertiajs/react'
import { usePanel } from '../../context'
import { cn } from '../../lib/utils'

/**
 * The panel's logo (or initial) and name, linking to the panel home. Its own module, so the
 * auth layout doesn't import the sidebar.
 */
export function Brand({ className }: { className?: string }) {
  const panel = usePanel()

  return (
    <Link
      href={panel.url ?? '/'}
      className={cn('flex items-center gap-2 overflow-hidden', className)}
    >
      {panel.brandLogo ? (
        <>
          <img
            src={panel.brandLogo}
            alt={panel.brandName}
            style={{ height: panel.brandLogoHeight ?? '1.75rem' }}
            className={cn('max-w-full object-contain', panel.darkModeBrandLogo && 'dark:hidden')}
          />
          {panel.darkModeBrandLogo && (
            <img
              src={panel.darkModeBrandLogo}
              alt={panel.brandName}
              style={{ height: panel.brandLogoHeight ?? '1.75rem' }}
              className="hidden max-w-full object-contain dark:block"
            />
          )}
        </>
      ) : (
        <>
          <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold">
            {panel.brandName.charAt(0)}
          </span>
          <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
            {panel.brandName}
          </span>
        </>
      )}
    </Link>
  )
}
