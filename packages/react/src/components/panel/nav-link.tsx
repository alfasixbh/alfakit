import {
  PREFETCH_CACHE_FOR,
  flattenNavigationItems,
  type NavigationItemSchema,
} from '@alfakit/core'
import { Link } from '@inertiajs/react'
import type { ComponentProps, ReactNode } from 'react'
import { useT } from '../../context'
import { extraProps } from '../../lib/attributes'
import { badgeColorClasses, colorClass } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { NewTabHint } from '../../lib/new-tab-hint'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/badge'
import { DropdownMenuItem, DropdownMenuLabel } from '../ui/dropdown-menu'
import { NavLabel } from './nav-label'

export function NavBadge({ item }: { item: NavigationItemSchema }) {
  const t = useT()

  // The badge when there is one, as in Vue and Svelte.
  if (item.badge !== undefined && item.badge !== null) {
    return (
      <Badge
        variant="outline"
        className={cn(
          'ms-auto px-1.5 py-0',
          colorClass(badgeColorClasses, item.badgeColor, 'gray'),
        )}
        title={item.badgeTooltip}
      >
        {item.badge}
      </Badge>
    )
  }

  // `deferNavigationBadges()`: a placeholder until the deferred badges arrive.
  if (!item.badgePending) return null

  return (
    <span
      data-slot="badge"
      role="status"
      aria-busy="true"
      aria-label={t('loading', {}, 'Loading')}
      className="bg-muted-foreground/20 ms-auto inline-block h-4 w-5 animate-pulse rounded-md"
    />
  )
}

/**
 * A navigation link: an Inertia link, or a plain anchor for `openUrlInNewTab()`. Used as an
 * `asChild` target, so it must pass on the classes, data attributes and handlers it receives.
 */
export function NavLink({
  item,
  children,
  ...props
}: { item: NavigationItemSchema; children: ReactNode } & Omit<
  ComponentProps<'a'>,
  'href' | 'children'
>) {
  // `NavigationItem::extraAttributes()`; `class` is merged with the link's own.
  const attributes = {
    ...props,
    ...extraProps(item.extraAttributes, props.className),
  } as ComponentProps<'a'>

  return item.openInNewTab ? (
    <a {...attributes} href={item.url} target="_blank" rel="noopener noreferrer">
      {children}
      <NewTabHint />
    </a>
  ) : (
    // Slot passes DOM props; Inertia's Link redefines a few event names, so pass them through untyped.
    <Link
      {...(attributes as Record<string, unknown>)}
      href={item.url ?? '#'}
      prefetch
      cacheFor={PREFETCH_CACHE_FOR}
    >
      {children}
    </Link>
  )
}

const indent = (depth: number) => cn(depth === 1 && 'ps-6', depth > 1 && 'ps-9')

/**
 * Navigation items in a dropdown menu (a sidebar group's flyout, a top-navigation menu),
 * children indented under their parent at any depth. A parent without a URL is a heading.
 */
export function NavMenuItems({ items }: { items: NavigationItemSchema[] }) {
  return flattenNavigationItems(items).map(({ item, depth }, index) =>
    item.url ? (
      <DropdownMenuItem
        key={`${depth}-${item.label}-${index}`}
        asChild
        data-active={item.active ? 'true' : undefined}
      >
        <NavLink
          item={item}
          aria-current={item.active ? 'page' : undefined}
          className={cn(
            'data-[active=true]:bg-accent data-[active=true]:font-medium',
            indent(depth),
          )}
        >
          {item.icon && <Icon name={item.icon} />}
          <NavLabel item={item} className="truncate" />
          <NavBadge item={item} />
        </NavLink>
      </DropdownMenuItem>
    ) : (
      <DropdownMenuLabel
        key={`${depth}-${item.label}-${index}`}
        className={cn('flex items-center gap-2 [&_svg]:size-4', indent(depth))}
      >
        {item.icon && <Icon name={item.icon} />}
        <NavLabel item={item} className="truncate" />
      </DropdownMenuLabel>
    ),
  )
}

/**
 * Navigation items as a vertical list for a sheet (the top-navigation drawer, the bottom
 * bar's "More" sheet): new-tab links, badges and children at any depth, like the sidebar.
 */
export function NavSheetItems({
  items,
  onNavigate,
  className,
}: {
  items: NavigationItemSchema[]
  onNavigate: () => void
  className?: string
}) {
  return flattenNavigationItems(items).map(({ item, depth }, index) =>
    item.url ? (
      <NavLink
        key={`${depth}-${item.label}-${index}`}
        item={item}
        onClick={onNavigate}
        data-active={item.active ? 'true' : undefined}
        aria-current={item.active ? 'page' : undefined}
        className={cn(
          'hover:bg-accent data-[active=true]:bg-accent flex items-center gap-2 rounded-md px-2 py-2 font-medium [&_svg]:size-4',
          className,
          indent(depth),
        )}
      >
        {item.icon && <Icon name={item.icon} />}
        <NavLabel item={item} className="truncate" />
        <NavBadge item={item} />
      </NavLink>
    ) : (
      <p
        key={`${depth}-${item.label}-${index}`}
        className={cn(
          'text-muted-foreground flex items-center gap-2 px-2 py-2 font-medium [&_svg]:size-4',
          className,
          indent(depth),
        )}
      >
        {item.icon && <Icon name={item.icon} />}
        <NavLabel item={item} className="truncate" />
      </p>
    ),
  )
}
