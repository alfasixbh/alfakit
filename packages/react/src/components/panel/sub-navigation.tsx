import type { NavigationItemSchema, SubNavigationSchema } from '@alfakit/core'
import { Link } from '@inertiajs/react'
import { createElement, type ReactNode } from 'react'
import { useRegistry, useT } from '../../context'
import { extraProps } from '../../lib/attributes'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/badge'
import { NavLabel } from './nav-label'
import { Slot } from './slot'

function SubNavigationLink({ item, tab }: { item: NavigationItemSchema; tab: boolean }) {
  // `NavigationItem::extraAttributes()`; `class` is merged with the link's own.
  const attributes = (className: string) => extraProps(item.extraAttributes, className)
  const className = cn(
    'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
    tab ? 'shrink-0 whitespace-nowrap' : 'w-full',
    item.active
      ? 'bg-accent text-accent-foreground font-medium'
      : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
  )

  const content = (
    <>
      {item.icon && <Icon name={item.icon} />}
      <NavLabel item={item} className="truncate" />
      {item.badge !== undefined && item.badge !== null && (
        <Badge variant="secondary" className="ms-auto px-1.5 py-0" title={item.badgeTooltip}>
          {item.badge}
        </Badge>
      )}
    </>
  )

  if (!item.url) {
    return <span {...attributes(className)}>{content}</span>
  }

  if (item.openInNewTab) {
    return (
      <a {...attributes(className)} href={item.url} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    )
  }

  return (
    <Link
      {...attributes(className)}
      href={item.url}
      aria-current={item.active ? 'page' : undefined}
    >
      {content}
    </Link>
  )
}

/** The links of a page's sub-navigation (cluster pages or record pages). */
export function SubNavigation({ navigation }: { navigation: SubNavigationSchema }) {
  const t = useT()
  const label = t('sub_navigation', {}, 'Page navigation')

  if (navigation.position === 'top') {
    const items = navigation.groups.flatMap((group) => group.items)

    return (
      <nav
        aria-label={label}
        data-slot="sub-navigation"
        data-position="top"
        className="relative flex gap-1 overflow-x-auto border-b pb-2"
      >
        {items.map((item) => (
          <SubNavigationLink key={`${item.label}-${item.url ?? ''}`} item={item} tab />
        ))}
      </nav>
    )
  }

  return (
    <nav
      aria-label={label}
      data-slot="sub-navigation"
      data-position={navigation.position}
      className="flex w-full shrink-0 flex-col gap-4 md:w-56"
    >
      <Slot name="page.sub-navigation.sidebar.before" />
      {navigation.groups.map((group, index) => (
        <div key={group.label ?? `group-${index}`} className="flex flex-col gap-1">
          {group.label && (
            <p className="text-muted-foreground flex items-center gap-1.5 px-3 text-xs font-medium">
              {group.icon && <Icon name={group.icon} className="size-3.5" />}
              {group.label}
            </p>
          )}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <li key={`${item.label}-${item.url ?? ''}`}>
                <SubNavigationLink item={item} tab={false} />
              </li>
            ))}
          </ul>
        </div>
      ))}
      <Slot name="page.sub-navigation.sidebar.after" />
    </nav>
  )
}

/**
 * Places the sub-navigation next to (`start`/`end`) or above (`top`) the page content.
 * Replace the navigation with `createAlfakit({ components: { 'panel:sub-navigation': … } })`.
 */
export function SubNavigationLayout({
  navigation,
  children,
}: {
  navigation: SubNavigationSchema
  children: ReactNode
}) {
  const registry = useRegistry()
  const nav = createElement(registry.resolve('panel:sub-navigation') ?? SubNavigation, {
    navigation,
  })

  if (navigation.position === 'top') {
    return (
      <>
        <Slot name="page.sub-navigation.top.before" />
        {nav}
        <Slot name="page.sub-navigation.top.after" />
        {children}
      </>
    )
  }

  const content = <div className="flex min-w-0 flex-1 flex-col gap-6">{children}</div>

  return (
    <div
      data-slot="sub-navigation-layout"
      className="flex flex-col gap-6 md:flex-row md:items-start"
    >
      {navigation.position === 'end' ? (
        <>
          {content}
          <Slot name="page.sub-navigation.end.before" />
          {nav}
          <Slot name="page.sub-navigation.end.after" />
        </>
      ) : (
        <>
          <Slot name="page.sub-navigation.start.before" />
          {nav}
          <Slot name="page.sub-navigation.start.after" />
          {content}
        </>
      )}
    </div>
  )
}
