import type {
  KanbanCardSchema,
  KanbanColumnSchema,
  KanbanEnvironment,
  KanbanLaneSchema,
  KanbanSchema,
  KanbanWidgetSchema,
  LocaleFormatter,
} from '@alfakit/core'
import {
  KanbanController,
  attachKanbanPointer,
  clientErrorNotification,
  createKanbanFiltersStore,
  kanbanActiveFilters,
  kanbanCardsIn,
  kanbanInitials,
  kanbanWipState,
} from '@alfakit/core'
import { router } from '@inertiajs/react'
import {
  CalendarIcon,
  ChevronRightIcon,
  ChevronsLeftRightIcon,
  ChevronsRightLeftIcon,
  FilterIcon,
  PlusIcon,
  SearchIcon,
} from 'lucide-react'
import { Fragment, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useActionRunner, useDirection, useFormatter, usePanel, useT } from '../../context'
import { useStore } from '../../hooks/use-store'
import { badgeColorClasses, colorClass, cssColor } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { usePageActionContext } from '../actions/action-context'
import { ActionList } from '../actions/action-list'
import { FormProvider } from '../form/form-context'
import { showToast } from '../notifications/flash-toasts'
import { SchemaRenderer } from '../schema/schema-renderer'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Spinner } from '../ui/spinner'

type Translate = ReturnType<typeof useT>

/**
 * The board of a `KanbanPage` (schema component `kanban`) or a `KanbanWidget`
 * (alfasix/alfakit-kanban). Cards move by dragging (mouse, pen, touch) or with the
 * keyboard, and every move is saved in one request.
 */
export function Kanban({
  component,
  widget,
}: {
  component?: KanbanSchema
  widget?: KanbanWidgetSchema
}) {
  const board = component ?? widget?.kanban

  return board ? <KanbanBoard key={board.actionComponent} board={board} /> : null
}

