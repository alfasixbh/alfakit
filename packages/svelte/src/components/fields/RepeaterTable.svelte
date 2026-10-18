<script lang="ts">
  import type {
    ActionContext,
    ActionSchema,
    ItemActionName,
    ItemActionSchema,
    SchemaComponent,
    TableColumnSchema,
  } from '@alfakit/core'
  import { resolveItemAction, tableColumnAlignmentClass, tableColumnCells } from '@alfakit/core'
  import { useT } from '../../context.svelte'
  import type { VirtualListBinding } from '../../hooks/virtual.svelte'
  import { cn } from '../../lib/utils'
  import RenderComponent from '../schema/RenderComponent.svelte'
  import VirtualSpacerRow from '../schema/VirtualSpacerRow.svelte'
  import ItemHeaderActions from './ItemHeaderActions.svelte'
  import { useItemActionFallbacks } from './item-actions'
  import TableColumnHeaders from './TableColumnHeaders.svelte'

  interface Props {
    id: string
    columns: TableColumnSchema[]
    count: number
    prefixFor: (index: number) => string
    schemaFor: (index: number) => SchemaComponent[]
    labelledBy?: string
    describedBy?: string
    reorderable: boolean
    cloneable: boolean
    deletable: boolean
    /** `compact()`: tighter cells. */
    compact?: boolean
    onMove: (from: number, to: number) => void
    onClone: (index: number) => void
    onRemove: (index: number) => void
    /** Windowed rows for long lists (see `useVirtualList`). */
    virtual: VirtualListBinding
    /** The field action context item actions run in. */
    context?: ActionContext
    /** The built-in action `name` of the row at `index` (null when hidden). */
    resolve?: (name: ItemActionName, index: number) => ItemActionSchema | null
    /** `extraItemActions()` of the row at `index`. */
    extraActionsFor?: (index: number) => ActionSchema[] | undefined
  }

  let {
    id,
    columns,
    count,
    prefixFor,
    schemaFor,
    labelledBy,
    describedBy,
    reorderable,
    cloneable,
    deletable,
    compact = false,
    onMove,
    onClone,
    onRemove,
    virtual,
    context = { token: '' },
    resolve,
    extraActionsFor,
  }: Props = $props()

  const t = useT()
  const fallbacks = useItemActionFallbacks()
  const resolveAction = (name: ItemActionName, index: number) =>
    resolve ? resolve(name, index) : resolveItemAction(name, {}, undefined, fallbacks[name])
  const hasExtraActions = $derived(
    Boolean(extraActionsFor && virtual.indexes.some((index) => extraActionsFor(index)?.length)),
  )
  const hasControls = $derived(reorderable || cloneable || deletable || hasExtraActions)
  const cellCount = $derived(columns.length + Number(hasControls))
  const cellsFor = (index: number) => tableColumnCells(columns, schemaFor(index), prefixFor(index))
</script>

<!--
  Repeater items as table rows (`->table([...])`): one cell per item field, labels kept for
  screen readers only, and the row controls in the last column.
-->
<div
  data-slot="repeater-table"
  data-compact={compact || undefined}
  class="bg-card relative overflow-x-auto rounded-lg border shadow-xs"
>
  <table
    {id}
    aria-labelledby={labelledBy}
    aria-describedby={describedBy}
    aria-rowcount={virtual.range.active ? count + 1 : undefined}
    class="w-full border-collapse text-sm"
  >
    <thead class="bg-muted/40">
      <tr>
        <TableColumnHeaders {columns} />
        {#if hasControls}
          <th scope="col" class="w-px px-2 py-2">
            <span class="sr-only">{t('actions', {}, 'Actions')}</span>
          </th>
        {/if}
      </tr>
    </thead>
    <tbody {@attach virtual.attach}>
      <VirtualSpacerRow height={virtual.range.before} colSpan={cellCount} />
      {#each virtual.indexes as index (index)}
        {@const cells = cellsFor(index)}
        <tr
          data-slot="repeater-row"
          data-index={index}
          aria-rowindex={virtual.range.active ? index + 2 : undefined}
          class="border-t align-top"
          {@attach virtual.item}
        >
          {#each cells as cell, cellIndex (cell?.key ?? `empty-${cellIndex}`)}
            <td
              class={cn(
                compact ? 'px-1.5 py-1' : 'px-3 py-2',
                '[&_[data-slot=label]]:sr-only',
                tableColumnAlignmentClass(columns[cellIndex] ?? {}),
              )}
            >
              {#if cell}<RenderComponent component={cell} />{/if}
            </td>
          {/each}
          {#if hasControls}
            <td class={compact ? 'px-1 py-1' : 'px-2 py-2'}>
              <div class="flex items-center justify-end">
                <ItemHeaderActions
                  {context}
                  itemKey={String(index)}
                  {index}
                  {count}
                  resolve={(name) => resolveAction(name, index)}
                  extraActions={extraActionsFor?.(index)}
                  buttons={reorderable}
                  canClone={cloneable}
                  canDelete={deletable}
                  collapsible={false}
                  collapsed={false}
                  {onMove}
                  onClone={() => onClone(index)}
                  onDelete={() => onRemove(index)}
                />
              </div>
            </td>
          {/if}
        </tr>
      {/each}
      <VirtualSpacerRow height={virtual.range.after} colSpan={cellCount} />
    </tbody>
  </table>
</div>
