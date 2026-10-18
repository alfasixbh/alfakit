<script lang="ts">
  import type { TableSchema } from '@alfakit/core'
  import {
    columnDraftChanged,
    columnManagerPosition,
    columnOrderChanged,
    defaultVisibleColumns,
    FILTERS_MODAL_WIDTH_CLASSES,
    gridColumnsClasses,
    keepMoveButtonFocus,
    moveColumnInManager,
    moveColumnTo,
    orderColumnsBy,
    saveColumnOrder,
    slideOverSide,
    toggleVisibleColumn,
    triggerButtonView,
    visitTable,
  } from '@alfakit/core'
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down'
  import ChevronUpIcon from '@lucide/svelte/icons/chevron-up'
  import Columns3Icon from '@lucide/svelte/icons/columns-3'
  import GripVerticalIcon from '@lucide/svelte/icons/grip-vertical'
  import { useDirection, usePanel, useT } from '../../context.svelte'
  import { cn } from '../../lib/utils'
  import Icon from '../../lib/Icon.svelte'
  import { showToast } from '../notifications/toast'
  import { Button } from '../ui/button'
  import { Checkbox } from '../ui/checkbox'
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from '../ui/dialog'
  import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
  import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
  } from '../ui/sheet'
  import TableTriggerButton from './TableTriggerButton.svelte'

  /**
   * The column manager: show / hide toggleable columns (kept in the query string) and, with
   * `reorderableColumns()`, move columns (stored per user on the server) by dragging a row
   * onto another or with the move up / down buttons (the keyboard path).
   *
   * `deferColumnManager()` keeps toggles in a draft until "Apply"; `columnManagerLayout()`
   * opens it in a dialog; `columnManagerColumns()` lays the list out in a grid.
   */
  let { table, token, component }: { table: TableSchema; token: string; component: string } =
    $props()

  const t = useT()
  const panel = usePanel()
  const direction = useDirection()
  let open = $state(false)
  // `columnManagerTriggerAction()` may set `slideOver()`, `modalWidth()` and the heading.
  const modal = $derived(table.triggerActions?.columnManager?.modal)
  const modalHeading = $derived(modal?.heading ?? t('table.columns', {}, 'Columns'))
  const modalDescription = $derived(modal?.description ?? table.pluralModelLabel)
  const modalWidthClass = $derived(
    modal?.width ? FILTERS_MODAL_WIDTH_CLASSES[modal.width] : undefined,
  )
  let saving = $state(false)
  let dragging = $state<string | null>(null)
  let dropTarget = $state<string | null>(null)
  // Toggles of a deferred column manager wait here until "Apply".
  let draft = $state<string[] | null>(null)
  const reorderable = $derived(Boolean(table.reorderableColumns && panel.endpoints.tableColumns))
  const toggleable = $derived(Boolean(table.toggleableColumns))
  const deferred = $derived(Boolean(table.deferColumnManager))
  // A moved column order: the draft of a deferred column manager, or shown at once while
  // it is saved.
  let orderDraft = $state<string[] | null>(null)
  // Screen-reader announcement of the last move.
  let announcement = $state('')
  const idBase = $props.id()
  const columns = $derived(
    orderColumnsBy(
      reorderable ? table.columns : table.columns.filter((column) => column.toggleable),
      orderDraft,
    ),
  )
  const appliedNames = $derived(table.columns.map((column) => column.name))
  const names = $derived(orderDraft ?? appliedNames)
  const orderChanged = $derived(orderDraft !== null && columnOrderChanged(appliedNames, orderDraft))

  // The server's order replaces the one shown while saving.
  let seenColumns: unknown = null
  $effect.pre(() => {
    const current = table.columns

    if (seenColumns !== null && current !== seenColumns && !deferred) {
      orderDraft = null
    }

    seenColumns = current
  })
  const visible = $derived(draft ?? table.visibleColumns)

  const trigger = $derived(
    triggerButtonView(table, 'columnManager', {
      label: t('table.columns', {}, 'Columns'),
      showLabel: false,
    }),
  )
  const resetView = $derived(
    triggerButtonView(table, 'columnManagerReset', {
      label: toggleable
        ? t('table.reset_columns', {}, 'Reset')
        : t('table.reset_column_order', {}, 'Reset column order'),
      variant: 'ghost',
    }),
  )
  const applyView = $derived(
    deferred
      ? triggerButtonView(table, 'columnManagerApply', {
          label: t('table_filters.apply', {}, 'Apply'),
          variant: 'default',
        })
      : null,
  )
  const inHeader = $derived(table.columnManagerResetActionPosition === 'header')

  const toggle = (name: string) => {
    const next = toggleVisibleColumn(visible, name)

    if (deferred) {
      draft = next
    } else {
      visitTable(table.identifier, { columns: next }, ['page'])
    }
  }

  const dragOver = (event: DragEvent, name: string) => {
    if (dragging === null) return

    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
    dropTarget = name
  }

  const drop = (event: DragEvent, name: string) => {
    event.preventDefault()

    if (dragging !== null && dragging !== name) {
      reorder(dragging, moveColumnTo(names, dragging, name))
    }

    dragging = null
    dropTarget = null
  }

  const save = async (order: string[]): Promise<boolean> => {
    const endpoint = panel.endpoints.tableColumns

    if (!endpoint) return false

    saving = true

    try {
      await saveColumnOrder(endpoint, token, component, order)

      return true
    } catch (error) {
      showToast({
        id: 'alfakit-column-order-failed',
        title: t('table.column_order_failed', {}, "Couldn't save the column order"),
        body: error instanceof Error ? error.message : String(error),
        status: 'danger',
        format: 'alfakit',
      })

      return false
    } finally {
      saving = false
    }
  }

  const positionText = (position: number, count: number, group: string | undefined) =>
    group
      ? t(
          'table.column_manager.position_in_group',
          { position, count, group },
          `Position ${position} of ${count} in ${group}.`,
        )
      : t('table.column_manager.position', { position, count }, `Position ${position} of ${count}.`)

  const announce = (name: string, order: string[]) => {
    const { position, count, group } = columnManagerPosition(order, name, table.columnGroups)
    const label = table.columns.find((column) => column.name === name)?.label ?? name
    const replace = { column: label, position, count, group: group ?? '' }

    announcement = group
      ? deferred
        ? t(
            'table.column_manager.reordered_in_group_deferred',
            replace,
            `${label} moved to position ${position} of ${count} in ${group}. Apply columns to save your changes.`,
          )
        : t(
            'table.column_manager.reordered_in_group',
            replace,
            `${label} moved to position ${position} of ${count} in ${group}.`,
          )
      : deferred
        ? t(
            'table.column_manager.reordered_deferred',
            replace,
            `${label} moved to position ${position} of ${count}. Apply columns to save your changes.`,
          )
        : t(
            'table.column_manager.reordered',
            replace,
            `${label} moved to position ${position} of ${count}.`,
          )
  }

  // A new order: kept as a draft until "Apply" (`deferColumnManager()`), else saved now.
  const reorder = (name: string, order: string[]) => {
    if (saving || !columnOrderChanged(names, order)) return

    orderDraft = order
    announcement = ''

    if (deferred) {
      announce(name, order)

      return
    }

    void save(order).then((saved) => {
      if (saved) announce(name, order)
      else orderDraft = null
    })
  }

  const move = (name: string, offset: -1 | 1, event: MouseEvent) => {
    keepMoveButtonFocus(event.currentTarget as HTMLElement | null)
    reorder(name, moveColumnInManager(names, name, offset, table.columnGroups))
  }

  const apply = () => {
    if (orderDraft && orderChanged) void save(orderDraft)

    if (draft && columnDraftChanged(table.visibleColumns, draft)) {
      visitTable(table.identifier, { columns: draft }, ['page'])
    }

    draft = null
    orderDraft = null
    announcement = ''
    open = false
  }

  // Reset: the defined column order and, for toggleable columns, the default visibility.
  const reset = () => {
    if (reorderable) {
      orderDraft = null
      void save([])
    }

    if (toggleable) {
      draft = null
      visitTable(table.identifier, { columns: defaultVisibleColumns(table) }, ['page'])
    }
  }

  const setOpen = (next: boolean) => {
    // Closing without "Apply" drops the draft.
    if (!next) {
      draft = null
      if (deferred) orderDraft = null
      announcement = ''
    }
    open = next
  }
