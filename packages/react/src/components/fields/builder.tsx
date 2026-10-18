import type {
  ActionSchema,
  BuilderBlockSchema,
  BuilderItemState,
  BuilderSchema,
  ItemActionName,
  ItemActionSchema,
} from '@alfakit/core'
import {
  builderItemLabel,
  builderItems,
  builderItemSchema,
  canAddBuilderBlock,
  cloneIndexedState,
  cloneRepeaterItem,
  fieldIds,
  insertBuilderItem,
  isDeferredPlaceholder,
  itemActionContext,
  moveIndexedState,
  moveRepeaterItem,
  removeIndexedState,
  removeRepeaterItem,
  reorderedItemKeys,
  VIRTUAL_ESTIMATES,
  virtualizeOptions,
} from '@alfakit/core'
import { EllipsisIcon, PencilIcon } from 'lucide-react'
import { createElement, useState, type KeyboardEvent } from 'react'
import { useActionRunner, useFormatter, useOptionalRegistry, useT } from '../../context'
import { useScrollToErroredItem, useVirtualList } from '../../hooks/use-virtual-list'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { useField, useOptionalFormStore } from '../form/form-context'
import { DeferredSchema } from '../layout/deferred'
import { useFieldActionContext } from '../schema/field-actions'
import { FieldWrapper } from '../schema/field-wrapper'
import { SchemaRenderer } from '../schema/schema-renderer'
import { Button } from '../ui/button'
import { Collapsible, CollapsibleContent } from '../ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { BuilderBlockPicker, BuilderBlockPickerPanel } from './builder-picker'
import {
  AddActionRow,
  CollapseAllActions,
  ItemHeaderActions,
  useItemActionFallbacks,
  useItemActions,
  useItemMoves,
  useRunItemAction,
} from './item-actions'

/**
 * A list of blocks, each with its own schema. Items use the server's per-item schema
 * when it describes the same block, else the block's template (fresh, moved or cloned
 * items the server has not seen yet).
 */
/**
 * `deferLoading()`: a skeleton until the field scrolls into view, then the field with its
 * items (loaded from the server).
 */
export function BuilderField({ component }: { component: BuilderSchema }) {
  if (!isDeferredPlaceholder(component)) return <BuilderFieldContent component={component} />

  return (
    <DeferredSchema component={component}>
      {(loaded) => <BuilderFieldContent component={loaded} />}
    </DeferredSchema>
  )
}

