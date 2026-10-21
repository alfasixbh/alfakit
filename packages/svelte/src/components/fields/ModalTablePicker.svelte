<script lang="ts">
  import type { ModalTableSelectResponse, ModalTableSelectSchema, TableQuery } from '@alfakit/core'
  import {
    FILTERS_MODAL_WIDTH_CLASSES,
    debounce,
    modalTablePaging,
    toggleModalTableKey,
  } from '@alfakit/core'
  import ArrowDownIcon from '@lucide/svelte/icons/arrow-down'
  import ArrowUpIcon from '@lucide/svelte/icons/arrow-up'
  import ArrowUpDownIcon from '@lucide/svelte/icons/arrow-up-down'
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left'
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
  import SearchIcon from '@lucide/svelte/icons/search'
  import { onDestroy, untrack } from 'svelte'
  import { useChoice, useFormatter, useT } from '../../context.svelte'
  import { cn } from '../../lib/utils'
  import { useFormStore } from '../form/form-context.svelte'
  import TableCellContent from '../table/TableCellContent.svelte'
  import { Button } from '../ui/button'
  import { Checkbox } from '../ui/checkbox'
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '../ui/dialog'
  import { Input } from '../ui/input'
  import { Skeleton } from '../ui/skeleton'
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
  import ModalTablePickerFilters from './ModalTablePickerFilters.svelte'

  let {
    component,
    initial,
    onclose,
    onconfirm,
  }: {
    component: ModalTableSelectSchema
    initial: string[]
    onclose: () => void
    onconfirm: (keys: string[], labels: Record<string, string>) => void
  } = $props()

  const t = useT()
  const format = useFormatter()
  const choice = useChoice()
  const form = useFormStore()
  const multiple = $derived(Boolean(component.multiple))
  let query = $state<TableQuery>({})
  let response = $state<ModalTableSelectResponse | null>(null)
  let failed = $state(false)
  let loading = $state(true)
  let draft = $state<string[]>(untrack(() => [...initial]))
  let labels = $state<Record<string, string>>({})
  let search = $state('')

  $effect(() => {
    const current = query
    const controller = new AbortController()
    loading = true

    form
      .modalTable(component.statePath, component.tableStateIdentifier, current, controller.signal)
      .then((next) => {
        if (!next) return
        response = next
        labels = { ...untrack(() => labels), ...next.labels }
        failed = false
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name !== 'AbortError') failed = true
      })
      .finally(() => {
        if (!controller.signal.aborted) loading = false
      })

    return () => controller.abort()
  })

  const table = $derived(response?.table)
  const pushSearch = debounce((next: string) => {
    query = { ...query, search: next || null, page: null }
  }, 400)
  onDestroy(() => pushSearch.cancel())

  const columns = $derived(
    table ? table.columns.filter((column) => table.visibleColumns.includes(column.name)) : [],
  )
  const records = $derived(table?.records ?? [])
  const paging = $derived(modalTablePaging(table?.pagination))
  const atMax = $derived(
    multiple && component.maxItems != null && draft.length >= component.maxItems,
  )

  const toggle = (key: string) => {
    draft = toggleModalTableKey(draft, key, multiple, component.maxItems)
  }
  const isSelectable = (key: string, selectable: boolean | undefined) =>
    selectable === true && (draft.includes(key) || !atMax)
  const sort = (column: string) => {
    const direction =
      table?.sort?.column === column && table.sort.direction === 'asc' ? 'desc' : 'asc'
    query = { ...query, sort: column, direction, page: null }
  }
  const confirm = () =>
    onconfirm(
      draft,
      Object.fromEntries(draft.filter((key) => labels[key]).map((key) => [key, labels[key]!])),
    )
</script>