</script>

{#snippet columnsIcon()}<Icon
    name="alfakit::tables.actions.column-manager"
    fallback={Columns3Icon}
  />{/snippet}

{#snippet resetButton()}
  {#if resetView}
    <TableTriggerButton
      view={resetView}
      disabled={saving}
      data-slot="column-manager-reset"
      class={cn(!applyView && 'w-full')}
      onclick={reset}
    />
  {/if}
{/snippet}

{#snippet body()}
  <div class="flex flex-col gap-1">
    {#if inHeader && resetView}
      <div class="flex justify-end">{@render resetButton()}</div>
    {/if}
    <ul
      class={cn(
        table.columnManagerColumns
          ? ['grid gap-0.5', gridColumnsClasses(table.columnManagerColumns)]
          : 'flex flex-col gap-0.5',
      )}
      aria-label={t('table.columns', {}, 'Columns')}
    >
      {#each columns as column (column.name)}
        {@const place = columnManagerPosition(names, column.name, table.columnGroups)}
        {@const positionId = `${idBase}-${column.name}-position`}
        <li
          data-column={column.name}
          draggable={reorderable && !saving}
          class={cn(
            'flex items-center gap-2 rounded-md px-2 py-1 text-sm',
            reorderable && 'cursor-grab',
            dragging === column.name && 'opacity-50',
            dropTarget === column.name && dragging !== column.name && 'bg-muted',
          )}
          ondragstart={(event) => {
            if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
            dragging = column.name
          }}
          ondragover={(event) => dragOver(event, column.name)}
          ondragleave={() => dropTarget === column.name && (dropTarget = null)}
          ondragend={() => {
            dragging = null
            dropTarget = null
          }}
          ondrop={(event) => drop(event, column.name)}
        >
          {#if reorderable}
            <GripVerticalIcon class="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
          {/if}
          {#if column.toggleable}
            <label class="flex min-w-0 flex-1 items-center gap-2">
              <Checkbox
                checked={visible.includes(column.name)}
                onCheckedChange={() => toggle(column.name)}
              />
              <span class="truncate">{column.label}</span>
            </label>
          {:else}
            <span class="min-w-0 flex-1 truncate">{column.label}</span>
          {/if}
          {#if reorderable}
            <span class="flex shrink-0 items-center">
              <span id={positionId} class="sr-only" data-slot="column-manager-position"
                >{positionText(place.position, place.count, place.group)}</span
              >
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={place.position <= 1}
                aria-disabled={saving || undefined}
                aria-describedby={positionId}
                aria-label={t(
                  'table.move_column_up',
                  { column: column.label },
                  `Move ${column.label} up`,
                )}
                onclick={(event: MouseEvent) => move(column.name, -1, event)}
                ><ChevronUpIcon /></Button
              >
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={place.position >= place.count}
                aria-disabled={saving || undefined}
                aria-describedby={positionId}
                aria-label={t(
                  'table.move_column_down',
                  { column: column.label },
                  `Move ${column.label} down`,
                )}
                onclick={(event: MouseEvent) => move(column.name, 1, event)}
                ><ChevronDownIcon /></Button
              >
            </span>
          {/if}
        </li>
      {/each}
    </ul>
    {#if reorderable}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        class="sr-only"
        data-slot="column-manager-announcement"
      >
        {announcement}
      </div>
    {/if}
    {#if (!inHeader && resetView) || applyView}
      <div class="mt-1 flex items-center justify-end gap-2">
        {#if !inHeader}{@render resetButton()}{/if}
        {#if applyView}
          <TableTriggerButton
            view={applyView}
            data-slot="column-manager-apply"
            disabled={!orderChanged && (!draft || !columnDraftChanged(table.visibleColumns, draft))}
            onclick={apply}
          />
        {/if}
      </div>
    {/if}
  </div>
{/snippet}

{#if (toggleable || reorderable) && trigger}
  {#if table.columnManagerLayout === 'modal' && modal?.slideOver}
    <Sheet bind:open={() => open, setOpen}>
      <SheetTrigger>
        {#snippet child({ props })}
          <TableTriggerButton
            view={trigger}
            defaultIcon={columnsIcon}
            {...props}
            aria-label={trigger.showLabel ? undefined : trigger.label}
          />
        {/snippet}
      </SheetTrigger>
      <SheetContent
        side={slideOverSide(modal.slideOverPosition, direction)}
        class={cn('flex w-full flex-col gap-0 p-0', modalWidthClass ?? 'sm:max-w-md')}
        data-slot="column-manager"
        data-slide-over=""
      >
        <SheetHeader class="border-b">
          <SheetTitle>{modalHeading}</SheetTitle>
          <SheetDescription class={modal.description ? undefined : 'sr-only'}
            >{modalDescription}</SheetDescription
          >
        </SheetHeader>
        <div class="flex-1 overflow-y-auto p-4">{@render body()}</div>
      </SheetContent>
    </Sheet>
  {:else if table.columnManagerLayout === 'modal'}
    <Dialog bind:open={() => open, setOpen}>
      <DialogTrigger>
        {#snippet child({ props })}
          <TableTriggerButton
            view={trigger}
            defaultIcon={columnsIcon}
            {...props}
            aria-label={trigger.showLabel ? undefined : trigger.label}
          />
        {/snippet}
      </DialogTrigger>
      <DialogContent class={modalWidthClass ?? 'sm:max-w-lg'} data-slot="column-manager">
        <DialogHeader>
          <DialogTitle>{modalHeading}</DialogTitle>
          <DialogDescription class={modal?.description ? undefined : 'sr-only'}
            >{modalDescription}</DialogDescription
          >
        </DialogHeader>
        <div class="max-h-[60vh] overflow-y-auto">{@render body()}</div>
      </DialogContent>
    </Dialog>
  {:else}
    <Popover bind:open={() => open, setOpen}>
      <PopoverTrigger>
        {#snippet child({ props })}
          <TableTriggerButton
            view={trigger}
            defaultIcon={columnsIcon}
            {...props}
            aria-label={trigger.showLabel ? undefined : trigger.label}
          />
        {/snippet}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        class={cn('p-2', table.columnManagerColumns ? 'w-auto min-w-64' : 'w-64')}
        data-slot="column-manager"
      >
        {@render body()}
      </PopoverContent>
    </Popover>
  {/if}
{/if}