function BuilderFieldContent({ component }: { component: BuilderSchema }) {
  const t = useT()
  const formatter = useFormatter()
  const registry = useOptionalRegistry()
  const form = useOptionalFormStore()
  const { value, setValue, error, id, disabled, readOnly, aria } = useField<unknown>(component)
  const locked = disabled || readOnly
  const items = builderItems(value)
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({})
  const [editing, setEditing] = useState<Record<number, boolean>>({})
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const context = useFieldActionContext(component)
  const runner = useActionRunner()
  const runItemAction = useRunItemAction(context)
  const fallbacks = useItemActionFallbacks(component.addActionLabel)
  const resolve = useItemActions(component, fallbacks)
  // Long lists render only the visible blocks (plus a few around them).
  const virtual = useVirtualList(
    items.length,
    virtualizeOptions(component.virtualize, VIRTUAL_ESTIMATES.item, 12),
  )
  const { range, indexes, style, attach, item: attachItem } = virtual
  useScrollToErroredItem(virtual.list, range.active, component.statePath)

  const update = (next: unknown[]) => setValue(next as BuilderItemState[])
  const moveItem = (from: number, to: number) => {
    update(moveRepeaterItem(items, from, to))
    setCollapsed((state) => moveIndexedState(state, from, to))
    setEditing((state) => moveIndexedState(state, from, to))
  }
  const removeItem = (index: number) => {
    update(removeRepeaterItem(items, index))
    setCollapsed((state) => removeIndexedState(state, index))
    setEditing((state) => removeIndexedState(state, index))
  }
  const cloneItem = (index: number) => {
    update(cloneRepeaterItem(items, index))
    setCollapsed((state) => cloneIndexedState(state, index))
    setEditing((state) => cloneIndexedState(state, index))
  }
  const addBlock = (block: BuilderBlockSchema) =>
    runItemAction(resolve('add'), { block: block.name }, () =>
      update(insertBuilderItem(items, block)),
    )
  // Move buttons: announced, one at a time, focus kept on the moved item.
  const {
    moveWithButton,
    region: moveRegion,
    containerRef: moveContainerRef,
  } = useItemMoves(
    value,
    moveItem,
    (index) => builderItemLabel(component, items, index),
    items.length,
  )
  const dropItem = (from: number, to: number) =>
    runItemAction(resolve('reorder'), { items: reorderedItemKeys(items.length, from, to) }, () =>
      moveItem(from, to),
    )
  // Closing the editor re-renders the previews from the server.
  const toggleEditing = (index: number) => {
    const open = !editing[index]
    setEditing((state) => ({ ...state, [index]: open }))
    if (!open) void form?.refresh(component.statePath)
  }

  const blockOf = (type: string) => component.blocks.find((block) => block.name === type)
  const underMax = component.maxItems == null || items.length < component.maxItems
  const canAdd = component.addable && !locked && underMax
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
  const addAction = resolve('add')
  const showEmptyPicker =
    canAdd && addAction !== null && !addAction.disabled && component.blocks.length > 0

  return (
    <FieldWrapper field={component} htmlFor={id} error={error}>
      <div ref={moveContainerRef} className="flex flex-col gap-3" data-slot="builder">
        {moveRegion}
        {items.length === 0 &&
          (showEmptyPicker ? (
            // No blocks yet: the picker is right there instead of behind a button.
            <div
              data-slot="builder-empty"
              className="bg-muted/30 flex flex-col gap-3 rounded-lg border border-dashed p-3 sm:p-4"
            >
              <div className="px-1">
                <p className="text-sm font-medium">
                  {t('builder.empty_heading', {}, 'Add your first block')}
                </p>
                <p className="text-muted-foreground text-sm">
                  {t(
                    'builder.empty_description',
                    {},
                    'Pick one to start. You can add more, reorder and remove them at any time.',
                  )}
                </p>
              </div>
              <BuilderBlockPickerPanel
                component={component}
                items={items}
                onPick={addBlock}
                className="bg-card max-h-[28rem] rounded-md border"
              />
            </div>
          ) : (
            <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
              {t('builder.empty', {}, 'No blocks yet.')}
            </p>
          ))}
        {component.collapsible && items.length > 0 && (
          <CollapseAllActions
            context={context}
            resolve={(name) => resolve(name)}
            onCollapseAll={() =>
              setCollapsed(Object.fromEntries(items.map((_, index) => [index, true])))
            }
            onExpandAll={() =>
              setCollapsed(Object.fromEntries(items.map((_, index) => [index, false])))
            }
          />
        )}
        <ul
          id={id}
          aria-labelledby={component.label ? fieldIds(id).label : undefined}
          aria-describedby={aria['aria-describedby']}
          ref={attach}
          style={style}
          className={cn('grid gap-3', items.length === 0 && 'hidden')}
        >
          {indexes.map((index) => {
            const item = items[index] as BuilderItemState
            const block = blockOf(item.type)
            const isCollapsed = collapsed[index] ?? component.collapsed ?? false
            const label = component.blockLabels ? builderItemLabel(component, items, index) : null
            const icon = block?.icon ?? component.items[index]?.icon
            const server = component.items[index]
            const serverItem = server?.type === item.type ? server : undefined
            const previewName = serverItem?.previewComponent ?? block?.previewComponent
            const Preview = previewName
              ? registry?.resolve(`builder-preview:${previewName}`)
              : undefined
            const hasPreview =
              component.blockPreviews === true &&
              (Preview !== undefined || Boolean(serverItem?.preview))
            const showPreview = hasPreview && !editing[index]
            const summary = serverItem?.summary
            const menu = Boolean(component.blockActionsMenu) && !locked
            const canClone =
              Boolean(component.cloneable) &&
              canAdd &&
              block !== undefined &&
              canAddBuilderBlock(component, block, items)
            const openEditor = () => {
              if (!locked) toggleEditing(index)
            }

            return (
              <li
                key={index}
                ref={attachItem}
                data-index={index}
                aria-setsize={range.active ? items.length : undefined}
                aria-posinset={range.active ? index + 1 : undefined}
                data-block={item.type}
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
                )}
              >
                <Collapsible open={!isCollapsed}>
                  <div
                    className="flex flex-wrap items-center gap-1 border-b px-2 py-1.5"
                    data-slot="item-header"
                  >
                    {draggable && (
                      <span
                        className="text-muted-foreground cursor-grab"
                        title={resolve('reorder')?.label ?? undefined}
                        aria-hidden="true"
                      >
                        <Icon name={resolve('reorder')?.icon ?? 'grip-vertical'} />
                      </span>
                    )}
                    {component.blockIcons && icon && (
                      <Icon name={icon} className="text-muted-foreground size-4" />
                    )}
                    {component.blockNumbers && (
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {formatter.number(index + 1)}
                      </span>
                    )}
                    <span className="flex min-w-0 flex-1 items-baseline gap-2">
                      {label && (
                        <span
                          dir="auto"
                          className="min-w-0 shrink-0 truncate text-sm font-medium sm:max-w-[60%]"
                        >
                          {label}
                        </span>
                      )}
                      {summary && (
                        <span
                          dir="auto"
                          className="text-muted-foreground min-w-0 truncate text-sm"
                          data-slot="builder-item-summary"
                        >
                          {summary}
                        </span>
                      )}
                    </span>
                    <ItemHeaderActions
                      context={context}
                      itemKey={String(index)}
                      index={index}
                      count={items.length}
                      resolve={(name) => resolve(name, serverItem)}
                      extraActions={menu || locked ? undefined : serverItem?.actions}
                      buttons={buttons && !menu}
                      canClone={canClone && !menu}
                      canDelete={canDelete && !menu}
                      collapsible={Boolean(component.collapsible)}
                      collapsed={isCollapsed}
                      onMove={moveWithButton}
                      onClone={() => cloneItem(index)}
                      onDelete={() => removeItem(index)}
                      onToggle={() =>
                        setCollapsed((state) => ({ ...state, [index]: !isCollapsed }))
                      }
                    >
                      {hasPreview && !locked && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={t('builder.edit_block', {}, 'Edit block')}
                          aria-pressed={Boolean(editing[index])}
                          onClick={() => toggleEditing(index)}
                        >
                          <Icon
                            name="alfakit::forms.components.builder.actions.edit"
                            fallback={PencilIcon}
                          />
                        </Button>
                      )}
                      {menu && (
                        <BlockActionsMenu
                          label={label ?? ''}
                          resolve={(name) => resolve(name, serverItem)}
                          canMoveUp={buttons && index > 0}
                          canMoveDown={buttons && index < items.length - 1}
                          canClone={canClone}
                          canDelete={canDelete}
                          extraActions={locked ? undefined : serverItem?.actions}
                          onAction={(name, onClient) =>
                            runItemAction(
                              resolve(name, serverItem),
                              { item: String(index) },
                              onClient,
                            )
                          }
                          onExtraAction={(action) =>
                            void runner.trigger(
                              action,
                              itemActionContext(context, { item: String(index) }),
                            )
                          }
                          onMove={(to) => moveWithButton(index, to)}
                          index={index}
                          onClone={() => cloneItem(index)}
                          onDelete={() => removeItem(index)}
                        />
                      )}
                    </ItemHeaderActions>
                  </div>
                  <CollapsibleContent>
                    {showPreview ? (
                      <div
                        data-slot="builder-preview"
                        className={cn(
                          'p-4',
                          !component.interactivePreviews && !locked && 'cursor-pointer',
                        )}
                        {...(component.interactivePreviews || locked
                          ? {}
                          : {
                              role: 'button',
                              tabIndex: 0,
                              'aria-label': t('builder.edit_block', {}, 'Edit block'),
                              onClick: openEditor,
                              onKeyDown: (event: KeyboardEvent) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault()
                                  openEditor()
                                }
                              },
                            })}
                      >
                        <div
                          className={cn(!component.interactivePreviews && 'pointer-events-none')}
                        >
                          {Preview ? (
                            createElement(Preview, { data: item.data, block: item.type, index })
                          ) : (
                            <div dangerouslySetInnerHTML={{ __html: serverItem?.preview ?? '' }} />
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4">
                        <SchemaRenderer
                          components={builderItemSchema(component, items, index)}
                          columns={
                            block?.columns ?? component.items[index]?.columns ?? { default: 1 }
                          }
                        />
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </li>
            )
          })}
        </ul>
        {canAdd && addAction && component.blocks.length > 0 && items.length > 0 && (
          <AddActionRow alignment={component.addActionAlignment}>
            <BuilderBlockPicker
              component={component}
              items={items}
              onPick={addBlock}
              trigger={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={addAction.disabled}
                  data-slot="builder-add"
                >
                  {addAction.icon && <Icon name={addAction.icon} />}
                  {addAction.label}
                </Button>
              }
            />
          </AddActionRow>
        )}
      </div>
    </FieldWrapper>
  )
}

