<script lang="ts">
  import type { HelpdeskInboxSchema } from '@alfakit/core'
  import { HelpdeskInboxController } from '@alfakit/core'
  import LockIcon from '@lucide/svelte/icons/lock'
  import SearchIcon from '@lucide/svelte/icons/search'
  import { onDestroy, onMount, untrack } from 'svelte'
  import { useActionRunner, useFormatter, useT } from '../../context.svelte'
  import { useStore } from '../../hooks/store.svelte'
  import { badgeColorClasses, colorClass } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { usePageActionContext } from '../actions/action-context'
  import { Button } from '../ui/button'
  import { Card } from '../ui/card'
  import { Input } from '../ui/input'
  import { Skeleton } from '../ui/skeleton'
  import { Spinner } from '../ui/spinner'
  import HelpdeskBadge from './HelpdeskBadge.svelte'
  import HelpdeskTicketPane from './HelpdeskTicketPane.svelte'

  let { schema }: { schema: HelpdeskInboxSchema } = $props()

  const runner = useActionRunner()
  const page = usePageActionContext()
  const t = useT()
  const formatter = useFormatter()
  const initial = untrack(() => $state.snapshot(schema) as HelpdeskInboxSchema)
  const controller = new HelpdeskInboxController(initial, { runner, token: page.token, t })
  const inbox = useStore(controller.store)
  let searchInput = $state<HTMLInputElement | null>(null)
  let list = $state<HTMLUListElement | null>(null)
  let pane = $state<{ focusComposer: () => void } | null>(null)
  let stop: (() => void) | null = null
  let stopShortcuts: (() => void) | null = null
  let first = true

  $effect(() => {
    const next = $state.snapshot(schema) as HelpdeskInboxSchema

    if (first) {
      first = false

      return
    }

    untrack(() => controller.setSchema(next))
  })

  onMount(() => {
    stop = controller.start()
    stopShortcuts = controller.registerShortcuts({
      focusComposer: () => requestAnimationFrame(() => pane?.focusComposer()),
      focusSearch: () => searchInput?.focus(),
      focusTicket: (key) =>
        requestAnimationFrame(() =>
          list?.querySelector<HTMLElement>(`[data-ticket="${CSS.escape(key)}"]`)?.focus(),
        ),
    })
  })

  onDestroy(() => {
    stop?.()
    stopShortcuts?.()
  })

  const ui = $derived(inbox.current)
</script>

<Card
  data-slot="helpdesk-inbox"
  class="grid h-[calc(100svh-12rem)] min-h-[34rem] grid-cols-1 gap-0 overflow-hidden py-0 md:grid-cols-[18rem_1fr] xl:grid-cols-[13rem_20rem_1fr]"