function KanbanBoard({ board }: { board: KanbanSchema }) {
  const runner = useActionRunner()
  const page = usePageActionContext()
  const panel = usePanel()
  const t = useT()
  const direction = useDirection()
  const formatter = useFormatter()
  const labelId = useId()
  const instructionsId = useId()
  const environment = (): KanbanEnvironment => ({
    runner,
    token: page.token,
    t,
    notify: (notifications) => notifications.forEach((notification) => showToast(notification)),
    error: (message) => showToast(clientErrorNotification('kanban', message)),
    visit: (url) => router.visit(url),
  })
  // One controller per board (the parent keys this view by its action component).
  const [controller] = useState(() => new KanbanController(board, environment()))
  const [filters] = useState(() =>
    createKanbanFiltersStore(board, page.token, panel.endpoints.schemaOptions),
  )
  const root = useRef<HTMLDivElement>(null)
  const cards = useRef(new Map<string, HTMLElement>())
  const [focused, setFocused] = useState<string | null>(null)

  useEffect(() => {
    controller.setEnvironment(environment())
  })

  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false

      return
    }

    controller.setBoard(board)
  }, [controller, board])

  useEffect(
    () => (root.current ? attachKanbanPointer(root.current, controller) : undefined),
    [controller],
  )
  useEffect(() => controller.startPolling(), [controller])
  useEffect(
    () => () => {
      controller.destroy()
      filters?.destroy()
    },
    [controller, filters],
  )

  const state = useStore(controller.store)
  const schema = controller.schema
  const lanes = controller.lanes()
  const keys = state.columns.flatMap((column) => column.cards.map((card) => card.key))
  const current = focused !== null && keys.includes(focused) ? focused : (keys[0] ?? null)

  const focus = (key: string | undefined) => {
    if (!key) return
    setFocused(key)
    requestAnimationFrame(() => cards.current.get(key)?.focus())
  }

  // A card picked up with the keyboard moves to another list: keep the focus on it.
  const picked = state.picked

  useEffect(() => {
    if (picked?.via === 'keyboard') {
      const element = cards.current.get(picked.key)

      if (element && document.activeElement !== element) element.focus()
    }
  }, [picked])

  const onKeyDown = (key: string) => (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return

    const result = controller.handleKey(key, event, direction)

    if (!result.handled) return

    event.preventDefault()

    if (result.open) controller.open(key)
    else focus(result.focus)
  }

  const template = state.columns
    .map((column) => (state.collapsed.has(column.key) ? '3.25rem' : 'minmax(16rem, 20rem)'))
    .join(' ')

  return (
    <Card
      ref={root}
      role="region"
      aria-labelledby={labelId}
      className="gap-3 py-4"
      data-slot="kanban"
    >
      <div className="flex flex-wrap items-center gap-2 px-4" data-slot="kanban-toolbar">
        {schema.heading ? (
          <CardTitle id={labelId} className="text-base">
            {schema.heading}
          </CardTitle>
        ) : (
          <span id={labelId} className="sr-only">
            {t('kanban.label', {}, 'Kanban board')}
          </span>
        )}
        <div className="ms-auto flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {state.loading && (
            <Spinner className="size-4" aria-label={t('kanban.loading', {}, 'Loading board')} />
          )}
          {schema.searchable && (
            <KanbanSearch controller={controller} search={state.search} t={t} />
          )}
          {filters && <KanbanFilters controller={controller} store={filters} t={t} />}
        </div>
      </div>
      <p id={instructionsId} className="sr-only">
        {t(
          'kanban.instructions',
          {},
          'Press Space to pick up a card. While it is picked up, use the arrow keys to move it, Space to drop it and Escape to cancel.',
        )}
      </p>
      <div
        className="relative overflow-x-auto overscroll-x-contain px-4 pb-2"
        data-slot="kanban-scroller"
      >
        <div
          className="grid w-max min-w-full snap-x gap-3"
          style={{ gridTemplateColumns: template }}
        >
          {state.columns.map((column) => (
            <ColumnHeader
              key={column.key}
              column={column}
              id={`${labelId}-column-${column.key}`}
              collapsed={state.collapsed.has(column.key)}
              creatable={Boolean(column.creatable && schema.createAction)}
              filtered={state.search !== '' || kanbanActiveFilters(state.filters) > 0}
              onToggle={() => controller.toggleColumn(column.key)}
              onCreate={() => controller.create(column.key)}
              t={t}
            />
          ))}
          {lanes.map((lane) => {
            const laneId = lane ? `${labelId}-lane-${lane.key}` : undefined
            const collapsedLane = lane !== null && state.collapsedLanes.has(lane.key)

            return (
              <Fragment key={lane?.key ?? '__board'}>
                {lane && (
                  <LaneHeader
                    lane={lane}
                    id={laneId!}
                    count={state.columns.reduce(
                      (sum, column) => sum + kanbanCardsIn(column, lane.key).length,
                      0,
                    )}
                    collapsed={collapsedLane}
                    onToggle={() => controller.toggleLane(lane.key)}
                    t={t}
                  />
                )}
                {!collapsedLane &&
                  state.columns.map((column) => {
                    const collapsed = state.collapsed.has(column.key)
                    const items = kanbanCardsIn(column, lane?.key ?? null)
                    const hidden = lane === null ? column.total - column.cards.length : 0

                    return (
                      <ul
                        key={column.key}
                        role="list"
                        aria-labelledby={[`${labelId}-column-${column.key}`, laneId]
                          .filter(Boolean)
                          .join(' ')}
                        data-slot="kanban-dropzone"
                        data-column={column.key}
                        data-lane={lane?.key}
                        data-refused={
                          state.picked && state.refused?.column === column.key ? '' : undefined
                        }
                        className={cn(
                          'bg-muted/40 flex min-h-24 flex-col gap-2 rounded-lg p-2',
                          lane === null && 'max-h-[70vh] overflow-y-auto',
                        )}
                      >
                        {!collapsed &&
                          items.map((card) => (
                            <KanbanCard
                              key={card.key}
                              card={card}
                              board={schema}
                              token={page.token}
                              current={current === card.key}
                              picked={state.picked?.key === card.key ? state.picked.via : undefined}
                              saving={state.saving.has(card.key)}
                              describedBy={instructionsId}
                              formatter={formatter}
                              t={t}
                              setRef={(element) => {
                                if (element) cards.current.set(card.key, element)
                                else cards.current.delete(card.key)
                              }}
                              onFocus={() => setFocused(card.key)}
                              onKeyDown={onKeyDown(card.key)}
                              onOpen={() => controller.open(card.key)}
                            />
                          ))}
                        {!collapsed && items.length === 0 && (
                          <li
                            className="text-muted-foreground rounded-md border border-dashed px-2 py-6 text-center text-xs"
                            data-slot="kanban-empty"
                          >
                            {state.search !== '' || kanbanActiveFilters(state.filters) > 0
                              ? t('kanban.no_results', {}, 'No cards match')
                              : (column.emptyState ?? t('kanban.empty', {}, 'No cards'))}
                          </li>
                        )}
                        {!collapsed && hidden > 0 && (
                          <li className="text-muted-foreground px-2 text-center text-xs">
                            {t('kanban.more_cards', { count: hidden }, '+:count more')}
                          </li>
                        )}
                      </ul>
                    )
                  })}
              </Fragment>
            )
          })}
        </div>
      </div>
      <div className="sr-only" role="status" aria-live="polite">
        {state.announcement}
      </div>
    </Card>
  )
}

