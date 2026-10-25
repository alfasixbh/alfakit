import {
  PREFETCH_CACHE_FOR,
  bottomNavigationItems,
  isNavigationItemActive,
  navigationItemUrl,
  type NavigationItemSchema,
} from '@alfakit/core'
import { Link } from '@inertiajs/react'
import { MenuIcon } from 'lucide-react'
import { useState } from 'react'
import { usePanel, useT } from '../../context'
import { extraProps } from '../../lib/attributes'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet'
import { NavLabel } from './nav-label'

function BottomNavLink({
  item,
  onNavigate,
}: {
  item: NavigationItemSchema
  onNavigate?: () => void
}) {
  const active = isNavigationItemActive(item)
  const url = navigationItemUrl(item) ?? '#'

  if (item.openInNewTab) {
    return (
      <a
        {...extraProps(item.extraAttributes, 'min-w-0')}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        data-slot="bottom-nav-item"
      >
        {item.icon && <Icon name={item.icon} />}
        <NavLabel item={item} className="max-w-full truncate" />
      </a>
    )
  }

  return (
    <Link
      {...extraProps(item.extraAttributes, 'min-w-0')}
      href={url}
      prefetch
      cacheFor={PREFETCH_CACHE_FOR}
      data-slot="bottom-nav-item"
      data-active={active ? 'true' : undefined}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
    >
      {item.icon && <Icon name={item.icon} />}
      <NavLabel item={item} className="max-w-full truncate" />
    </Link>
  )
}

/**
 * The mobile preset's bottom navigation bar (`Panel::mobile()`): the top-level items, with
 * the rest behind a "More" button that opens a sheet. Hidden from `md` up; replace it
 * everywhere with `createAlfakit({ components: { 'panel:bottom-nav': … } })`.
 */
export function BottomNav() {
  const panel = usePanel()
  const t = useT()
  const [open, setOpen] = useState(false)
  const { primary, overflow } = bottomNavigationItems(panel.navigation)

  if (primary.length === 0 && overflow.length === 0) {
    return null
  }

  const overflowActive = overflow.some(isNavigationItemActive)

  return (
    <nav
      data-slot="bottom-nav"
      aria-label={t('navigation', {}, 'Navigation')}
      className="md:hidden"
    >
      {primary.map((item) => (
        <BottomNavLink key={item.url ?? item.label} item={item} />
      ))}
      {overflow.length > 0 && (
        <Sheet open={open} onOpenChange={setOpen}>
          <button
            type="button"
            data-slot="bottom-nav-item"
            data-active={overflowActive ? 'true' : undefined}
            aria-haspopup="dialog"
            aria-expanded={open}
            className="min-w-0 bg-transparent"
            onClick={() => setOpen(true)}
          >
            <Icon name="alfakit::panels.topbar.open-sidebar-button" fallback={MenuIcon} />
            <span className="max-w-full truncate">{t('more', {}, 'More')}</span>
          </button>
          <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto rounded-t-xl p-0">
            <SheetHeader className="border-b">
              <SheetTitle>{t('more', {}, 'More')}</SheetTitle>
            </SheetHeader>
            <nav
              aria-label={t('navigation', {}, 'Navigation')}
              className="flex flex-col gap-1 p-3 text-sm"
            >
              {overflow
                .flatMap((item) => [item, ...(item.children ?? [])])
                .map((item) => (
                  <Link
                    key={item.url ?? item.label}
                    href={navigationItemUrl(item) ?? '#'}
                    onClick={() => setOpen(false)}
                    data-active={isNavigationItemActive(item) ? 'true' : undefined}
                    className={cn(
                      'hover:bg-accent data-[active=true]:bg-accent flex min-h-11 items-center gap-3 rounded-md px-3 font-medium [&_svg]:size-4',
                    )}
                  >
                    {item.icon && <Icon name={item.icon} />}
                    <NavLabel item={item} />
                  </Link>
                ))}
            </nav>
          </SheetContent>
        </Sheet>
      )}
    </nav>
  )
}