>
  <nav
    data-slot="helpdesk-views"
    aria-label={t('helpdesk.views', {}, 'Views')}
    class={cn(
      'flex gap-1 overflow-x-auto border-b p-2 md:col-span-2 xl:col-span-1 xl:flex-col xl:overflow-visible xl:border-e xl:border-b-0',
      ui.selected !== null && 'max-md:hidden',
    )}
  >
    {#each ui.list.views as view (view.key)}
      <button
        type="button"
        aria-current={view.key === ui.view ? 'page' : undefined}
        class="hover:bg-muted aria-[current=page]:bg-muted aria-[current=page]:text-foreground text-muted-foreground flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-start text-sm font-medium"
        onclick={() => controller.setView(view.key)}
      >
        <Icon name={view.icon} class="size-4 shrink-0" />
        <span class="flex-1 truncate">{view.label}</span>
        {#if view.count !== undefined && view.count > 0}
          <span
            class={cn(
              'rounded-full px-1.5 text-xs tabular-nums',
              view.color ? colorClass(badgeColorClasses, view.color) : 'bg-muted-foreground/10',
            )}>{formatter.current.number(view.count)}</span
          >
        {/if}
      </button>
    {/each}
  </nav>

  <section
    data-slot="helpdesk-list"
    aria-label={t('helpdesk.tickets', {}, 'Tickets')}
    class={cn('flex min-h-0 flex-col border-e', ui.selected !== null && 'max-md:hidden')}
  >
    <div class="relative border-b p-2">
      <SearchIcon
        aria-hidden="true"
        class="text-muted-foreground pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2"
      />
      <Input
        bind:ref={searchInput}
        type="search"
        value={ui.search}
        oninput={(event) => controller.setSearch(event.currentTarget.value)}
        placeholder={t(
          'helpdesk.search_placeholder',
          {},
          'Search by subject, requester or #number…',
        )}
        aria-label={t('helpdesk.search', {}, 'Search tickets')}
        class="ps-8"
      />
    </div>
    <div class="min-h-0 flex-1 overflow-y-auto" aria-busy={ui.loadingList || undefined}>
      {#if ui.list.tickets.length === 0}
        <div class="text-muted-foreground flex flex-col items-center gap-1 p-8 text-center text-sm">
          {#if ui.loadingList}
            <Spinner />
          {:else}
            <p class="text-foreground font-medium">{t('helpdesk.empty', {}, 'No tickets here')}</p>
            <p>
              {t('helpdesk.empty_description', {}, 'Nothing needs your attention in this view.')}
            </p>
          {/if}
        </div>
      {:else}
        <ul bind:this={list} class="divide-y">
          {#each ui.list.tickets as item (item.key)}
            <li>
              <button
                type="button"
                data-ticket={item.key}
                aria-current={item.key === ui.selected ? 'true' : undefined}
                class="hover:bg-muted/60 aria-[current=true]:bg-muted focus-visible:ring-ring/50 flex w-full flex-col gap-1 px-3 py-2.5 text-start outline-none focus-visible:ring-[3px]"
                onclick={() => void controller.select(item.key)}
              >
                <span class="flex items-center gap-2">
                  {#if item.awaitingReply}
                    <span class="bg-primary size-2 shrink-0 rounded-full" aria-hidden="true"></span>
                    <span class="sr-only"
                      >{t('helpdesk.awaiting_reply', {}, 'Awaiting your reply')}</span
                    >
                  {/if}
                  <span class="text-muted-foreground text-xs tabular-nums">{item.reference}</span>
                  <span class="truncate text-sm font-medium">{item.subject}</span>
                  {#if item.lastActivityAt}
                    <time
                      datetime={item.lastActivityAt}
                      class="text-muted-foreground ms-auto shrink-0 text-xs"
                      >{formatter.current.relative(item.lastActivityAt)}</time
                    >
                  {/if}
                </span>
                <span class="text-muted-foreground flex items-center gap-1 text-xs">
                  <Icon name={item.channelIcon} class="size-3 shrink-0" />
                  <span class="truncate">{item.requester}</span>
                  {#if item.assignee}<span class="truncate">· {item.assignee}</span>{/if}
                </span>
                {#if item.excerpt}
                  <span
                    class={cn(
                      'text-muted-foreground line-clamp-2 text-xs',
                      item.excerptInternal && 'italic',
                    )}
                  >
                    {#if item.excerptInternal}<LockIcon
                        aria-label={t('helpdesk.internal', {}, 'Internal note')}
                        class="me-1 inline size-3"
                      />{/if}{item.excerpt}
                  </span>
                {/if}
                <span class="flex flex-wrap gap-1">
                  <HelpdeskBadge badge={item.status} />
                  {#if item.priority.value !== 'normal'}<HelpdeskBadge badge={item.priority} />{/if}
                  <HelpdeskBadge sla={item.sla} formatter={formatter.current} />
                </span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
      {#if ui.list.hasMore}
        <div class="p-2">
          <Button
            variant="ghost"
            size="sm"
            class="w-full"
            disabled={ui.loadingList}
            onclick={() => void controller.loadMore()}
          >
            {#if ui.loadingList}<Spinner />{/if}
            {t('helpdesk.load_more', {}, 'Load more')}
          </Button>
        </div>
      {/if}
    </div>
  </section>

  <section
    data-slot="helpdesk-ticket"
    aria-label={ui.ticket
      ? `${ui.ticket.reference} ${ui.ticket.subject}`
      : t('helpdesk.conversation', {}, 'Conversation')}
    class={cn('flex min-h-0 min-w-0 flex-col', ui.selected === null && 'max-md:hidden')}
  >
    {#if ui.selected === null}
      <div
        class="text-muted-foreground m-auto flex max-w-xs flex-col items-center gap-1 p-8 text-center text-sm"
      >
        <p class="text-foreground font-medium">{t('helpdesk.select', {}, 'Select a ticket')}</p>
        <p>
          {t('helpdesk.select_description', {}, 'Pick a ticket on the list to read and answer it.')}
        </p>
      </div>
    {:else if ui.ticket === null}
      <div class="flex flex-col gap-3 p-4" aria-busy="true">
        <span class="sr-only">{t('helpdesk.loading', {}, 'Loading…')}</span>
        {#if ui.ticketError}
          <p role="alert" class="text-destructive text-sm">
            {t('helpdesk.load_failed', {}, 'The ticket could not be loaded.')}
          </p>
        {:else}
          <Skeleton class="h-6 w-2/3" />
          <Skeleton class="h-24" />
          <Skeleton class="h-24" />
        {/if}
      </div>
    {:else}
      <HelpdeskTicketPane
        bind:this={pane}
        ticket={ui.ticket}
        {controller}
        token={page.token}
        actionComponent={schema.actionComponent}
      />
    {/if}
  </section>
  <div aria-live="polite" class="sr-only">{ui.announcement}</div>
</Card>
