import type { TabSchema, TabsSchema } from '@alfakit/core'
import { readPersisted, schemaGapClass, writePersisted } from '@alfakit/core'
import { usePage } from '@inertiajs/react'
import { useEffect, useState } from 'react'
import { useHydrated } from '../../hooks/use-hydrated'
import { extraProps } from '../../lib/attributes'
import { badgeColorClasses, colorClass } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { SchemaRenderer } from '../schema/schema-renderer'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { DeferredSchema, useDeferredBadge } from './deferred'

export function TabsComponent({ component }: { component: TabsSchema }) {
  const tabs = component.schema ?? []
  // The page URL (not `window.location`) so the server renders the same tab as the browser.
  const url = usePage().url
  const fromQuery = component.queryStringKey
    ? new URL(url, 'http://localhost').searchParams.get(component.queryStringKey)
    : null
  const [initial] = useState<string>(
    () =>
      tabs.find((tab) => tab.key === fromQuery)?.key ??
      tabs[Math.max(0, component.activeTab - 1)]?.key ??
      tabs[0]?.key ??
      '',
  )

  const persist = component.persistTab
  const hydrated = useHydrated()
  const [chosen, setChosen] = useState<string | null>(null)
  // `persistTab()`: read only after hydration (the server can't see browser storage); a
  // tab named in the query string wins.
  const stored =
    hydrated && persist && !fromQuery ? readPersisted(persist.key, persist.storage) : null
  const active = chosen ?? (stored && tabs.some((tab) => tab.key === stored) ? stored : initial)

  const changeTab = (value: string) => {
    setChosen(value)

    if (persist) writePersisted(persist.key, value, persist.storage)
  }

  useEffect(() => {
    if (!component.queryStringKey || typeof window === 'undefined') return

    const url = new URL(window.location.href)
    url.searchParams.set(component.queryStringKey, active)
    window.history.replaceState(window.history.state, '', url)
  }, [active, component.queryStringKey])

  return (
    <Tabs
      data-surface={component.contained ? 'tabs' : undefined}
      value={active}
      onValueChange={changeTab}
      orientation={component.vertical ? 'vertical' : 'horizontal'}

      {...extraProps(
        component.extraAttributes,
        cn(
          component.contained && 'bg-card rounded-xl border shadow-xs',
          component.vertical && 'flex-row',
        ),
      )}
    >
      <TabsList
        data-scrollable={component.scrollable === false ? 'false' : undefined}
        className={cn(
          component.contained && 'm-2',
          component.vertical
            ? 'self-start'
            : component.scrollable === false
              ? 'h-auto max-w-full flex-wrap justify-start'
              : 'relative max-w-full overflow-x-auto',
        )}
      >
        {tabs.map((tab) => (
          <TabsTrigger key={tab.key} value={tab.key}>
            {tab.icon && tab.iconPosition !== 'after' && <Icon name={tab.icon} />}
            {tab.label}
            {tab.icon && tab.iconPosition === 'after' && <Icon name={tab.icon} />}
            <TabBadge tab={tab} />
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent
          key={tab.key}
          value={tab.key}
          forceMount
          className={cn('data-[state=inactive]:hidden', component.contained ? 'p-6 pt-4' : 'pt-4')}
        >
          <DeferredSchema component={tab}>
            {(loaded) => (
              <SchemaRenderer
                components={loaded.schema ?? []}
                columns={loaded.columns}
                attributes={loaded.extraAttributes}
                className={schemaGapClass(loaded) || undefined}
              />
            )}
          </DeferredSchema>
        </TabsContent>
      ))}
    </Tabs>
  )
}

/** A tab's badge; `deferBadge()` badges appear once loaded. */
function TabBadge({ tab }: { tab: TabSchema }) {
  const { badge, badgeColor, badgeTooltip } = useDeferredBadge(tab)

  if (badge === undefined || badge === null) return null

  return (
    <Badge
      variant="outline"
      title={badgeTooltip ?? undefined}
      className={cn(
        'ms-1 px-1.5 py-0',
        colorClass(badgeColorClasses, badgeColor ?? undefined, 'gray'),
      )}
    >
      {badge}
    </Badge>
  )
}
