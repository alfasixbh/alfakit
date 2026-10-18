<script lang="ts">
  import type { RepeaterSchema, SchemaComponent } from '@alfakit/core'
  import {
    isDeferredPlaceholder,
    VIRTUAL_ESTIMATES,
    appendRepeaterItem,
    fieldIds,
    cloneIndexedState,
    cloneRepeaterItem,
    gridColumnsClasses,
    moveIndexedState,
    moveRepeaterItem,
    removeIndexedState,
    removeRepeaterItem,
    reorderedItemKeys,
    replacePlaceholder,
    resolveItemAction,
    virtualizeOptions,
    fieldActionContext,
    type ItemActionName,
  } from '@alfakit/core'
  import { useFormatter } from '../../context.svelte'
  import { useScrollToErroredItem, useVirtualList } from '../../hooks/virtual.svelte'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { usePageActionContext } from '../actions/action-context'
  import { useField, useOptionalFormStore } from '../form/form-context.svelte'
  import FieldWrapper from '../schema/FieldWrapper.svelte'
  import DeferredSchema from '../layout/DeferredSchema.svelte'
  import Self from './RepeaterField.svelte'
  import SchemaRenderer from '../schema/SchemaRenderer.svelte'
  import { Collapsible, CollapsibleContent } from '../ui/collapsible'
  import AddActionRow from './AddActionRow.svelte'
  import CollapseAllActions from './CollapseAllActions.svelte'
  import ItemActionButton from './ItemActionButton.svelte'
  import ItemHeaderActions from './ItemHeaderActions.svelte'
  import { useItemActionFallbacks, useRunItemAction } from './item-actions'
  import { useItemMoves } from './item-moves.svelte'
  import RepeaterTable from './RepeaterTable.svelte'

  let { component }: { component: RepeaterSchema } = $props()

  /**
   * Items use the per-index schema from the server when available (so closures see item
   * state) and fall back to the template for freshly added items.
   */
  const formatter = useFormatter()
  const field = useField<unknown[] | null>(() => component)
  const form = useOptionalFormStore()
  const page = usePageActionContext()
  const context = $derived(fieldActionContext({ token: page.token, form, key: component.key }))
  const runItemAction = useRunItemAction(() => context)
  const fallbacks = useItemActionFallbacks()
  const resolve = (name: ItemActionName, index?: number) =>
    resolveItemAction(
      name,
      component,
      index === undefined ? undefined : component.items[index],
      name === 'add' ? { ...fallbacks.add, label: component.addActionLabel } : fallbacks[name],
    )
  // Read-only shows the items but hides add, delete, clone and reorder controls.
  const locked = $derived(field.disabled || field.readOnly)
  const items = $derived(field.value ?? [])
  let collapsed = $state<Record<number, boolean>>({})

  // Collapsed flags are keyed by index, so they move with their item.
  const moveItem = (from: number, to: number) => {
    field.setValue(moveRepeaterItem(items, from, to))
    collapsed = moveIndexedState(collapsed, from, to)
  }
  // Move buttons: announced, one at a time, focus kept on the moved item.
  const moves = useItemMoves(
    moveItem,
    (index) => component.items[index]?.label,
    () => items.length,
  )
  const removeItem = (index: number) => {
    field.setValue(removeRepeaterItem(items, index))
    collapsed = removeIndexedState(collapsed, index)
  }
  const cloneItem = (index: number) => {
    field.setValue(cloneRepeaterItem(items, index))
    collapsed = cloneIndexedState(collapsed, index)
  }
  let dragIndex = $state<number | null>(null)
  // Long lists render only the visible items (plus a few around them); a multi-column
  // `grid()` is windowed by whole rows, counting its columns from the rendered grid.
  const virtual = useVirtualList(
    () => items.length,
    () =>
      virtualizeOptions(
        component.virtualize,
        VIRTUAL_ESTIMATES.item,
        12,
        component.grid ? 'auto' : 1,
      ),
  )
  useScrollToErroredItem(virtual, () => component.statePath)

  const schemaFor = (index: number): SchemaComponent[] =>
    component.items[index]?.schema ??
    replacePlaceholder(component.template, '__INDEX__', String(index))

  const canAdd = $derived(
    component.addable &&
      !locked &&
      (component.maxItems == null || items.length < component.maxItems),
  )
  const canDelete = $derived(
    component.deletable &&
      !locked &&
      (component.minItems == null || items.length > component.minItems),
  )
  const draggable = $derived(
    component.reorderable &&
      component.reorderableWithDragAndDrop !== false &&
      !locked &&
      resolve('reorder') !== null,
  )
  const buttons = $derived(
    component.reorderable && component.reorderableWithButtons !== false && !locked,
  )
  // A drop runs the reorder action: in the browser, or on the server when customised.
  const dropItem = (from: number, to: number) =>
    runItemAction(resolve('reorder'), { items: reorderedItemKeys(items.length, from, to) }, () =>
      moveItem(from, to),
    )
  const setAllCollapsed = (value: boolean) => {
    collapsed = Object.fromEntries(items.map((_, index) => [index, value]))
  }
  const addItem = () =>
    field.setValue(
      appendRepeaterItem(
        items,
        component.simple
          ? { [Object.keys(component.templateState)[0] ?? 'value']: null }
          : component.templateState,
      ),
    )
</script>

