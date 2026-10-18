<script lang="ts">
  import type { KanbanEnvironment, KanbanSchema } from '@alfakit/core'
  import {
    KanbanController,
    attachKanbanPointer,
    clientErrorNotification,
    createKanbanFiltersStore,
    kanbanActiveFilters,
    kanbanCardsIn,
    kanbanInitials,
  } from '@alfakit/core'
  import { router } from '@inertiajs/svelte'
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
  import SearchIcon from '@lucide/svelte/icons/search'
  import { onDestroy, onMount, tick, untrack } from 'svelte'
  import { useActionRunner, useDirection, usePanel, useT } from '../../context.svelte'
  import { useStore } from '../../hooks/store.svelte'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { usePageActionContext } from '../actions/action-context'
  import { showToast } from '../notifications/toast'
  import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
  import { Badge } from '../ui/badge'
  import { Button } from '../ui/button'
  import { Card, CardTitle } from '../ui/card'
  import { Input } from '../ui/input'
  import { Spinner } from '../ui/spinner'
  import KanbanCard from './KanbanCard.svelte'
  import KanbanColumnHeader from './KanbanColumnHeader.svelte'
  import KanbanFilters from './KanbanFilters.svelte'

  /**
   * Cards move by dragging (mouse, pen, touch) or with the keyboard, and every move is
   * saved in one request.
   */
  let { board }: { board: KanbanSchema } = $props()

  const runner = useActionRunner()
  const page = usePageActionContext()
  const panel = usePanel()
  const t = useT()
  const direction = $derived(useDirection())
  const labelId = $props.id()
  const instructionsId = `${labelId}-instructions`

  const environment = (): KanbanEnvironment => ({
    runner,
    token: page.token,
    t,
    notify: (notifications) => notifications.forEach((notification) => showToast(notification)),
    error: (message) => showToast(clientErrorNotification('kanban', message)),
    visit: (url) => router.visit(url),
  })

  const initial = untrack(() => $state.snapshot(board) as KanbanSchema)
  const controller = new KanbanController(initial, environment())
  const filters = createKanbanFiltersStore(initial, page.token, panel.endpoints.schemaOptions)
  const kanban = useStore(controller.store)
  // Card bodies by key, for moving the focus (not reactive state).
  const cards: Record<string, HTMLElement> = {}
  let root = $state<HTMLElement | null>(null)
  let focused = $state<string | null>(null)
  let search = $state(untrack(() => kanban.current.search))
  let detach: (() => void) | null = null
  let stopPolling: (() => void) | null = null

  // A new schema from the server (after an action ran): show it.
  let first = true

  $effect(() => {
    const next = $state.snapshot(board) as KanbanSchema

    if (first) {
      first = false

      return
    }

    untrack(() => controller.setBoard(next))
  })

  onMount(() => {
    if (root) detach = attachKanbanPointer(root, controller)
    stopPolling = controller.startPolling()
  })

  onDestroy(() => {
    detach?.()
    stopPolling?.()
    controller.destroy()
    filters?.destroy()
  })

  // The controller swaps its schema with the board; read it again with the state.
  const schema = $derived.by(() => {
    void kanban.current.columns

    return controller.schema
  })
  const lanes = $derived.by(() => {
    void kanban.current.columns

    return controller.lanes()
  })
  const filtered = $derived(
    kanban.current.search !== '' || kanbanActiveFilters(kanban.current.filters) > 0,
  )
  const keys = $derived(kanban.current.columns.flatMap((column) => column.cards.map((c) => c.key)))
  const current = $derived(focused !== null && keys.includes(focused) ? focused : (keys[0] ?? null))
  const template = $derived(
    kanban.current.columns
      .map((column) =>
        kanban.current.collapsed.has(column.key) ? '3.25rem' : 'minmax(16rem, 20rem)',
      )
      .join(' '),
  )

  $effect(() => {
    const value = kanban.current.search

    untrack(() => {
      if (value !== search) search = value
    })
  })

  // A card picked up with the keyboard moves to another list: keep the focus on it.
  $effect(() => {
    const picked = kanban.current.picked

    if (picked?.via !== 'keyboard') return

    void tick().then(() => {
      const element = cards[picked.key]

      if (element && document.activeElement !== element) element.focus()
    })
  })

  function register(key: string) {
    return (element: HTMLElement) => {
      cards[key] = element

      return {
        destroy: () => {
          if (cards[key] === element) delete cards[key]
        },
      }
    }
  }

  function focus(key: string | undefined) {
    if (!key) return
    focused = key
    void tick().then(() => cards[key]?.focus())
  }

  function onKeyDown(key: string, event: KeyboardEvent) {
    if (event.target !== event.currentTarget) return

    const result = controller.handleKey(key, event, direction)

    if (!result.handled) return

    event.preventDefault()

    if (result.open) controller.open(key)
    else focus(result.focus)
  }

  function onSearch(event: Event) {
    search = (event.currentTarget as HTMLInputElement).value
    controller.setSearch(search)
  }

  function laneCount(lane: string): number {
    return kanban.current.columns.reduce(
      (sum, column) => sum + kanbanCardsIn(column, lane).length,
      0,
    )
  }
</script>

