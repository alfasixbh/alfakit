<script lang="ts">
  import type { KanbanColumnSchema } from '@alfakit/core'
  import { kanbanWipState } from '@alfakit/core'
  import ChevronsLeftRightIcon from '@lucide/svelte/icons/chevrons-left-right'
  import ChevronsRightLeftIcon from '@lucide/svelte/icons/chevrons-right-left'
  import PlusIcon from '@lucide/svelte/icons/plus'
  import { useT } from '../../context.svelte'
  import { cssColor } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { Badge } from '../ui/badge'
  import { Button } from '../ui/button'

  let {
    column,
    id,
    collapsed,
    creatable,
    filtered,
    ontoggle,
    oncreate,
  }: {
    column: KanbanColumnSchema
    id: string
    collapsed: boolean
    creatable: boolean
    filtered: boolean
    ontoggle: () => void
    oncreate: () => void
  } = $props()

  const t = useT()
  const wip = $derived(kanbanWipState(column))
  const shown = $derived(
    column.wipLimit !== undefined ? column.count : filtered ? column.total : column.count,
  )
  const countLabel = $derived(
    column.wipLimit !== undefined
      ? t('kanban.wip', { count: column.count, limit: column.wipLimit }, ':count of :limit')
      : filtered && column.total !== column.count
        ? t(
            'kanban.count_filtered',
            { shown: column.total, count: column.count },
            ':shown of :count cards',
          )
        : t('kanban.count', { count: column.count }, ':count cards'),
  )
  const style = $derived(column.color ? `border-top-color: ${cssColor(column.color)}` : undefined)
  const toggleLabel = $derived(
    collapsed
      ? t('kanban.expand', { column: column.label }, 'Expand :column')
      : t('kanban.collapse', { column: column.label }, 'Collapse :column'),
  )
  const addLabel = $derived(t('kanban.add_card', { column: column.label }, 'Add a card to :column'))
</script>

{#if collapsed}
  <div
    class="bg-muted/60 flex snap-start flex-col items-center gap-2 rounded-lg border border-t-4 px-1 py-2"
    {style}
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
      aria-expanded="false"
      onclick={ontoggle}
    >
      <ChevronsLeftRightIcon aria-hidden="true" />
    </Button>
    <span class="text-muted-foreground text-xs tabular-nums" title={countLabel}>{shown}</span>
    <h3 {id} class="text-sm font-medium [writing-mode:vertical-rl]">{column.label}</h3>
  </div>
{:else}
  <div
    class="bg-muted/60 flex snap-start flex-col gap-1 rounded-lg border border-t-4 px-3 py-2"
    {style}
    data-slot="kanban-column-header"
    data-column={column.key}
    data-wip={wip ?? undefined}
  >
    <div class="flex items-center gap-2">
      {#if column.icon}
        <Icon name={column.icon} class="text-muted-foreground size-4" />
      {/if}
      <h3 {id} class="min-w-0 truncate text-sm font-semibold">{column.label}</h3>
      <Badge
        variant="secondary"
        class={cn(
          'h-5 px-1.5 tabular-nums',
          wip === 'over' && 'bg-destructive/15 text-destructive',
          wip === 'full' && 'bg-warning/15 text-warning',
        )}
        title={countLabel}
      >
        <span aria-hidden="true"
          >{column.wipLimit !== undefined ? `${column.count}/${column.wipLimit}` : shown}</span
        >
        <span class="sr-only">{countLabel}</span>
      </Badge>
      <div class="ms-auto flex items-center">
        {#if creatable}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={addLabel}
            title={addLabel}
            onclick={oncreate}
          >
            <PlusIcon aria-hidden="true" />
          </Button>
        {/if}
        {#if column.collapsible}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={toggleLabel}
            title={toggleLabel}
            aria-expanded="true"
            onclick={ontoggle}
          >
            <ChevronsRightLeftIcon aria-hidden="true" />
          </Button>
        {/if}
      </div>
    </div>
    {#if column.description}
      <p class="text-muted-foreground line-clamp-2 text-xs">{column.description}</p>
    {/if}
    {#if wip === 'over'}
      <p class="text-destructive text-xs">
        {t('kanban.wip_over', { limit: column.wipLimit ?? 0 }, 'Over the limit of :limit cards')}
      </p>
    {/if}
    {#if wip === 'full' && column.wipStrict}
      <p class="text-muted-foreground text-xs">{t('kanban.wip_full', {}, 'This column is full')}</p>
    {/if}
  </div>
{/if}