/**
 * `blockActionsMenu()`: an item's actions in one compact menu (move up / down, duplicate,
 * extra item actions, delete). Built-in actions run in the browser unless customised.
 */
function BlockActionsMenu({
  label,
  resolve,
  canMoveUp,
  canMoveDown,
  canClone,
  canDelete,
  extraActions,
  index,
  onAction,
  onExtraAction,
  onMove,
  onClone,
  onDelete,
}: {
  label: string
  resolve: (name: ItemActionName) => ItemActionSchema | null
  canMoveUp: boolean
  canMoveDown: boolean
  canClone: boolean
  canDelete: boolean
  extraActions?: ActionSchema[]
  index: number
  onAction: (name: ItemActionName, onClient: () => void) => void
  onExtraAction: (action: ActionSchema) => void
  onMove: (to: number) => void
  onClone: () => void
  onDelete: () => void
}) {
  const t = useT()
  const entry = (
    name: ItemActionName,
    enabled: boolean,
    onClient: () => void,
    destructive = false,
  ) => {
    const action = resolve(name)

    if (!action || !enabled) return null

    return (
      <DropdownMenuItem
        key={name}
        variant={destructive ? 'destructive' : 'default'}
        disabled={action.disabled}
        onSelect={() => onAction(name, onClient)}
      >
        {action.icon && <Icon name={action.icon} />}
        {name === 'clone' ? t('builder.duplicate_block', {}, 'Duplicate') : action.label}
      </DropdownMenuItem>
    )
  }
  const visibleExtras = extraActions ?? []
  const hasMain = canMoveUp || canMoveDown || canClone || visibleExtras.length > 0

  if (!hasMain && !canDelete) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          data-slot="builder-item-menu"
          aria-label={t('builder.block_actions', { block: label }, 'Actions for :block')}
        >
          <EllipsisIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {entry('moveUp', canMoveUp, () => onMove(index - 1))}
        {entry('moveDown', canMoveDown, () => onMove(index + 1))}
        {entry('clone', canClone, onClone)}
        {visibleExtras.map((action) => (
          <DropdownMenuItem
            key={action.name}
            disabled={action.disabled}
            onSelect={() => onExtraAction(action)}
          >
            {action.icon && <Icon name={action.icon} />}
            {action.label}
          </DropdownMenuItem>
        ))}
        {canDelete && hasMain && <DropdownMenuSeparator />}
        {entry('delete', canDelete, onDelete, true)}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