<Dialog open={true} onOpenChange={(open) => !open && onclose()}>
  <DialogContent
    class={cn(
      'flex max-h-[90vh] flex-col gap-4',
      FILTERS_MODAL_WIDTH_CLASSES[component.modalWidth ?? '3xl'] ?? 'sm:max-w-3xl',
    )}
    data-slot="modal-table-select-dialog"
  >
    <DialogHeader>
      <DialogTitle>{component.modalHeading}</DialogTitle>
      {#if component.modalDescription}
        <!-- Escaped on the server (`Html::from()`), like action modal descriptions. -->
        <p class="text-muted-foreground text-sm" data-slot="modal-table-select-description">
          {@html component.modalDescription}
        </p>
      {/if}
      <DialogDescription aria-live="polite"
        >{choice(
          'table.selected',
          draft.length,
          { count: draft.length },
          ':count selected',
        )}</DialogDescription
      >
    </DialogHeader>
    {#if table && (table.searchable || (table.filters?.length ?? 0) > 0)}
      <div class="flex flex-col gap-3">
        {#if table.searchable}
          <div class="relative">
            <SearchIcon
              class="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2"
            />
            <Input
              type="search"
              value={search}
              aria-label={table.searchPlaceholder}
              placeholder={table.searchPlaceholder}
              class="ps-8"
              oninput={(event) => {
                search = event.currentTarget.value
                pushSearch(event.currentTarget.value)
              }}
            />
          </div>
        {/if}
        {#if (table.filters?.length ?? 0) > 0}
          <ModalTablePickerFilters
            {table}
            owner={form}
            path={component.statePath}
            onchange={(filters) => (query = { ...query, filters, page: null })}
          />
        {/if}
      </div>
    {/if}
    <div class="min-h-0 flex-1 overflow-auto rounded-md border" aria-busy={loading}>
      {#if failed}
        <p role="alert" class="text-destructive p-6 text-center text-sm">
          {t('table_select.load_failed', {}, "Couldn't load the records.")}
        </p>
      {:else if !table}
        <div class="flex flex-col gap-2 p-4" aria-hidden="true">
          <Skeleton class="h-8 w-full" />
          <Skeleton class="h-8 w-full" />
          <Skeleton class="h-8 w-full" />
        </div>
      {:else if records.length === 0}
        <p class="text-muted-foreground p-6 text-center text-sm">{table.emptyState.heading}</p>
      {:else}
        <Table class={cn(loading && 'opacity-60')}>
          <TableHeader>
            <TableRow>
              <TableHead class="w-10"
                ><span class="sr-only">{t('table.select_row', {}, 'Select row')}</span></TableHead
              >
              {#each columns as column (column.name)}
                <TableHead
                  aria-sort={table.sort?.column === column.name
                    ? table.sort.direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : undefined}
                >
                  {#if column.sortable}
                    <button
                      type="button"
                      class="inline-flex items-center gap-1"
                      onclick={() => sort(column.name)}
                    >
                      {column.label}
                      {#if table.sort?.column === column.name}
                        {#if table.sort.direction === 'asc'}<ArrowUpIcon
                            class="size-3.5"
                          />{:else}<ArrowDownIcon class="size-3.5" />{/if}
                      {:else}<ArrowUpDownIcon class="text-muted-foreground size-3.5" />{/if}
                    </button>
                  {:else}{column.label}{/if}
                </TableHead>
              {/each}
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each records as record (String(record.key))}
              {@const key = String(record.key)}
              {@const checked = draft.includes(key)}
              {@const selectable = isSelectable(key, record.selectable)}
              {@const label = labels[key] ?? key}
              <TableRow
                data-state={checked ? 'selected' : undefined}
                class={cn(selectable && 'cursor-pointer')}
                onclick={() => selectable && toggle(key)}
              >
                <TableCell class="w-10" onclick={(event: MouseEvent) => event.stopPropagation()}>
                  {#if multiple}
                    <Checkbox
                      {checked}
                      disabled={!selectable}
                      aria-label={t('table_select.select_record', { label }, 'Select :label')}
                      onCheckedChange={() => toggle(key)}
                    />
                  {:else}
                    <input
                      type="radio"
                      name={`${component.statePath}-picker`}
                      class="accent-primary size-4"
                      {checked}
                      disabled={!selectable}
                      aria-label={t('table_select.select_record', { label }, 'Select :label')}
                      onchange={() => toggle(key)}
                    />
                  {/if}
                </TableCell>
                {#each columns as column (column.name)}
                  <TableCell>
                    {#if record.cells[column.name]}
                      <TableCellContent
                        {column}
                        cell={record.cells[column.name]!}
                        recordKey={record.key}
                        token=""
                        component={`picker:${component.statePath}`}
                      />
                    {/if}
                  </TableCell>
                {/each}
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      {/if}
    </div>
    {#if atMax}
      <p class="text-muted-foreground text-sm" role="status">
        {choice(
          'table_select.max_reached',
          component.maxItems ?? 0,
          { count: component.maxItems ?? 0 },
          'You can select up to :count records.',
        )}
      </p>
    {/if}
    <DialogFooter class="items-center sm:justify-between">
      {#if paging}
        <nav class="flex items-center gap-2" aria-label={t('pagination', {}, 'Pagination')}>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={!paging.hasPrevious || loading}
            aria-label={t('table.previous', {}, 'Previous')}
            onclick={() => (query = { ...query, page: paging.page - 1 })}
            ><ChevronLeftIcon class="rtl:rotate-180" /></Button
          >
          <span class="text-muted-foreground text-sm"
            >{paging.total !== undefined
              ? t(
                  'table.showing',
                  {
                    first: format.current.number(paging.from),
                    last: format.current.number(paging.to),
                    total: format.current.number(paging.total),
                  },
                  'Showing :first–:last of :total',
                )
              : `${paging.from}–${paging.to}`}</span
          >
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={!paging.hasNext || loading}
            aria-label={t('table.next', {}, 'Next')}
            onclick={() => (query = { ...query, page: paging.page + 1 })}
            ><ChevronRightIcon class="rtl:rotate-180" /></Button
          >
        </nav>
      {:else}
        <span></span>
      {/if}
      <div class="flex gap-2">
        {#if draft.length > 0}
          <Button type="button" variant="ghost" onclick={() => (draft = [])}
            >{t('table_select.clear', {}, 'Clear selection')}</Button
          >
        {/if}
        <Button type="button" variant="outline" onclick={onclose}
          >{t('cancel', {}, 'Cancel')}</Button
        >
        <Button type="button" onclick={confirm}
          >{component.modalSubmitActionLabel ?? t('table_select.confirm', {}, 'Select')}</Button
        >
      </div>
    </DialogFooter>
  </DialogContent>
</Dialog>
