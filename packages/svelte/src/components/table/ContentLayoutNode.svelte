<script lang="ts">
  import type {
    ActionContext,
    ColumnLayoutNode,
    ColumnSchema,
    TableRecordSchema,
  } from '@alfakit/core'
  import {
    columnSpanClasses,
    columnStartClasses,
    columnVisibilityClasses,
    gridColumnsClasses,
    layoutNodeGrows,
    layoutVisibilityClasses,
    splitClasses,
    stackClasses,
  } from '@alfakit/core'
  import { extraProps } from '../../lib/attributes'
  import { cn } from '../../lib/utils'
  import ContentLayoutNode from './ContentLayoutNode.svelte'
  import RecordCell from './RecordCell.svelte'

  interface Props {
    node: ColumnLayoutNode
    record: TableRecordSchema
    columns: ColumnSchema[]
    token: string
    component: string
    context: ActionContext
    clickable: boolean
    primary: string | null | undefined
    hasRecordAction: boolean
    /** Collapsible panels of this record are open. */
    open: boolean
    /** The node is a child of a `Split`. */
    inSplit?: boolean
    onRecordClick: (record: TableRecordSchema) => void
  }

  let {
    node,
    record,
    columns,
    token,
    component,
    context,
    clickable,
    primary,
    hasRecordAction,
    open,
    inSplit = false,
    onRecordClick,
  }: Props = $props()

  const sizing = $derived(
    inSplit ? (layoutNodeGrows(node, columns) ? 'min-w-0 flex-1' : 'shrink-0') : undefined,
  )
  const column = $derived(
    node.type === 'Column' ? columns.find((item) => item.name === node.name) : undefined,
  )
  const layout = $derived(node.type === 'Column' ? null : node)
  // `columnSpan()` / `columnStart()` of a column or layout inside a `Grid`.
  const span = $derived(
    cn(columnSpanClasses(node.columnSpan), columnStartClasses(node.columnStart)),
  )
  const classes = $derived.by(() => {
    if (node.type === 'Column') return cn(sizing, span)

    const visibility = layoutVisibilityClasses(node)

    switch (node.type) {
      case 'Split':
        return cn(splitClasses(node), visibility, sizing, span)
      case 'Stack':
        return cn(stackClasses(node), visibility, sizing, span)
      case 'Grid':
        return cn('grid gap-2', gridColumnsClasses(node.columns), visibility, sizing, span)
      default:
        return cn('bg-muted/50 flex flex-col gap-2 rounded-lg p-3', visibility, sizing, span)
    }
  })
  const hidden = $derived(node.type === 'Panel' && Boolean(node.collapsible) && !open)
  const childKey = (child: ColumnLayoutNode, index: number) =>
    child.type === 'Column' ? `column:${child.name}` : `${child.type}:${index}`
</script>

{#if column}
  <div data-column={column.name} class={cn(sizing, span, columnVisibilityClasses(column, 'block'))}>
    <RecordCell
      {column}
      {record}
      {token}
      {component}
      {context}
      {clickable}
      primary={column.name === primary}
      {hasRecordAction}
      {onRecordClick}
    />
  </div>
{:else if layout && !hidden}
  <div data-layout={layout.type.toLowerCase()} {...extraProps(layout.extraAttributes, classes)}>
    {#each layout.schema as child, index (childKey(child, index))}
      <ContentLayoutNode
        node={child}
        {record}
        {columns}
        {token}
        {component}
        {context}
        {clickable}
        {primary}
        {hasRecordAction}
        {open}
        inSplit={layout.type === 'Split'}
        {onRecordClick}
      />
    {/each}
  </div>
{/if}
