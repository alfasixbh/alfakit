<script lang="ts">
  import type { BuilderBlockSchema, BuilderItemState, BuilderSchema } from '@alfakit/core'
  import {
    isDeferredPlaceholder,
    VIRTUAL_ESTIMATES,
    builderItemLabel,
    builderItems,
    builderItemSchema,
    canAddBuilderBlock,
    cloneIndexedState,
    cloneRepeaterItem,
    fieldIds,
    insertBuilderItem,
    itemActionContext,
    moveIndexedState,
    moveRepeaterItem,
    removeIndexedState,
    removeRepeaterItem,
    reorderedItemKeys,
    resolveItemAction,
    fieldActionContext,
    virtualizeOptions,
    type ActionSchema,
    type ItemActionName,
  } from '@alfakit/core'
  import PencilIcon from '@lucide/svelte/icons/pencil'
  import { useActionRunner, useFormatter, useOptionalRegistry, useT } from '../../context.svelte'
  import { useScrollToErroredItem, useVirtualList } from '../../hooks/virtual.svelte'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { usePageActionContext } from '../actions/action-context'
  import { useField, useOptionalFormStore } from '../form/form-context.svelte'
  import FieldWrapper from '../schema/FieldWrapper.svelte'
  import DeferredSchema from '../layout/DeferredSchema.svelte'
  import Self from './BuilderField.svelte'
  import SchemaRenderer from '../schema/SchemaRenderer.svelte'
  import { Button } from '../ui/button'
  import { Collapsible, CollapsibleContent } from '../ui/collapsible'
  import AddActionRow from './AddActionRow.svelte'
  import CollapseAllActions from './CollapseAllActions.svelte'
  import ItemHeaderActions from './ItemHeaderActions.svelte'
  import { useItemActionFallbacks, useRunItemAction } from './item-actions'
  import { useItemMoves } from './item-moves.svelte'
  import BuilderBlockActionsMenu from './BuilderBlockActionsMenu.svelte'
  import BuilderBlockPicker from './BuilderBlockPicker.svelte'
  import BuilderBlockPickerPanel from './BuilderBlockPickerPanel.svelte'

  let { component }: { component: BuilderSchema } = $props()

  /**
   * A list of blocks, each with its own schema. Items use the server's per-item schema
   * when it describes the same block, else the block's template (fresh, moved or cloned
   * items the server has not seen yet).
   */
  const t = useT()
  const formatter = useFormatter()
  const field = useField<unknown>(() => component)
  const locked = $derived(field.disabled || field.readOnly)
  const items = $derived(builderItems(field.value))
  let collapsed = $state<Record<number, boolean>>({})
  let editing = $state<Record<number, boolean>>({})
  let dragIndex = $state<number | null>(null)
  // Long lists render only the visible blocks (plus a few around them).
  const virtual = useVirtualList(
    () => items.length,
    () => virtualizeOptions(component.virtualize, VIRTUAL_ESTIMATES.item, 12),
  )
  useScrollToErroredItem(virtual, () => component.statePath)

  const registry = useOptionalRegistry()
  const form = useOptionalFormStore()
  const page = usePageActionContext()
  const context = $derived(fieldActionContext({ token: page.token, form, key: component.key }))
  const runItemAction = useRunItemAction(() => context)
  const fallbacks = useItemActionFallbacks('builder')
  const serverItemOf = (index: number) => {
    const server = component.items[index]

    return server && server.type === items[index]?.type ? server : undefined
  }
  const resolve = (name: ItemActionName, index?: number) =>
    resolveItemAction(
      name,
      component,
      index === undefined ? undefined : serverItemOf(index),
      name === 'add' ? { ...fallbacks.add, label: component.addActionLabel } : fallbacks[name],
    )
  const addAction = $derived(resolve('add'))

  const update = (next: unknown[]) => field.setValue(next as BuilderItemState[])
  const moveItem = (from: number, to: number) => {
    update(moveRepeaterItem(items, from, to))
    collapsed = moveIndexedState(collapsed, from, to)
    editing = moveIndexedState(editing, from, to)
  }
  // Move buttons: announced, one at a time, focus kept on the moved item.
  const moves = useItemMoves(
    moveItem,
    (index) => builderItemLabel(component, items, index),
    () => items.length,
  )
  const removeItem = (index: number) => {
    update(removeRepeaterItem(items, index))
    collapsed = removeIndexedState(collapsed, index)
    editing = removeIndexedState(editing, index)
  }
  const cloneItem = (index: number) => {
    update(cloneRepeaterItem(items, index))
    collapsed = cloneIndexedState(collapsed, index)
    editing = cloneIndexedState(editing, index)
  }
  const addBlock = (block: BuilderBlockSchema) =>
    runItemAction(addAction, { block: block.name }, () => update(insertBuilderItem(items, block)))
  // A drop runs the reorder action: in the browser, or on the server when customised.
  const dropItem = (from: number, to: number) =>
    runItemAction(resolve('reorder'), { items: reorderedItemKeys(items.length, from, to) }, () =>
      moveItem(from, to),
    )
  const setAllCollapsed = (value: boolean) => {
    collapsed = Object.fromEntries(items.map((_, index) => [index, value]))
    if (value) refreshSummaries(items.map((_, index) => index))
  }
  // Summaries are made on the server: collapsing items whose block has one brings them up
  // to date with the edits.
  const refreshSummaries = (indexes: number[]) => {
    if (indexes.some((index) => blockOf(items[index]?.type ?? '')?.summary)) {
      void form?.refresh(component.statePath)
    }
  }
  // Previews (`blockPreviews()`): server HTML or a registered `builder-preview:{name}`.
  const previewComponentOf = (index: number) => {
    const name =
      serverItemOf(index)?.previewComponent ?? blockOf(items[index]?.type ?? '')?.previewComponent

    return name ? registry?.resolve(`builder-preview:${name}`) : undefined
  }
  const hasPreview = (index: number) =>
    component.blockPreviews === true &&
    (previewComponentOf(index) !== undefined || Boolean(serverItemOf(index)?.preview))
  // Closing the editor re-renders the previews from the server.
  const toggleEditing = (index: number) => {
    const open = !editing[index]
    editing = { ...editing, [index]: open }
    if (!open) void form?.refresh(component.statePath)
  }
  const openEditor = (index: number) => {
    if (!locked) toggleEditing(index)
  }
  const previewIsButton = $derived(!component.interactivePreviews && !locked)
  const blockOf = (type: string) => component.blocks.find((block) => block.name === type)

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
  const showEmptyPicker = $derived(
    canAdd && addAction !== null && !addAction.disabled && component.blocks.length > 0,
  )
  const menu = $derived(Boolean(component.blockActionsMenu) && !locked)
  const runner = useActionRunner()
  const canCloneItem = (item: BuilderItemState) => {
    const block = blockOf(item.type)

    return Boolean(
      component.cloneable && canAdd && block && canAddBuilderBlock(component, block, items),
    )
  }
  // `blockActionsMenu()`: built-in actions run in the browser unless customised.
  const onMenuAction = (name: ItemActionName, index: number) =>
    runItemAction(resolve(name, index), { item: String(index) }, () => {
      if (name === 'moveUp') moves.moveWithButton(index, index - 1)
      else if (name === 'moveDown') moves.moveWithButton(index, index + 1)
      else if (name === 'clone') cloneItem(index)
      else if (name === 'delete') removeItem(index)
    })
  const onMenuExtra = (action: ActionSchema, index: number) =>
    void runner.trigger(action, itemActionContext(context, { item: String(index) }))
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
    <div bind:this={moves.state.container} class="flex flex-col gap-3" data-slot="builder">
      <span aria-live="polite" aria-atomic="true" class="sr-only" data-slot="item-move-status"
        >{moves.state.announcement}</span
      >
      {#if items.length === 0 && showEmptyPicker}
        <!-- No blocks yet: the picker is right there instead of behind a button. -->
        <div
          data-slot="builder-empty"
          class="bg-muted/30 flex flex-col gap-3 rounded-lg border border-dashed p-3 sm:p-4"
        >
          <div class="px-1">
            <p class="text-sm font-medium">
              {t('builder.empty_heading', {}, 'Add your first block')}
            </p>
            <p class="text-muted-foreground text-sm">
              {t(
                'builder.empty_description',
                {},
                'Pick one to start. You can add more, reorder and remove them at any time.',
              )}
            </p>
          </div>
          <BuilderBlockPickerPanel
            {component}
            {items}
            onPick={addBlock}
            class="bg-card max-h-[28rem] rounded-md border"
          />
        </div>
      {:else if items.length === 0}
        <p class="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
          {t('builder.empty', {}, 'No blocks yet.')}
        </p>
      {/if}
      {#if component.collapsible && items.length > 0}
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
        class={cn('grid gap-3', items.length === 0 && 'hidden')}
        {@attach virtual.attach}
      >
        {#each virtual.indexes as index (index)}
          {@const item = items[index] as BuilderItemState}
          {@const block = blockOf(item.type)}
          {@const isCollapsed = collapsed[index] ?? component.collapsed ?? false}
          {@const icon = block?.icon ?? component.items[index]?.icon}
          {@const Preview = previewComponentOf(index)}
          {@const showPreview = hasPreview(index) && !editing[index]}
          <li
            data-index={index}
            aria-setsize={virtual.range.active ? items.length : undefined}
            aria-posinset={virtual.range.active ? index + 1 : undefined}
            data-block={item.type}
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
            )}
          >
            <Collapsible open={!isCollapsed}>
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
                {#if component.blockIcons && icon}<Icon
                    name={icon}
                    class="text-muted-foreground size-4"
                  />{/if}
                {#if component.blockNumbers}<span class="text-muted-foreground text-xs tabular-nums"
                    >{formatter.current.number(index + 1)}</span
                  >{/if}
                <span class="flex min-w-0 flex-1 items-baseline gap-2">
                  {#if component.blockLabels}<span
                      dir="auto"
                      class="min-w-0 shrink-0 truncate text-sm font-medium sm:max-w-[60%]"
                      >{builderItemLabel(component, items, index)}</span
                    >{/if}
                  {#if serverItemOf(index)?.summary}<span
                      dir="auto"
                      class="text-muted-foreground min-w-0 truncate text-sm"
                      data-slot="builder-item-summary">{serverItemOf(index)?.summary}</span
                    >{/if}
                </span>
                <ItemHeaderActions
                  {context}
                  itemKey={String(index)}
                  {index}
                  count={items.length}
                  resolve={(name) => resolve(name, index)}
                  extraActions={menu || locked ? undefined : serverItemOf(index)?.actions}
                  buttons={buttons && !menu}
                  canClone={canCloneItem(item) && !menu}
                  canDelete={canDelete && !menu}
                  collapsible={Boolean(component.collapsible)}
                  collapsed={isCollapsed}
                  onMove={moves.moveWithButton}
                  onClone={() => cloneItem(index)}
                  onDelete={() => removeItem(index)}
                  onToggle={() => {
                    const collapse = !isCollapsed

                    collapsed = { ...collapsed, [index]: collapse }
                    if (collapse) refreshSummaries([index])
                  }}
                >
                  {#if hasPreview(index) && !locked}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={t('builder.edit_block', {}, 'Edit block')}
                      aria-pressed={Boolean(editing[index])}
                      onclick={() => toggleEditing(index)}
                      ><Icon
                        name="alfakit::forms.components.builder.actions.edit"
                        fallback={PencilIcon}
                      /></Button
                    >
                  {/if}
                  {#if menu}
                    <BuilderBlockActionsMenu
                      label={builderItemLabel(component, items, index) ?? ''}
                      resolve={(name) => resolve(name, index)}
                      canMoveUp={buttons && index > 0}
                      canMoveDown={buttons && index < items.length - 1}
                      canClone={canCloneItem(item)}
                      {canDelete}
                      extraActions={serverItemOf(index)?.actions}
                      onAction={(name) => onMenuAction(name, index)}
                      onExtra={(action) => onMenuExtra(action, index)}
                    />
                  {/if}
                </ItemHeaderActions>
              </div>
              <CollapsibleContent>
                {#if showPreview}
                  {#if previewIsButton}
                    <div
                      data-slot="builder-preview"
                      class="cursor-pointer p-4"
                      role="button"
                      tabindex="0"
                      aria-label={t('builder.edit_block', {}, 'Edit block')}
                      onclick={() => openEditor(index)}
                      onkeydown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          openEditor(index)
                        }
                      }}
                    >
                      <div class="pointer-events-none">
                        {#if Preview}
                          <Preview data={item.data} block={item.type} {index} />
                        {:else}
                          {@html serverItemOf(index)?.preview ?? ''}
                        {/if}
                      </div>
                    </div>
                  {:else}
                    <div data-slot="builder-preview" class="p-4">
                      <div class={cn(!component.interactivePreviews && 'pointer-events-none')}>
                        {#if Preview}
                          <Preview data={item.data} block={item.type} {index} />
                        {:else}
                          {@html serverItemOf(index)?.preview ?? ''}
                        {/if}
                      </div>
                    </div>
                  {/if}
                {:else}
                  <div class="p-4">
                    <SchemaRenderer
                      components={builderItemSchema(component, items, index)}
                      columns={block?.columns ?? component.items[index]?.columns ?? { default: 1 }}
                    />
                  </div>
                {/if}
              </CollapsibleContent>
            </Collapsible>
          </li>
        {/each}
      </ul>
      {#if canAdd && addAction && component.blocks.length > 0 && items.length > 0}
        <AddActionRow alignment={component.addActionAlignment}>
          <BuilderBlockPicker {component} {items} onPick={addBlock}>
            {#snippet trigger({ props })}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={addAction?.disabled}
                {...props}
                data-slot="builder-add"
                >{#if addAction?.icon}<Icon name={addAction.icon} />{/if}
                {addAction?.label}</Button
              >
            {/snippet}
          </BuilderBlockPicker>
        </AddActionRow>
      {/if}
    </div>
  </FieldWrapper>
{/if}
