<script lang="ts">
  import type {
    ActionContext,
    ColumnLayoutNode,
    ColumnSchema,
    TableRecordSchema,
    TableSchema,
    TableSelection,
  } from '@alfakit/core'
  import {
    VIRTUAL_ESTIMATES,
    contentGridClasses,
    primaryColumnName,
    recordActionsAtStart,
    virtualizeOptions,
  } from '@alfakit/core'
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down'
  import { SvelteMap } from 'svelte/reactivity'
  import { useT } from '../../context.svelte'
  import { useVirtualList } from '../../hooks/virtual.svelte'
  import { cn } from '../../lib/utils'
  import ActionList from '../actions/ActionList.svelte'
  import { Button } from '../ui/button'
  import { Checkbox } from '../ui/checkbox'
  import ContentLayoutNode from './ContentLayoutNode.svelte'

  /**
   * Records arranged by a content layout (`Split`, `Stack`, `Panel`, `Grid`) instead of a
   * row of cells, optionally as cards in a `contentGrid()`. Long pages render only the
   * records in view (plus a few around them), by whole rows of the card grid; the list
   * keeps `aria-setsize` / `aria-posinset` so assistive technology knows the real positions.
   */
  interface Props {
    table: TableSchema
    records: TableRecordSchema[]
    columns: ColumnSchema[]
    token: string
    component: string
    context: ActionContext
    selectable: boolean
    selection: TableSelection
    isSelected: (key: TableRecordSchema['key']) => boolean
    onRecordClick: (record: TableRecordSchema) => void
  }

  let {
    table,
    records,
    columns,
    token,
    component,
    context,
    selectable,
    selection,
    isSelected,
    onRecordClick,
  }: Props = $props()

  const t = useT()
  const virtual = useVirtualList(
    () => records.length,
    () =>
      virtualizeOptions(
        table.virtualize,
        VIRTUAL_ESTIMATES.item,
        table.contentGrid ? 16 : 0,
        table.contentGrid ? 'auto' : 1,
      ),
  )
  // Ids of the per-record details regions (`aria-controls`).
  const panelId = $derived(`alfakit-details-${component}-${table.identifier ?? 'table'}`)

  const layout = $derived(table.contentLayout ?? [])
  const hasCollapsible = (nodes: ColumnLayoutNode[]): boolean =>
    nodes.some(
      (node) =>
        node.type !== 'Column' &&
        ((node.type === 'Panel' && Boolean(node.collapsible)) || hasCollapsible(node.schema)),
    )
  const collapsible = $derived(hasCollapsible(layout))
  const startsOpen = $derived(
    layout.some((node) => node.type === 'Panel' && node.collapsible && !node.collapsed),
  )
  // Collapsible panels at the top level go under the record's main row.
  const main = $derived(layout.filter((node) => !(node.type === 'Panel' && node.collapsible)))
  const details = $derived(layout.filter((node) => node.type === 'Panel' && node.collapsible))
  const opened = new SvelteMap<string, boolean>()
  const isOpen = (record: TableRecordSchema) => opened.get(String(record.key)) ?? startsOpen
  const primary = $derived(primaryColumnName(columns))
  const atStart = $derived(recordActionsAtStart(table.recordActionsPosition))
  const nodeKey = (node: ColumnLayoutNode, index: number) =>
    node.type === 'Column' ? `column:${node.name}` : `${node.type}:${index}`
</script>

<!-- `contentGrid()` breakpoints follow the table's width (this `@container`), not the
     viewport's: beside the sidebar and a cluster's sub-navigation the table can be narrow. -->
