<script lang="ts">
  import type { KanbanCardSchema, KanbanSchema } from '@alfakit/core'
  import { kanbanInitials } from '@alfakit/core'
  import CalendarIcon from '@lucide/svelte/icons/calendar'
  import { useFormatter, useT } from '../../context.svelte'
  import { badgeColorClasses, colorClass, cssColor } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import ActionList from '../actions/ActionList.svelte'
  import SchemaRenderer from '../schema/SchemaRenderer.svelte'
  import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
  import { Badge } from '../ui/badge'

  let {
    card,
    board,
    token,
    current,
    picked,
    saving,
    describedBy,
    register,
    onfocus,
    onkeydown,
    onopen,
  }: {
    card: KanbanCardSchema
    board: KanbanSchema
    token: string
    current: boolean
    picked?: 'keyboard' | 'pointer'
    saving: boolean
    describedBy: string
    register: (element: HTMLElement) => { destroy(): void }
    onfocus: () => void
    onkeydown: (event: KeyboardEvent) => void
    onopen: () => void
  } = $props()

  const t = useT()
  const formatter = useFormatter()
  const titleId = $props.id()
  const opens = $derived(card.clickable !== false && Boolean(card.url || board.cardAction))
  const assignees = $derived(card.assignees ?? [])
  const shownAssignees = $derived(assignees.slice(0, 3))
  const dueDate = $derived(card.dueDate ? formatter.current.date(card.dueDate) : '')
</script>

<li
  class="relative"
  data-slot="kanban-card"
  data-key={card.key}
  data-movable={board.movable && card.movable !== false ? undefined : 'false'}
  data-picked={picked}
  data-saving={saving ? '' : undefined}
>
  <div
    use:register
    role="button"
    tabindex={current ? 0 : -1}
    aria-labelledby={titleId}
    aria-describedby={describedBy}
    aria-disabled={opens ? undefined : true}
    data-slot="kanban-card-body"
    class={cn(
      'bg-card text-card-foreground focus-visible:ring-ring/50 flex touch-manipulation flex-col gap-2 overflow-hidden rounded-lg border p-3 text-start shadow-xs outline-none select-none focus-visible:ring-[3px]',
      opens && 'hover:border-ring/60 cursor-pointer',
      card.color && 'border-s-4',
    )}
    style={card.color ? `border-inline-start-color: ${cssColor(card.color)}` : undefined}
    onfocus={(event) => event.target === event.currentTarget && onfocus()}
    {onkeydown}
    onclick={() => opens && onopen()}
  >
    {#if card.coverImage}
      <img
        src={card.coverImage}
        alt={card.coverImageAlt ?? ''}
        loading="lazy"
        draggable="false"
        class="-mx-3 -mt-3 h-32 w-[calc(100%+1.5rem)] max-w-none object-cover"
      />
    {/if}
    <span id={titleId} class={cn('text-sm leading-snug font-medium', card.actions && 'pe-7')}
      >{card.title}</span
    >
    {#if card.description}
      <p class="text-muted-foreground line-clamp-3 text-xs">{card.description}</p>
    {/if}
    {#if card.badges?.length}
      <div class="flex flex-wrap gap-1">
        {#each card.badges as badge, index (index)}
          <Badge
            variant="outline"
            title={badge.tooltip}
            class={colorClass(badgeColorClasses, badge.color, 'gray')}
          >
            {#if badge.icon}<Icon name={badge.icon} />{/if}
            {badge.label}
          </Badge>
        {/each}
      </div>
    {/if}
    {#if card.schema?.length}
      <SchemaRenderer components={card.schema} class="gap-2 text-xs" />
    {/if}
    {#if card.progress !== undefined}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(card.progress)}
        aria-label={t(
          'kanban.progress',
          { percent: formatter.current.percent(card.progress / 100) },
          ':percent complete',
        )}
        class="bg-muted h-1.5 overflow-hidden rounded-full"
      >
        <div class="bg-primary h-full rounded-full" style="width: {card.progress}%"></div>
      </div>
    {/if}
    {#if card.dueDate || assignees.length > 0}
      <div class="flex items-center gap-2 text-xs">
        {#if card.dueDate}
          <span
            class={cn(
              'inline-flex items-center gap-1',
              card.overdue ? 'text-destructive font-medium' : 'text-muted-foreground',
            )}
          >
            <CalendarIcon class="size-3.5" aria-hidden="true" />
            <span class="sr-only">{t('kanban.due', { date: dueDate }, 'Due :date')}</span>
            <time datetime={card.dueDate} aria-hidden="true">{dueDate}</time>
            {#if card.overdue}<span class="sr-only">{t('kanban.overdue', {}, 'Overdue')}</span>{/if}
          </span>
        {/if}
        {#if assignees.length > 0}
          <div class="ms-auto flex items-center">
            <span class="sr-only"
              >{t(
                'kanban.assignees',
                { names: formatter.current.list(assignees.map((assignee) => assignee.name)) },
                'Assigned to :names',
              )}</span
            >
            <div class="flex -space-x-1.5 rtl:space-x-reverse" aria-hidden="true">
              {#each shownAssignees as assignee, index (index)}
                <Avatar class="ring-card size-6 ring-2" title={assignee.name}>
                  {#if assignee.avatar}<AvatarImage src={assignee.avatar} alt="" />{/if}
                  <AvatarFallback class="text-[0.625rem]"
                    >{kanbanInitials(assignee.name)}</AvatarFallback
                  >
                </Avatar>
              {/each}
              {#if assignees.length > shownAssignees.length}
                <span
                  class="bg-muted ring-card flex size-6 items-center justify-center rounded-full text-[0.625rem] font-medium ring-2"
                  >{t(
                    'kanban.more_assignees',
                    { count: assignees.length - shownAssignees.length },
                    '+:count',
                  )}</span
                >
              {/if}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
  {#if card.actions?.length}
    <div class="absolute end-1.5 top-1.5" data-kanban-no-drag="">
      <ActionList
        actions={card.actions}
        context={{ token, component: board.actionComponent, record: card.key }}
        size="xs"
      />
    </div>
  {/if}
</li>