<!-- `deferLoading()`: a skeleton until the field scrolls into view. -->
{#if isDeferredPlaceholder(component)}
  <DeferredSchema {component}>
    {#snippet children(loaded)}
      <Self component={loaded} />
    {/snippet}
  </DeferredSchema>
{:else}
  <FieldWrapper field={component} htmlFor={field.id} error={field.error}>
    <div bind:this={moves.state.container} class="flex flex-col gap-3">
      <span aria-live="polite" aria-atomic="true" class="sr-only" data-slot="item-move-status"
        >{moves.state.announcement}</span
      >
      {#if component.table?.length && !component.simple}
        <RepeaterTable
          id={field.id}
          columns={component.table}
          compact={component.compact}
          count={items.length}
          prefixFor={(index) => `${component.statePath}.${index}.`}
          {schemaFor}
          labelledBy={component.label ? fieldIds(field.id).label : undefined}
          describedBy={field.aria['aria-describedby']}
          reorderable={buttons}
          cloneable={Boolean(component.cloneable) && canAdd}
          deletable={canDelete}
          onMove={moveItem}
          onClone={cloneItem}
          onRemove={removeItem}
          {virtual}
          {context}
          resolve={(name, index) => resolve(name, index)}
          extraActionsFor={(index) => component.items[index]?.actions}
        />
      {:else}
        {#if component.collapsible && !component.simple && items.length > 0}
          <CollapseAllActions
            {context}
            collapseAll={resolve('collapseAll')}
            expandAll={resolve('expandAll')}
            onCollapseAll={() => setAllCollapsed(true)}
            onExpandAll={() => setAllCollapsed(false)}
          />
        {/if}
        <ul
          id={field.id}
          aria-labelledby={component.label ? fieldIds(field.id).label : undefined}
          aria-describedby={field.aria['aria-describedby']}
          style={virtual.style}
          class={cn('grid gap-3', component.grid && gridColumnsClasses(component.grid))}
          {@attach virtual.attach}
        >
          {#each virtual.indexes as index (index)}
            {@const isCollapsed = collapsed[index] ?? component.collapsed ?? false}
            {@const label = component.items[index]?.label ?? null}
            <li
              data-index={index}
              aria-setsize={virtual.range.active ? items.length : undefined}
              aria-posinset={virtual.range.active ? index + 1 : undefined}
              {@attach virtual.item}
              {draggable}
              ondragstart={() => (dragIndex = index)}
              ondragover={(event) => draggable && event.preventDefault()}
              ondrop={() => {
                if (dragIndex !== null && dragIndex !== index) dropItem(dragIndex, index)
                dragIndex = null
              }}
              ondragend={() => (dragIndex = null)}
              class={cn(
                'bg-card min-w-0 rounded-lg border shadow-xs',
                dragIndex === index && 'opacity-50',
                component.simple && 'border-0 shadow-none',
              )}
            >
              <Collapsible open={!isCollapsed}>
                {#if !component.simple}
                  <div
                    class="flex flex-wrap items-center gap-1 border-b px-2 py-1.5"
                    data-slot="item-header"
                  >
                    {#if draggable}
                      <span
                        class="text-muted-foreground cursor-grab"
                        title={resolve('reorder')?.label ?? undefined}
                        aria-hidden="true"
                        ><Icon name={resolve('reorder')?.icon ?? 'grip-vertical'} /></span
                      >
                    {/if}
                    {#if component.itemNumbers}
                      <span class="text-muted-foreground text-xs tabular-nums"
                        >{formatter.current.number(index + 1)}</span
                      >
                    {/if}
                    {#if label}<span dir="auto" class="min-w-0 truncate text-sm font-medium"
                        >{label}</span
                      >{/if}
                    <span class="flex-1"></span>
                    <ItemHeaderActions
                      {context}
                      itemKey={String(index)}
                      {index}
                      count={items.length}
                      resolve={(name) => resolve(name, index)}
                      extraActions={locked ? undefined : component.items[index]?.actions}
                      {buttons}
                      canClone={Boolean(component.cloneable) && canAdd}
                      {canDelete}
                      collapsible={Boolean(component.collapsible)}
                      collapsed={isCollapsed}
                      onMove={moves.moveWithButton}
                      onClone={() => cloneItem(index)}
                      onDelete={() => removeItem(index)}
                      onToggle={() => (collapsed = { ...collapsed, [index]: !isCollapsed })}
                    />
                  </div>
                {/if}
                <CollapsibleContent>
                  <div class={cn('flex gap-2', component.simple ? 'items-start' : 'p-4')}>
                    <div class="flex-1">
                      <SchemaRenderer
                        components={schemaFor(index)}
                        columns={component.simple
                          ? { default: 1 }
                          : (component.columns ?? { default: 1, lg: 2 })}
                        class={cn(
                          component.simple && 'gap-0',
                          '[&_[data-slot=field]_[data-slot=label]]:hidden',
                          !component.simple && '[&_[data-slot=field]_[data-slot=label]]:flex',
                        )}
                      />
                    </div>
                    {#if component.simple && canDelete}
                      <ItemActionButton
                        action={resolve('delete', index)}
                        {context}
                        args={{ item: String(index) }}
                        size="default"
                        class="text-muted-foreground"
                        onClient={() => removeItem(index)}
                      />
                    {/if}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </li>
          {/each}
        </ul>
      {/if}
      {#if canAdd}
        <AddActionRow alignment={component.addActionAlignment}>
          <ItemActionButton action={resolve('add')} {context} size="sm" onClient={addItem} />
        </AddActionRow>
      {/if}
    </div>
  </FieldWrapper>
{/if}
