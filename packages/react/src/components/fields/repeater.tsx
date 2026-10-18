import type { RepeaterSchema, SchemaComponent } from '@alfakit/core'
import {
  VIRTUAL_ESTIMATES,
  appendRepeaterItem,
  cloneIndexedState,
  cloneRepeaterItem,
  columnSpanClasses,
  fieldIds,
  gridColumnsClasses,
  isDeferredPlaceholder,
  moveIndexedState,
  moveRepeaterItem,
  removeIndexedState,
  removeRepeaterItem,
  reorderedItemKeys,
  replacePlaceholder,
  virtualizeOptions,
} from '@alfakit/core'
import { useState } from 'react'
import { useFormatter } from '../../context'
import { useScrollToErroredItem, useVirtualList } from '../../hooks/use-virtual-list'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { useField } from '../form/form-context'
import { DeferredSchema } from '../layout/deferred'
import { useFieldActionContext } from '../schema/field-actions'
import { FieldWrapper } from '../schema/field-wrapper'
import { SchemaRenderer } from '../schema/schema-renderer'
import { Collapsible, CollapsibleContent } from '../ui/collapsible'
import {
  AddActionRow,
  CollapseAllActions,
  ItemActionButton,
  ItemHeaderActions,
  useItemActionFallbacks,
  useItemActions,
  useItemMoves,
  useRunItemAction,
} from './item-actions'
import { RepeaterTable } from './repeater-table'

/**
 * Items use the per-index schema from the server when available (so closures see item
 * state) and fall back to the template for freshly added items.
 */
/**
 * `deferLoading()`: a skeleton until the field scrolls into view, then the field with its
 * items (loaded from the server).
 */
export function RepeaterField({ component }: { component: RepeaterSchema }) {
  if (!isDeferredPlaceholder(component)) return <RepeaterFieldContent component={component} />

  return (
    <DeferredSchema component={component}>
      {(loaded) => <RepeaterFieldContent component={loaded} />}
    </DeferredSchema>
  )
}