function KanbanSearch({
  controller,
  search,
  t,
}: {
  controller: KanbanController
  search: string
  t: Translate
}) {
  const [value, setValue] = useState(search)
  const [synced, setSynced] = useState(search)

  if (synced !== search) {
    setSynced(search)
    setValue(search)
  }

  return (
    <div className="relative w-full sm:w-64">
      <SearchIcon
        className="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={value}
        className="h-8 ps-8"
        placeholder={t('kanban.search_placeholder', {}, 'Search…')}
        aria-label={t('kanban.search', {}, 'Search cards')}
        onChange={(event) => {
          setValue(event.target.value)
          controller.setSearch(event.target.value)
        }}
      />
    </div>
  )
}

function KanbanFilters({
  controller,
  store,
  t,
}: {
  controller: KanbanController
  store: NonNullable<ReturnType<typeof createKanbanFiltersStore>>
  t: Translate
}) {
  const form = useStore(store.store)
  const [initial] = useState(() => ({
    components: store.state.components,
    state: store.state.values,
    columns: store.state.columns,
  }))
  const active = kanbanActiveFilters(form.values)

  useEffect(() => {
    if (form.dirty.size > 0) controller.setFilters(form.values)
  }, [controller, form.values, form.dirty])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" data-slot="kanban-filters">
          <FilterIcon aria-hidden="true" />
          {t('kanban.filters', {}, 'Filters')}
          {active > 0 && <Badge className="h-5 min-w-5 px-1">{active}</Badge>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 sm:w-96">
        <FormProvider store={store}>
          <div className="flex flex-col gap-4">
            <SchemaRenderer components={form.components} columns={form.columns} className="gap-4" />
            {active > 0 && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => {
                    store.fill(initial)
                    controller.setFilters(null, 0)
                  }}
                >
                  {t('kanban.reset_filters', {}, 'Reset')}
                </Button>
              </div>
            )}
          </div>
        </FormProvider>
      </PopoverContent>
    </Popover>
  )
}