<div data-slot="table-content-container" class="@container">
  <div
    data-slot="table-content"
    role={virtual.range.active ? 'list' : undefined}
    style={virtual.style}
    class={table.contentGrid
      ? cn('grid gap-4 p-4', contentGridClasses(table.contentGrid))
      : 'divide-y'}
    {@attach virtual.attach}
  >
    {#each virtual.indexes as index (String(records[index]?.key ?? index))}
      {@const record = records[index] as TableRecordSchema}
      {@const clickable = Boolean(record.url || table.recordAction)}
      {@const selected = isSelected(record.key)}
      {@const open = isOpen(record)}
      <!-- The actions keep their natural width beside the record's text and wrap onto a line
         of their own when the card is too narrow for both, so they never overlap the text. -->
      {#snippet actions()}
        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
        <div
          data-slot="record-actions"
          class="max-w-full min-w-0"
          onclick={(event) => event.stopPropagation()}
        >
          <ActionList
            actions={record.actions ?? []}
            context={{ ...context, record: record.key }}
            size="sm"
            align="end"
          />
        </div>
      {/snippet}
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
      <div
        data-slot="table-record"
        data-state={selected ? 'selected' : undefined}
        data-index={index}
        role={virtual.range.active ? 'listitem' : undefined}
        aria-setsize={virtual.range.active ? records.length : undefined}
        aria-posinset={virtual.range.active ? index + 1 : undefined}
        {@attach virtual.item}
        class={cn(
          '@container flex flex-col gap-3 p-4',
          table.contentGrid && 'bg-card rounded-lg border shadow-xs',
          clickable && 'hover:bg-muted/40 cursor-pointer',
          selected && 'bg-muted/60',
          record.classes,
        )}
        onclick={() => clickable && onRecordClick(record)}
      >
        <div class="flex flex-wrap items-start gap-3">
          {#if record.actions?.length && table.recordActionsPosition === 'before-cells'}
            {@render actions()}
          {/if}
          {#if selectable}
            <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
            <div class="pt-0.5" onclick={(event) => event.stopPropagation()}>
              {#if record.selectable !== false}
                <Checkbox
                  checked={selected}
                  onCheckedChange={(checked) => selection.toggle(record.key, checked === true)}
                  aria-label={t('table.select_row', {}, 'Select row')}
                />
              {/if}
            </div>
          {/if}
          {#if record.actions?.length && table.recordActionsPosition === 'before-columns'}
            {@render actions()}
          {/if}
          <!-- The text takes the remaining width (at least 15rem before the actions wrap, so a
          name is not broken mid-word beside them). -->
          <div
            data-slot="record-content"
            class="@container flex min-w-0 grow basis-60 flex-col gap-3 break-words"
          >
            {#each main as node, index (nodeKey(node, index))}
              <ContentLayoutNode
                {node}
                {record}
                {columns}
                {token}
                {component}
                {context}
                {clickable}
                {primary}
                hasRecordAction={Boolean(table.recordAction)}
                {open}
                {onRecordClick}
              />
            {/each}
          </div>
          {#if (record.actions?.length && !atStart) || collapsible}
            <div class="ms-auto flex max-w-full min-w-0 items-start gap-3">
              {#if record.actions?.length && !atStart}
                {@render actions()}
              {/if}
              {#if collapsible}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  class="shrink-0"
                  aria-expanded={open}
                  aria-controls={open ? `${panelId}-${record.key}` : undefined}
                  aria-label={open
                    ? t('table.hide_details', {}, 'Hide details')
                    : t('table.show_details', {}, 'Show details')}
                  onclick={(event: MouseEvent) => {
                    event.stopPropagation()
                    opened.set(String(record.key), !open)
                  }}
                >
                  <ChevronDownIcon class={cn('transition-transform', open && 'rotate-180')} />
                </Button>
              {/if}
            </div>
          {/if}
        </div>
        {#if open && details.length > 0}
          <div id="{panelId}-{record.key}" class="flex flex-col gap-3">
            {#each details as node, index (nodeKey(node, main.length + index))}
              <ContentLayoutNode
                {node}
                {record}
                {columns}
                {token}
                {component}
                {context}
                {clickable}
                {primary}
                hasRecordAction={Boolean(table.recordAction)}
                open={true}
                {onRecordClick}
              />
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>