function RepeaterFieldContent({ component }: { component: RepeaterSchema }) {
  const formatter = useFormatter()
  const { value, setValue, error, id, disabled, readOnly, aria } = useField<unknown[] | null>(
    component,
  )
  const context = useFieldActionContext(component)
  const runItemAction = useRunItemAction(context)
  const fallbacks = useItemActionFallbacks(component.addActionLabel)
  const resolve = useItemActions(component, fallbacks)
  // Read-only shows the items but hides add, delete, clone and reorder controls.
  const locked = disabled || readOnly
  const items = value ?? []
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({})
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  // Long lists render only the visible items (plus a few around them); a multi-column
  // `grid()` is windowed by whole rows, counting its columns from the rendered grid.
  const virtual = useVirtualList(
    items.length,
    virtualizeOptions(
      component.virtualize,
      VIRTUAL_ESTIMATES.item,
      12,
      component.grid ? 'auto' : 1,
    ),
  )
  const { range, indexes, style, attach, item } = virtual
  useScrollToErroredItem(virtual.list, range.active, component.statePath)

  // Collapsed flags are keyed by index, so they move with their item.
  const moveItem = (from: number, to: number) => {
    setValue(moveRepeaterItem(items, from, to))
    setCollapsed((state) => moveIndexedState(state, from, to))
  }
  const removeItem = (index: number) => {
    setValue(removeRepeaterItem(items, index))
    setCollapsed((state) => removeIndexedState(state, index))
  }
  const cloneItem = (index: number) => {
    setValue(cloneRepeaterItem(items, index))
    setCollapsed((state) => cloneIndexedState(state, index))
  }
  // Move buttons: announced, one at a time, focus kept on the moved item.
  const {
    moveWithButton,
    region: moveRegion,
    containerRef: moveContainerRef,
  } = useItemMoves(value, moveItem, (index) => component.items[index]?.label, items.length)
  // A drop runs the reorder action: in the browser, or on the server when customised.
  const dropItem = (from: number, to: number) =>
    runItemAction(resolve('reorder'), { items: reorderedItemKeys(items.length, from, to) }, () =>
      moveItem(from, to),
    )
  const setAllCollapsed = (value: boolean) =>
    setCollapsed(Object.fromEntries(items.map((_, index) => [index, value])))
  const addItem = () =>
    setValue(
      appendRepeaterItem(
        items,
        component.simple
          ? ({ [Object.keys(component.templateState)[0] ?? 'value']: null } as Record<
              string,
              unknown
            >)
          : component.templateState,
      ),
    )

  const schemaFor = (index: number): SchemaComponent[] =>
    component.items[index]?.schema ??
    replacePlaceholder(component.template, '__INDEX__', String(index))

  const canAdd =
    component.addable &&
    !locked &&
    (component.maxItems == null || items.length < component.maxItems)
  const canDelete =
    component.deletable &&
    !locked &&
    (component.minItems == null || items.length > component.minItems)
  const draggable =
    component.reorderable &&
    component.reorderableWithDragAndDrop !== false &&
    !locked &&
    resolve('reorder') !== null
  const buttons = component.reorderable && component.reorderableWithButtons !== false && !locked

  return (
    <FieldWrapper field={component} htmlFor={id} error={error}>
      <div ref={moveContainerRef} className="flex flex-col gap-3">
        {moveRegion}
        {component.table?.length && !component.simple ? (
          <RepeaterTable
            id={id}
            columns={component.table}
            compact={component.compact}
            count={items.length}
            prefixFor={(index) => `${component.statePath}.${index}.`}
            schemaFor={schemaFor}
            labelledBy={component.label ? fieldIds(id).label : undefined}
            describedBy={aria['aria-describedby']}
            reorderable={buttons}
            cloneable={Boolean(component.cloneable) && canAdd}
            deletable={canDelete}
            onMove={moveItem}
            onClone={cloneItem}
            onRemove={removeItem}
            virtual={virtual}
            context={context}
            resolve={(name, index) => resolve(name, component.items[index])}
            extraActionsFor={(index) => component.items[index]?.actions}
          />
        ) : (
          <>
            {component.collapsible && !component.simple && items.length > 0 && (
              <CollapseAllActions
                context={context}
                resolve={(name) => resolve(name)}
                onCollapseAll={() => setAllCollapsed(true)}
                onExpandAll={() => setAllCollapsed(false)}
              />
            )}
            <ul
              id={id}
              aria-labelledby={component.label ? fieldIds(id).label : undefined}
              aria-describedby={aria['aria-describedby']}
              ref={attach}
              style={style}
              className={cn('grid gap-3', component.grid && gridColumnsClasses(component.grid))}
            >
              {indexes.map((index) => {
                const isCollapsed = collapsed[index] ?? component.collapsed ?? false
                const label = component.items[index]?.label ?? null
                const serverItem = component.items[index]

                return (
                  <li
                    key={index}
                    ref={item}
                    data-index={index}
                    aria-setsize={range.active ? items.length : undefined}
                    aria-posinset={range.active ? index + 1 : undefined}
                    draggable={draggable}
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(event) => draggable && event.preventDefault()}
                    onDrop={() => {
                      if (dragIndex !== null && dragIndex !== index) dropItem(dragIndex, index)
                      setDragIndex(null)
                    }}
                    onDragEnd={() => setDragIndex(null)}
                    className={cn(
                      'bg-card min-w-0 rounded-lg border shadow-xs',
                      dragIndex === index && 'opacity-50',
                      component.simple && 'border-0 shadow-none',
                    )}
                  >
                    <Collapsible open={!isCollapsed}>
                      {!component.simple && (
                        <div
                          className="flex flex-wrap items-center gap-1 border-b px-2 py-1.5"
                          data-slot="item-header"
                        >
                          {draggable && (
                            <span
                              className="text-muted-foreground cursor-grab"
                              title={resolve('reorder', serverItem)?.label ?? undefined}
                              aria-hidden="true"
                            >
                              <Icon
                                name={resolve('reorder', serverItem)?.icon ?? 'grip-vertical'}
                              />
                            </span>
                          )}
                          {component.itemNumbers && (
                            <span className="text-muted-foreground text-xs tabular-nums">
                              {formatter.number(index + 1)}
                            </span>
                          )}
                          {label && (
                            <span dir="auto" className="min-w-0 truncate text-sm font-medium">
                              {label}
                            </span>
                          )}
                          <span className="flex-1" />
                          <ItemHeaderActions
                            context={context}
                            itemKey={String(index)}
                            index={index}
                            count={items.length}
                            resolve={(name) => resolve(name, serverItem)}
                            extraActions={locked ? undefined : serverItem?.actions}
                            buttons={buttons}
                            canClone={Boolean(component.cloneable) && canAdd}
                            canDelete={canDelete}
                            collapsible={Boolean(component.collapsible)}
                            collapsed={isCollapsed}
                            onMove={moveWithButton}
                            onClone={() => cloneItem(index)}
                            onDelete={() => removeItem(index)}
                            onToggle={() =>
                              setCollapsed((state) => ({ ...state, [index]: !isCollapsed }))
                            }
                          />
                        </div>
                      )}
                      <CollapsibleContent>
                        <div className={cn('flex gap-2', component.simple ? 'items-start' : 'p-4')}>
                          <div className="flex-1">
                            <SchemaRenderer
                              components={schemaFor(index)}
                              columns={
                                component.simple
                                  ? { default: 1 }
                                  : (component.columns ?? { default: 1, lg: 2 })
                              }
                              className={cn(
                                component.simple && 'gap-0',
                                '[&_[data-slot=field]_[data-slot=label]]:hidden',
                                !component.simple && '[&_[data-slot=field]_[data-slot=label]]:flex',
                              )}
                            />
                          </div>
                          {component.simple && canDelete && (
                            <ItemActionButton
                              action={resolve('delete', serverItem)}
                              context={context}
                              args={{ item: String(index) }}
                              size="default"
                              className="text-muted-foreground"
                              onClient={() => removeItem(index)}
                            />
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </li>
                )
              })}
            </ul>
          </>
        )}
        {canAdd && (
          <AddActionRow alignment={component.addActionAlignment}>
            <ItemActionButton
              action={resolve('add')}
              context={context}
              size="sm"
              onClient={addItem}
            />
          </AddActionRow>
        )}
      </div>
    </FieldWrapper>
  )
}

export function columnSpanOf(component: SchemaComponent): string {
  return columnSpanClasses(component.columnSpan)
}