<div bind:this={root} class="contents">
  <Card role="region" aria-labelledby={labelId} class="gap-3 py-4" data-slot="kanban">
    <div class="flex flex-wrap items-center gap-2 px-4" data-slot="kanban-toolbar">
      {#if schema.heading}
        <CardTitle id={labelId} class="text-base">{schema.heading}</CardTitle>
      {:else}
        <span id={labelId} class="sr-only">{t('kanban.label', {}, 'Kanban board')}</span>
      {/if}
      <div class="ms-auto flex w-full flex-wrap items-center gap-2 sm:w-auto">
        {#if kanban.current.loading}<Spinner class="size-4" />{/if}
        {#if schema.searchable}
          <div class="relative w-full sm:w-64">
            <SearchIcon
              class="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={search}
              class="h-8 ps-8"
              placeholder={t('kanban.search_placeholder', {}, 'Search…')}
              aria-label={t('kanban.search', {}, 'Search cards')}
              oninput={onSearch}
            />
          </div>
        {/if}
        {#if filters}<KanbanFilters {controller} store={filters} />{/if}
      </div>
    </div>
    <p id={instructionsId} class="sr-only">
      {t(
        'kanban.instructions',
        {},
        'Press Space to pick up a card. While it is picked up, use the arrow keys to move it, Space to drop it and Escape to cancel.',
      )}
    </p>
    <div
      class="relative overflow-x-auto overscroll-x-contain px-4 pb-2"
      data-slot="kanban-scroller"
    >
      <div class="grid w-max min-w-full snap-x gap-3" style="grid-template-columns: {template}">
        {#each kanban.current.columns as column (column.key)}
          <KanbanColumnHeader
            {column}
            id="{labelId}-column-{column.key}"
            collapsed={kanban.current.collapsed.has(column.key)}
            creatable={Boolean(column.creatable && schema.createAction)}
            {filtered}
            ontoggle={() => controller.toggleColumn(column.key)}
            oncreate={() => controller.create(column.key)}
          />
        {/each}
        {#each lanes as lane (lane?.key ?? '__board')}
          {@const laneId = lane ? `${labelId}-lane-${lane.key}` : undefined}
          {@const collapsedLane = lane !== null && kanban.current.collapsedLanes.has(lane.key)}
          {#if lane}
            <div
              class="flex items-center gap-2 pt-2"
              style="grid-column: 1 / -1"
              data-slot="kanban-lane"
              data-lane={lane.key}
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-expanded={!collapsedLane}
                aria-label={collapsedLane
                  ? t('kanban.expand_lane', { lane: lane.label }, 'Expand row :lane')
                  : t('kanban.collapse_lane', { lane: lane.label }, 'Collapse row :lane')}
                onclick={() => controller.toggleLane(lane.key)}
              >
                <ChevronRightIcon
                  class={cn(
                    'transition-transform rtl:rotate-180',
                    !collapsedLane && 'rotate-90 rtl:rotate-90',
                  )}
                  aria-hidden="true"
                />
              </Button>
              {#if lane.avatar}
                <Avatar class="size-6">
                  <AvatarImage src={lane.avatar} alt="" />
                  <AvatarFallback>{kanbanInitials(lane.label)}</AvatarFallback>
                </Avatar>
              {:else if lane.icon}
                <Icon name={lane.icon} class="text-muted-foreground size-4" />
              {/if}
              <span id={laneId} class="text-sm font-semibold">{lane.label}</span>
              <Badge variant="secondary" class="h-5 px-1.5 tabular-nums"
                >{laneCount(lane.key)}</Badge
              >
            </div>
          {/if}
          {#if !collapsedLane}
            {#each kanban.current.columns as column (column.key)}
              {@const collapsed = kanban.current.collapsed.has(column.key)}
              {@const items = kanbanCardsIn(column, lane?.key ?? null)}
              <ul
                role="list"
                aria-labelledby={[`${labelId}-column-${column.key}`, laneId]
                  .filter(Boolean)
                  .join(' ')}
                data-slot="kanban-dropzone"
                data-column={column.key}
                data-lane={lane?.key}
                data-refused={kanban.current.picked && kanban.current.refused?.column === column.key
                  ? ''
                  : undefined}
                class={cn(
                  'bg-muted/40 flex min-h-24 flex-col gap-2 rounded-lg p-2',
                  lane === null && 'max-h-[70vh] overflow-y-auto',
                )}
              >
                {#if !collapsed}
                  {#each items as card (card.key)}
                    <KanbanCard
                      {card}
                      board={schema}
                      token={page.token}
                      current={current === card.key}
                      picked={kanban.current.picked?.key === card.key
                        ? kanban.current.picked.via
                        : undefined}
                      saving={kanban.current.saving.has(card.key)}
                      describedBy={instructionsId}
                      register={register(card.key)}
                      onfocus={() => (focused = card.key)}
                      onkeydown={(event) => onKeyDown(card.key, event)}
                      onopen={() => controller.open(card.key)}
                    />
                  {/each}
                  {#if items.length === 0}
                    <li
                      class="text-muted-foreground rounded-md border border-dashed px-2 py-6 text-center text-xs"
                      data-slot="kanban-empty"
                    >
                      {filtered
                        ? t('kanban.no_results', {}, 'No cards match')
                        : (column.emptyState ?? t('kanban.empty', {}, 'No cards'))}
                    </li>
                  {/if}
                  {#if lane === null && column.total > column.cards.length}
                    <li class="text-muted-foreground px-2 text-center text-xs">
                      {t(
                        'kanban.more_cards',
                        { count: column.total - column.cards.length },
                        '+:count more',
                      )}
                    </li>
                  {/if}
                {/if}
              </ul>
            {/each}
          {/if}
        {/each}
      </div>
    </div>
    <div class="sr-only" role="status" aria-live="polite">{kanban.current.announcement}</div>
  </Card>
</div>
