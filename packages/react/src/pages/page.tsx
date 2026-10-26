import type {
  ContentBlock,
  FormBlock as FormBlockSchema,
  InfolistBlock,
  LinksBlock,
  PageSchema,
  RelationManagersBlock,
  SchemaBlock,
  TableBlock as TableBlockSchema,
  WidgetsBlock as WidgetsBlockSchema,
} from '@alfakit/core'
import {
  applyBodyAttributes,
  customPageProps,
  hasRelationManagerTabs,
  isLazyPlaceholder,
  openDefaultAction,
  RELATION_QUERY_KEY,
  relationManagerTabs,
  relationTabFromQuery,
  relationTabSlug,
  resolveLazyComponents,
  type DefaultActionOpener,
} from '@alfakit/core'
import { Head, Link, usePage } from '@inertiajs/react'
import {
  createElement,
  Fragment,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { PageActionProvider } from '../components/actions/action-context'
import { ActionList } from '../components/actions/action-list'
import { FormBlock } from '../components/form/form-block'
import { KeyboardShortcuts } from '../components/panel/keyboard-shortcuts'
import { LazyPlaceholder } from '../components/panel/lazy-placeholder'
import { Slot } from '../components/panel/slot'
import { SubNavigationLayout } from '../components/panel/sub-navigation'
import { ConflictBanner } from '../components/realtime/conflict-banner'
import { RecordPresence } from '../components/realtime/record-presence'
import { SchemaRenderer } from '../components/schema/schema-renderer'
import { ListTabs, ListTabsPanel } from '../components/table/list-tabs'
import { DataTable } from '../components/table/table-block'
import { Badge } from '../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { WidgetGrid } from '../components/widgets/widgets-block'
import {
  useActionRunner,
  useAlfakit,
  useAlfakitProps,
  usePanel,
  useT,
  type AnyComponent,
} from '../context'
import { BlankLayout } from '../layouts/blank-layout'
import { badgeColorClasses, colorClass } from '../lib/colors'
import { Icon } from '../lib/icons'
import { cn } from '../lib/utils'

/**
 * `Alfakit/Page`: renders any schema-driven page. Custom pages (`Page::$component`) are
 * resolved from the `pages` map passed to `createAlfakit()`.
 */
export function AlfakitPage() {
  const props = useAlfakitProps()
  const panel = usePanel()
  const t = useT()
  const { pages } = useAlfakit()
  // Lazy widgets and relation managers arrive in a deferred prop after the first response.
  const page = useMemo(
    () => (props.page ? resolveLazyComponents(props.page, props.alfakitLazy) : undefined),
    [props.page, props.alfakitLazy],
  )

  useDefaultAction(page)

  if (!page) {
    return null
  }

  // Starter kit mode: the host's `title` callback adds the application name.
  const title = panel.starterKit ? page.title : `${page.title} - ${panel.brandName}`

  if (page.view) {
    const Custom = pages[page.view.component]

    if (!Custom) {
      return (
        <div className="text-destructive p-6">
          {t(
            'page_not_registered',
            { component: page.view.component },
            `Page component ${page.view.component} is not registered in createAlfakit({ pages }).`,
          )}
        </div>
      )
    }

    return (
      <PageActionProvider value={{ token: page.token, component: 'page' }}>
        <Head title={title} />
        {/* The component brings its own PageShell (as in panel mode, where it is the Inertia
            page itself) and takes the live props, so `reloadProps()` reaches it. */}
        <Custom
          {...customPageProps(page.view.props, props as Record<string, unknown>)}
          page={page}
        />
      </PageActionProvider>
    )
  }

  return (
    <PageActionProvider value={{ token: page.token, component: 'page' }}>
      <Head title={title} />
      <PageShell page={page}>
        <PageContent page={page} />
      </PageShell>
    </PageActionProvider>
  )
}

/**
 * Opens the page's default action (`$defaultAction`, `?tableAction=`) once the page has
 * hydrated, and once per page: re-renders after the action ran don't open it again.
 */
export function useDefaultAction(page: PageSchema | undefined) {
  const runner = useActionRunner()
  const opener = useRef<DefaultActionOpener>({ opened: null })

  useEffect(() => {
    openDefaultAction(page, opener.current, (action, context) => runner.trigger(action, context))
  }, [page, runner])
}

/** Sets the page's `$extraBodyAttributes` on `<body>` while it is open. */
export function useBodyAttributes(attributes: Record<string, string> | undefined) {
  const key = attributes ? JSON.stringify(attributes) : ''

  useEffect(
    () => applyBodyAttributes(key ? (JSON.parse(key) as Record<string, string>) : undefined),
    [key],
  )
}

/**
 * The registered layout: `createAlfakit()` registers the panel's (`panelLayouts`), the starter
 * kit its content layout. Without one the page renders bare: importing the panel layouts here
 * would put the sidebar and top bar in every starter kit page.
 */
function layout(registry: { resolve(key: string): AnyComponent | undefined }, key: string) {
  return registry.resolve(key) ?? BlankLayout
}

export function PageShell({ page, children }: { page: PageSchema; children: ReactNode }) {
  const { registry } = useAlfakit()

  useBodyAttributes(page.extraBodyAttributes)

  // Each layout can be replaced: createAlfakit({ components: { 'layout:app': MyLayout } }).
  if (page.layout === 'auth') {
    return createElement(
      layout(registry, 'layout:auth'),
      { heading: page.heading ?? page.title, subheading: page.subheading, page },
      children,
    )
  }

  if (page.layout === 'blank') {
    return createElement(layout(registry, 'layout:blank'), { page }, children)
  }

  if (page.layout === 'fullscreen') {
    return createElement(layout(registry, 'layout:fullscreen'), { page }, children)
  }

  return createElement(
    layout(registry, 'layout:app'),
    { breadcrumbs: page.breadcrumbs, maxContentWidth: page.maxContentWidth, page },
    <>
      {/* `?` overlay, `/`, `g d` and panel command shortcuts (`keyboardShortcuts()`). */}
      <KeyboardShortcuts />
      <Slot name="page.start" />
      <PageHeader page={page} />
      {/* Edit pages: somebody else saved the record (`detectConflicts()`, `Panel::realtime()`). */}
      {page.conflicts &&
        createElement(registry.resolve('page:conflict-banner') ?? ConflictBanner, { page })}
      {page.subNavigation ? (
        <SubNavigationLayout navigation={page.subNavigation}>{children}</SubNavigationLayout>
      ) : (
        children
      )}
      <Slot name="page.end" />
    </>,
  )
}

export function PageHeader({ page }: { page: PageSchema }) {
  const { registry } = useAlfakit()
  const actions = page.headerActions ?? []
  // `$headerActionsAlignment`: the default (end) sits beside the heading; the others
  // stack the actions under it.
  const alignment = page.headerActionsAlignment

  return (
    <>
      <Slot name="page.header.before" />
      <header
        data-slot="page-header"
        data-actions-alignment={alignment}
        className={cn(
          'flex flex-col gap-4',
          !alignment && 'sm:flex-row sm:items-start sm:justify-between',
        )}
      >
        <div className="min-w-0">
          <Slot name="page.heading.before" />
          <h1 className="text-2xl font-semibold tracking-tight">{page.heading ?? page.title}</h1>
          {page.subheading && (
            <p className="text-muted-foreground mt-1 text-sm">{page.subheading}</p>
          )}
          <Slot name="page.heading.after" />
        </div>
        <div
          className={cn(
            'flex shrink-0 flex-wrap items-center gap-2',
            alignment === 'start'
              ? 'justify-start'
              : alignment === 'center'
                ? 'justify-center'
                : alignment === 'between' || alignment === 'justify'
                  ? 'justify-between'
                  : 'justify-end',
          )}
        >
          {/* Record pages with `Panel::realtime()`: who else is on the record. */}
          {page.presence &&
            createElement(registry.resolve('page:presence') ?? RecordPresence, {
              presence: page.presence,
            })}
          <Slot name="page.actions.before" />
          {actions.length > 0 && (
            <ActionList
              actions={actions}
              context={{ token: page.token, component: 'page' }}
              align="end"
              className="max-w-full shrink-0"
            />
          )}
          <Slot name="page.actions.after" />
        </div>
      </header>
      <Slot name="page.header.after" />
    </>
  )
}

export function PageContent({ page }: { page: PageSchema }) {
  return (
    <div className="flex flex-col gap-6">
      {page.content.map((block) => (
        <ContentBlockRenderer key={block.key} block={block} />
      ))}
    </div>
  )
}

export function ContentBlockRenderer({ block }: { block: ContentBlock }) {
  const { registry } = useAlfakit()
  // Links list tabs to the table they control.
  const tabsIdBase = `alfakit-list-tabs-${useId().replace(/[^A-Za-z0-9_-]/g, '')}`

  switch (block.type) {
    case 'Form':
      return <FormBlock block={block as FormBlockSchema} />
    case 'Infolist':
      return (
        <div data-slot="infolist" className="contents">
          <SchemaRenderer
            components={(block as InfolistBlock).components}
            columns={(block as InfolistBlock).columns ?? { default: 1, lg: 2 }}
          />
        </div>
      )
    case 'Schema':
      return (
        <SchemaRenderer components={(block as SchemaBlock).components} columns={{ default: 1 }} />
      )
    case 'Table': {
      const table = block as TableBlockSchema
      const content = table.tabs?.length ? (
        <div className="flex flex-col gap-4">
          <ListTabs
            tabs={table.tabs}
            activeTab={table.activeTab}
            tabsQueryKey={table.tabsQueryKey}
            label={table.pluralModelLabel}
            idBase={tabsIdBase}
          />
          <ListTabsPanel idBase={tabsIdBase} activeTab={table.activeTab}>
            <DataTable table={table} component={table.component} />
          </ListTabsPanel>
        </div>
      ) : (
        <DataTable table={table} component={table.component} />
      )

      if (block.key !== 'table') {
        return content
      }

      // The page's main table: the server sends these slots on List / ManageRelatedRecords pages only.
      return (
        <>
          <Slot name="resource.list-records.table.before" />
          <Slot name="resource.manage-related-records.table.before" />
          {content}
          <Slot name="resource.manage-related-records.table.after" />
          <Slot name="resource.list-records.table.after" />
        </>
      )
    }
    case 'RelationManagers':
      return <RelationManagers block={block as RelationManagersBlock} />
    case 'Widgets':
      return block.key === 'headerWidgets' ? (
        <>
          <Slot name="page.header-widgets.before" />
          <WidgetGrid block={block as WidgetsBlockSchema} />
          <Slot name="page.header-widgets.after" />
        </>
      ) : block.key === 'footerWidgets' ? (
        <>
          <Slot name="page.footer-widgets.before" />
          <WidgetGrid block={block as WidgetsBlockSchema} />
          <Slot name="page.footer-widgets.after" />
        </>
      ) : (
        <WidgetGrid block={block as WidgetsBlockSchema} />
      )
    case 'Links':
      return (
        <div className="flex flex-col items-center gap-1 text-center text-sm">
          {(block as LinksBlock).links.map((link) => (
            <Link
              key={link.url}
              href={link.url}
              className="text-primary underline-offset-4 hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )
    default: {
      const Custom = registry.resolve(block.type)

      return Custom ? createElement(Custom, { block }) : null
    }
  }
}

function RelationManagers({ block }: { block: RelationManagersBlock }) {
  const tabs = useMemo(() => relationManagerTabs(block), [block])
  // `?relation=`: a key in `getRelations()` or a position. The page URL (not
  // `window.location`) so the server renders the same tab as the browser.
  const url = usePage().url
  const [active, setActive] = useState(
    () =>
      relationTabFromQuery(
        tabs,
        new URL(url, 'http://localhost').searchParams.get(RELATION_QUERY_KEY),
      )?.key ??
      tabs[0]?.key ??
      '',
  )

  const changeTab = (key: string) => {
    setActive(key)

    if (typeof window === 'undefined') return

    const next = new URL(window.location.href)
    const slug = relationTabSlug(tabs, key)

    if (slug === null) next.searchParams.delete(RELATION_QUERY_KEY)
    else next.searchParams.set(RELATION_QUERY_KEY, slug)

    window.history.replaceState(window.history.state, '', next)
  }

  if (block.managers.length === 0) {
    return null
  }

  if (!hasRelationManagerTabs(block)) {
    const manager = block.managers[0]!

    return (
      <section className="flex flex-col gap-3">
        <Slot name="resource.relation-manager.before" scope={manager.key} />
        {isLazyPlaceholder(manager) ? (
          <LazyPlaceholder variant="table" />
        ) : (
          <DataTable
            table={{ ...manager.table, heading: manager.table.heading ?? manager.title }}
            component={manager.component}
          />
        )}
        <Slot name="resource.relation-manager.after" scope={manager.key} />
      </section>
    )
  }

  return (
    <Tabs value={active} onValueChange={changeTab}>
      <TabsList>
        <Slot name="resource.tabs.start" />
        {tabs.map((tab) => (
          <TabsTrigger key={tab.key} value={tab.key}>
            {tab.icon && <Icon name={tab.icon} />}
            {tab.title}
            {tab.badge !== undefined && tab.badge !== null && tab.badge !== '' && (
              <Badge
                variant="secondary"
                title={tab.badgeTooltip}
                className={cn(
                  'ms-1 px-1.5 py-0',
                  tab.badgeColor && colorClass(badgeColorClasses, tab.badgeColor, 'gray'),
                )}
              >
                {tab.badge}
                {tab.badgeTooltip && <span className="sr-only">{` (${tab.badgeTooltip})`}</span>}
              </Badge>
            )}
          </TabsTrigger>
        ))}
        <Slot name="resource.tabs.end" />
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent
          key={tab.key}
          value={tab.key}
          className="flex flex-col gap-6 pt-2 data-[state=inactive]:hidden"
          data-slot={tab.group ? 'relation-group' : tab.content ? 'relation-content' : undefined}
          // The form keeps its unsaved state while another tab is open.
          forceMount={tab.content ? true : undefined}
        >
          {/* The page's form / infolist (`hasCombinedRelationManagerTabsWithContent()`). */}
          {tab.content && <ContentBlockRenderer block={tab.content as ContentBlock} />}
          {tab.managers.map((manager) => (
            <Fragment key={manager.key}>
              <Slot name="resource.relation-manager.before" scope={manager.key} />
              {isLazyPlaceholder(manager) ? (
                <LazyPlaceholder variant="table" />
              ) : (
                <DataTable
                  // Inside a group each table keeps its own heading; a lone manager's is the tab.
                  table={{
                    ...manager.table,
                    heading: tab.group ? (manager.table.heading ?? manager.title) : undefined,
                  }}
                  component={manager.component}
                />
              )}
              <Slot name="resource.relation-manager.after" scope={manager.key} />
            </Fragment>
          ))}
        </TabsContent>
      ))}
    </Tabs>
  )
}