function ColumnHeader({
  column,
  id,
  collapsed,
  creatable,
  filtered,
  onToggle,
  onCreate,
  t,
}: {
  column: KanbanColumnSchema
  id: string
  collapsed: boolean
  creatable: boolean
  filtered: boolean
  onToggle: () => void
  onCreate: () => void
  t: Translate
}) {
  const wip = kanbanWipState(column)
  const shown =
    column.wipLimit !== undefined ? column.count : filtered ? column.total : column.count
  const countLabel =
    column.wipLimit !== undefined
      ? t('kanban.wip', { count: column.count, limit: column.wipLimit }, ':count of :limit')
      : filtered && column.total !== column.count
        ? t(
            'kanban.count_filtered',
            { shown: column.total, count: column.count },
            ':shown of :count cards',
          )
        : t('kanban.count', { count: column.count }, ':count cards')
  const style = column.color ? { borderTopColor: cssColor(column.color) } : undefined
  const toggleLabel = collapsed
    ? t('kanban.expand', { column: column.label }, 'Expand :column')
    : t('kanban.collapse', { column: column.label }, 'Collapse :column')

  if (collapsed) {
    return (
      <div
        className="bg-muted/60 flex snap-start flex-col items-center gap-2 rounded-lg border border-t-4 px-1 py-2"
        style={style}
        data-slot="kanban-column-header"
        data-column={column.key}
        data-collapsed=""
        data-wip={wip ?? undefined}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={toggleLabel}
          aria-expanded={false}
          onClick={onToggle}
        >
          <ChevronsLeftRightIcon aria-hidden="true" />
        </Button>
        <span className="text-muted-foreground text-xs tabular-nums" title={countLabel}>
          {shown}
        </span>
        <h3 id={id} className="text-sm font-medium [writing-mode:vertical-rl]">
          {column.label}
        </h3>
      </div>
    )
  }

  return (
    <div
      className="bg-muted/60 flex snap-start flex-col gap-1 rounded-lg border border-t-4 px-3 py-2"
      style={style}
      data-slot="kanban-column-header"
      data-column={column.key}
      data-wip={wip ?? undefined}
    >
      <div className="flex items-center gap-2">
        {column.icon && <Icon name={column.icon} className="text-muted-foreground size-4" />}
        <h3 id={id} className="min-w-0 truncate text-sm font-semibold">
          {column.label}
        </h3>
        <Badge
          variant="secondary"
          className={cn(
            'h-5 px-1.5 tabular-nums',
            wip === 'over' && 'bg-destructive/15 text-destructive',
            wip === 'full' && 'bg-warning/15 text-warning',
          )}
          title={countLabel}
        >
          <span aria-hidden="true">
            {column.wipLimit !== undefined ? `${column.count}/${column.wipLimit}` : shown}
          </span>
          <span className="sr-only">{countLabel}</span>
        </Badge>
        <div className="ms-auto flex items-center">
          {creatable && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={t('kanban.add_card', { column: column.label }, 'Add a card to :column')}
              title={t('kanban.add_card', { column: column.label }, 'Add a card to :column')}
              onClick={onCreate}
            >
              <PlusIcon aria-hidden="true" />
            </Button>
          )}
          {column.collapsible && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={toggleLabel}
              title={toggleLabel}
              aria-expanded={true}
              onClick={onToggle}
            >
              <ChevronsRightLeftIcon aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
      {column.description && (
        <p className="text-muted-foreground line-clamp-2 text-xs">{column.description}</p>
      )}
      {wip === 'over' && (
        <p className="text-destructive text-xs">
          {t('kanban.wip_over', { limit: column.wipLimit ?? 0 }, 'Over the limit of :limit cards')}
        </p>
      )}
      {wip === 'full' && column.wipStrict && (
        <p className="text-muted-foreground text-xs">
          {t('kanban.wip_full', {}, 'This column is full')}
        </p>
      )}
    </div>
  )
}

function LaneHeader({
  lane,
  id,
  count,
  collapsed,
  onToggle,
  t,
}: {
  lane: KanbanLaneSchema
  id: string
  count: number
  collapsed: boolean
  onToggle: () => void
  t: Translate
}) {
  return (
    <div
      className="flex items-center gap-2 pt-2"
      style={{ gridColumn: '1 / -1' }}
      data-slot="kanban-lane"
      data-lane={lane.key}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-expanded={!collapsed}
        aria-label={
          collapsed
            ? t('kanban.expand_lane', { lane: lane.label }, 'Expand row :lane')
            : t('kanban.collapse_lane', { lane: lane.label }, 'Collapse row :lane')
        }
        onClick={onToggle}
      >
        <ChevronRightIcon
          className={cn(
            'transition-transform rtl:rotate-180',
            !collapsed && 'rotate-90 rtl:rotate-90',
          )}
          aria-hidden="true"
        />
      </Button>
      {lane.avatar ? (
        <Avatar className="size-6">
          <AvatarImage src={lane.avatar} alt="" />
          <AvatarFallback>{kanbanInitials(lane.label)}</AvatarFallback>
        </Avatar>
      ) : (
        lane.icon && <Icon name={lane.icon} className="text-muted-foreground size-4" />
      )}
      <span id={id} className="text-sm font-semibold">
        {lane.label}
      </span>
      <Badge variant="secondary" className="h-5 px-1.5 tabular-nums">
        {count}
      </Badge>
    </div>
  )
}

