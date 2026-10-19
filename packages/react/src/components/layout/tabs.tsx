import type { TabSchema, TabsSchema } from '@alfakit/core'
import {
  componentHasErrors,
  readPersisted,
  schemaGapClass,
  tabFromQuery,
  tabQueryValue,
  tabToReveal,
  writePersisted,
} from '@alfakit/core'
import { usePage } from '@inertiajs/react'
import { useEffect, useState } from 'react'
import { useT } from '../../context'
import { useHydrated } from '../../hooks/use-hydrated'
import { useStoreSelector } from '../../hooks/use-store'
import { extraProps } from '../../lib/attributes'
import { badgeColorClasses, colorClass } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { useOptionalFormStore } from '../form/form-context'
import { SchemaRenderer } from '../schema/schema-renderer'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { DeferredSchema, useDeferredBadge } from './deferred'

// Used when tabs render outside a form. Module-level so the snapshot stays stable.
const NO_ERRORS: Record<string, string[]> = {}
const NO_FORM_STORE = {
  get: () => ({ errors: NO_ERRORS }),
  subscribe: () => () => {},
}

const TAB_INVALID_CLASSES =
  'text-destructive data-[state=active]:text-destructive dark:text-destructive dark:data-[state=active]:text-destructive'

export function TabsComponent({ component }: { component: TabsSchema }) {
  const tabs = component.schema ?? []
  // The page URL (not `window.location`) so the server renders the same tab as the browser.
  const url = usePage().url
  // The tab's readable value (`?tab=billing-address`), or its key in links from older versions.
  const fromQuery = component.queryStringKey
    ? tabFromQuery(
        tabs,
        new URL(url, 'http://localhost').searchParams.get(component.queryStringKey),
      )
    : null
  const [initial] = useState<string>(
    () => fromQuery ?? tabs[Math.max(0, component.activeTab - 1)]?.key ?? tabs[0]?.key ?? '',
  )

  const persist = component.persistTab
  const hydrated = useHydrated()
  const [chosen, setChosen] = useState<string | null>(null)
  // `persistTab()`: read only after hydration (the server can't see browser storage); a
  // tab named in the query string wins.
  const stored =
    hydrated && persist && !fromQuery ? readPersisted(persist.key, persist.storage) : null
  const active = chosen ?? (stored && tabs.some((tab) => tab.key === stored) ? stored : initial)

  // Tabs holding a field with a validation error are marked, and when a submit brings new
  // errors while the open tab has none, the first tab with an error opens.
  const t = useT()
  const store = useOptionalFormStore()
  const errors = useStoreSelector(store?.store ?? NO_FORM_STORE, (state) => state.errors)
  const [seenErrors, setSeenErrors] = useState<Record<string, string[]>>({})

  if (seenErrors !== errors) {
    setSeenErrors(errors)

    const reveal = tabToReveal(tabs, active, seenErrors, errors)

    if (reveal !== null) setChosen(reveal)
  }

  const changeTab = (value: string) => {
    setChosen(value)

    if (persist) writePersisted(persist.key, value, persist.storage)
  }

  useEffect(() => {
    if (!component.queryStringKey || typeof window === 'undefined') return

    const tab = tabs.find((item) => item.key === active)
    const url = new URL(window.location.href)
    url.searchParams.set(component.queryStringKey, tab ? tabQueryValue(tab) : active)
    window.history.replaceState(window.history.state, '', url)
  }, [active, component.queryStringKey, tabs])

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
        {tabs.map((tab) => {
          const invalid = componentHasErrors(tab, errors)

          return (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              data-invalid={invalid || undefined}
              className={invalid ? TAB_INVALID_CLASSES : undefined}
            >
              {tab.icon && tab.iconPosition !== 'after' && <Icon name={tab.icon} />}
              {tab.label}
              {tab.icon && tab.iconPosition === 'after' && <Icon name={tab.icon} />}
              <TabBadge tab={tab} />
              {invalid && (
                <>
                  <span
                    aria-hidden="true"
                    className="bg-destructive size-1.5 shrink-0 rounded-full"
                  />
                  <span className="sr-only">({t('translatable.has_errors')})</span>
                </>
              )}
            </TabsTrigger>
          )
        })}
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
