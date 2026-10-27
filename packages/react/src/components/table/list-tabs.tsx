import type { ListTabSchema, ListTabsProps } from '@alfakit/core'
import { listTabIds, listTabUrl, tabKeyTarget, withDeferredTabBadges } from '@alfakit/core'
import { router } from '@inertiajs/react'
import type { KeyboardEvent, ReactNode } from 'react'
import { useMemo, useRef } from 'react'
import { useAlfakitProps, useDirection, useT } from '../../context'
import { extraProps } from '../../lib/attributes'
import { badgeColorClasses, colorClass } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { Slot } from '../panel/slot'

/**
 * Tabs above a resource's list table (`ListRecords::getTabs()`). Choosing one reloads the
 * page with `?activeTab=` (the server narrows the query); filters and search are kept.
 * Keyboard: one tab stop (the active tab), arrow keys / Home / End move focus (RTL-aware),
 * Enter / Space select. With `idBase` the tabs control the panel `ListTabsPanel` renders.
 */
export function ListTabs({
  tabs,
  activeTab,
  tabsQueryKey,
  label,
  idBase,
}: Required<Pick<ListTabsProps, 'tabs'>> & ListTabsProps & { label?: string; idBase?: string }) {
  const t = useT()
  const direction = useDirection()
  const buttons = useRef<Array<HTMLButtonElement | null>>([])
  // `deferBadge()` tabs get their badge from a deferred prop loaded after the page.
  const deferred = useAlfakitProps().alfakitTabBadges
  const shown = useMemo(() => withDeferredTabBadges(tabs, deferred), [tabs, deferred])
  const select = (tab: ListTabSchema) => {
    if (tab.key === activeTab || typeof window === 'undefined') return

    router.visit(listTabUrl(window.location.href, tab.key, tabsQueryKey), {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    })
  }

  const focusable = shown.some((tab) => tab.key === activeTab) ? activeTab : shown[0]?.key
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const target = tabKeyTarget(event.key, index, shown.length, direction)

    if (target === null) return

    event.preventDefault()
    buttons.current[target]?.focus()
  }

  return (
    <div
      data-slot="list-tabs"
      role="tablist"
      aria-label={label}
      className="bg-muted text-muted-foreground relative inline-flex h-9 w-fit max-w-full items-center overflow-x-auto rounded-lg p-[3px]"
    >
      <Slot name="resource.list-records.tabs.start" />
      {shown.map((tab, index) => {
        const active = tab.key === activeTab
        const ids = idBase ? listTabIds(idBase, tab.key) : null

        return (
          <button
            key={tab.key}
            {...extraProps(
              tab.extraAttributes,
              cn(
                'inline-flex h-[calc(100%-1px)] shrink-0 items-center justify-center gap-1.5 rounded-md border border-transparent px-2.5 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-none',
                'focus-visible:border-ring focus-visible:ring-ring/50',
                active
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-foreground/70 hover:text-foreground',
              ),
            )}
            ref={(element) => {
              buttons.current[index] = element
            }}
            type="button"
            role="tab"
            id={ids?.tab}
            aria-controls={ids?.panel}
            aria-selected={active}
            tabIndex={tab.key === focusable ? 0 : -1}
            data-state={active ? 'active' : 'inactive'}
            onClick={() => select(tab)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {tab.icon && tab.iconPosition !== 'after' && (
              <Icon name={tab.icon} className="size-4" />
            )}
            {tab.label}
            {tab.icon && tab.iconPosition === 'after' && (
              <Icon name={tab.icon} className="size-4" />
            )}
            {tab.badge !== undefined && tab.badge !== null && (
              <span
                data-slot="badge"
                className={cn(
                  'ms-1 rounded-md px-1.5 py-0 text-xs font-medium',
                  colorClass(badgeColorClasses, tab.badgeColor, 'gray'),
                )}
              >
                {tab.badge}
              </span>
            )}
            {tab.badgePending && (
              <span
                data-slot="badge"
                aria-busy="true"
                aria-label={t('loading', {}, 'Loading')}
                className="bg-muted-foreground/20 ms-1 inline-block h-4 w-5 animate-pulse rounded-md"
              />
            )}
          </button>
        )
      })}
      <Slot name="resource.list-records.tabs.end" />
    </div>
  )
}

/** The table under list tabs, as the tab panel of the active tab. */
export function ListTabsPanel({
  idBase,
  activeTab,
  children,
}: {
  idBase: string
  activeTab?: string
  children: ReactNode
}) {
  const ids = listTabIds(idBase, activeTab ?? '')

  return (
    <div
      data-slot="list-tabs-panel"
      role="tabpanel"
      id={ids.panel}
      aria-labelledby={activeTab ? ids.tab : undefined}
    >
      {children}
    </div>
  )
}