function KanbanCard({
  card,
  board,
  token,
  current,
  picked,
  saving,
  describedBy,
  formatter,
  t,
  setRef,
  onFocus,
  onKeyDown,
  onOpen,
}: {
  card: KanbanCardSchema
  board: KanbanSchema
  token: string
  current: boolean
  picked: 'keyboard' | 'pointer' | undefined
  saving: boolean
  describedBy: string
  formatter: LocaleFormatter
  t: Translate
  setRef: (element: HTMLElement | null) => void
  onFocus: () => void
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
  onOpen: () => void
}) {
  const titleId = useId()
  const opens = card.clickable !== false && Boolean(card.url || board.cardAction)
  const assignees = card.assignees ?? []
  const shownAssignees = assignees.slice(0, 3)

  return (
    <li
      className="relative"
      data-slot="kanban-card"
      data-key={card.key}
      data-movable={board.movable && card.movable !== false ? undefined : 'false'}
      data-picked={picked}
      data-saving={saving ? '' : undefined}
    >
      <div
        ref={setRef}
        role="button"
        tabIndex={current ? 0 : -1}
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        aria-disabled={opens ? undefined : true}
        data-slot="kanban-card-body"
        className={cn(
          'bg-card text-card-foreground focus-visible:ring-ring/50 flex touch-manipulation flex-col gap-2 overflow-hidden rounded-lg border p-3 text-start shadow-xs outline-none select-none focus-visible:ring-[3px]',
          opens && 'hover:border-ring/60 cursor-pointer',
          card.color && 'border-s-4',
        )}
        style={card.color ? { borderInlineStartColor: cssColor(card.color) } : undefined}
        onFocus={(event) => event.target === event.currentTarget && onFocus()}
        onKeyDown={onKeyDown}
        onClick={() => opens && onOpen()}
      >
        {card.coverImage && (
          <img
            src={card.coverImage}
            alt={card.coverImageAlt ?? ''}
            loading="lazy"
            draggable={false}
            className="-mx-3 -mt-3 h-32 w-[calc(100%+1.5rem)] max-w-none object-cover"
          />
        )}
        <span
          id={titleId}
          className={cn('text-sm leading-snug font-medium', card.actions && 'pe-7')}
        >
          {card.title}
        </span>
        {card.description && (
          <p className="text-muted-foreground line-clamp-3 text-xs">{card.description}</p>
        )}
        {card.badges && card.badges.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.badges.map((badge, index) => (
              <Badge
                key={index}
                variant="outline"
                title={badge.tooltip}
                className={colorClass(badgeColorClasses, badge.color, 'gray')}
              >
                {badge.icon && <Icon name={badge.icon} />}
                {badge.label}
              </Badge>
            ))}
          </div>
        )}
        {card.schema && card.schema.length > 0 && (
          <SchemaRenderer components={card.schema} className="gap-2 text-xs" />
        )}
        {card.progress !== undefined && (
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(card.progress)}
            aria-label={t(
              'kanban.progress',
              { percent: formatter.percent(card.progress / 100) },
              ':percent complete',
            )}
            className="bg-muted h-1.5 overflow-hidden rounded-full"
          >
            <div
              className="bg-primary h-full rounded-full"
              style={{ width: `${card.progress}%` }}
            />
          </div>
        )}
        {(card.dueDate || assignees.length > 0) && (
          <div className="flex items-center gap-2 text-xs">
            {card.dueDate && (
              <span
                className={cn(
                  'inline-flex items-center gap-1',
                  card.overdue ? 'text-destructive font-medium' : 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="size-3.5" aria-hidden="true" />
                <span className="sr-only">
                  {t('kanban.due', { date: formatter.date(card.dueDate) }, 'Due :date')}
                </span>
                <time dateTime={card.dueDate} aria-hidden="true">
                  {formatter.date(card.dueDate)}
                </time>
                {card.overdue && (
                  <span className="sr-only">{t('kanban.overdue', {}, 'Overdue')}</span>
                )}
              </span>
            )}
            {assignees.length > 0 && (
              <div className="ms-auto flex items-center">
                <span className="sr-only">
                  {t(
                    'kanban.assignees',
                    { names: formatter.list(assignees.map((assignee) => assignee.name)) },
                    'Assigned to :names',
                  )}
                </span>
                <div className="flex -space-x-1.5 rtl:space-x-reverse" aria-hidden="true">
                  {shownAssignees.map((assignee, index) => (
                    <Avatar key={index} className="ring-card size-6 ring-2" title={assignee.name}>
                      {assignee.avatar && <AvatarImage src={assignee.avatar} alt="" />}
                      <AvatarFallback className="text-[0.625rem]">
                        {kanbanInitials(assignee.name)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {assignees.length > shownAssignees.length && (
                    <span className="bg-muted ring-card flex size-6 items-center justify-center rounded-full text-[0.625rem] font-medium ring-2">
                      {t(
                        'kanban.more_assignees',
                        { count: assignees.length - shownAssignees.length },
                        '+:count',
                      )}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {card.actions && card.actions.length > 0 && (
        <div className="absolute end-1.5 top-1.5" data-kanban-no-drag="">
          <ActionList
            actions={card.actions}
            context={{ token, component: board.actionComponent, record: card.key }}
            size="xs"
          />
        </div>
      )}
    </li>
  )
}
