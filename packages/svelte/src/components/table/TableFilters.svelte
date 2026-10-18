<script lang="ts">
  import type { TableSchema } from '@alfakit/core'
  import {
    FilterFormSync,
    FormStore,
    filterFormComponents,
    filtersAreDeferred,
    filtersCollapsible,
    filtersFormWidthClass,
    filtersPlacement,
    triggerButtonView,
    visitTable,
  } from '@alfakit/core'
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down'
  import FunnelIcon from '@lucide/svelte/icons/funnel'
  import { onDestroy, untrack } from 'svelte'
  import { usePageSchema, usePanel, useT } from '../../context.svelte'
  import { useStore } from '../../hooks/store.svelte'
  import { cn } from '../../lib/utils'
  import Icon from '../../lib/Icon.svelte'
  import FormProvider from '../form/FormProvider.svelte'
  import SchemaRenderer from '../schema/SchemaRenderer.svelte'
  import { Badge } from '../ui/badge'
  import { Button } from '../ui/button'
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from '../ui/dialog'
  import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
  import TableTriggerButton from './TableTriggerButton.svelte'

  let { table, component }: { table: TableSchema; component: string } = $props()

  /**
   * Filters are a small form whose state (keyed by filter name) is pushed into the query
   * string. The server re-renders the table with the filtered records.
   */
  const t = useT()
  const panel = usePanel()
  const page = usePageSchema()
  const filters = $derived(table.filters ?? [])
  // `filtersFormSchema()` lays the filters out itself.
  const formComponents = (schema: TableSchema) =>
    schema.filtersFormSchema ?? filterFormComponents(schema.filters ?? [])

  const store = untrack(
    () =>
      new FormStore(
        {
          components: formComponents(table),
          state: table.filterState ?? {},
          columns: table.filtersFormColumns ?? { default: 1 },
        },
        {
          token: page?.token ?? '',
          component: `${component}.filters`,
          refreshUrl: undefined,
          optionsUrl: panel.endpoints.schemaOptions,
        },
      ),
  )

  // Server responses are merged in by FilterFormSync so filters removed elsewhere leave the
  // form, while typing that happens during a filter request is kept.
  const sync = new FilterFormSync(store)

  $effect(() => {
    const payload = {
      components: formComponents(table),
      state: table.filterState,
      columns: table.filtersFormColumns ?? { default: 1 },
    }

    untrack(() => sync.receive(payload))
  })

  $effect(() => {
    const token = usePageSchema()?.token

    if (token) untrack(() => store.setToken(token))
  })

  const formState = useStore(store.store)
  let open = $state(false)
  const deferred = $derived(filtersAreDeferred(table))
  // Re-evaluated with the form state, which `hasUnsentChanges` reads.
  const unsent = $derived.by(() => {
    void formState.current.values

    return deferred && sync.hasUnsentChanges
  })

  const apply = () => {
    sync.pushed(formState.current.values)
    visitTable(
      table.identifier,
      { filters: formState.current.values as Record<string, Record<string, unknown>> },
      ['page'],
    )
    open = false
  }

  const discard = () =>
    sync.discard({
      components: formComponents(table),
      state: table.filterState,
      columns: table.filtersFormColumns ?? { default: 1 },
    })

  const setModalOpen = (next: boolean) => {
    // Dismissing the dialog drops edits that were not applied.
    if (!next) discard()
    open = next
  }

  const reset = () => visitTable(table.identifier, { filters: null }, ['page'])

  // Push changes to the server (debounced by the browser's natural typing pauses), unless
  // the filters wait for the Apply button.
  $effect(() => {
    const current = formState.current

    if (!current.dirty.size || deferred) {
      return
    }

    const timer = setTimeout(() => {
      sync.pushed(current.values)
      visitTable(
        table.identifier,
        { filters: current.values as Record<string, Record<string, unknown>> },
        ['page'],
      )
    }, 400)

    return () => clearTimeout(timer)
  })

  onDestroy(() => store.destroy())

  const activeCount = $derived(table.filterIndicators?.length ?? 0)
  const placement = $derived(filtersPlacement(table.filtersLayout))
  const inline = $derived(placement === 'above' || placement === 'below')
  const sidebar = $derived(placement === 'before' || placement === 'after')
  const collapsible = $derived(filtersCollapsible(table.filtersLayout))
  const widthClass = $derived(filtersFormWidthClass(table))
  // `filtersResetAction()` / `filtersApplyAction()` / `filtersTriggerAction()`.
  const resetView = $derived(
    triggerButtonView(table, 'filtersReset', {
      label: t('table.reset_filters', {}, 'Reset'),
      variant: 'link',
    }),
  )
  const applyView = $derived(
    triggerButtonView(table, 'filtersApply', {
      label: t('table_filters.apply', {}, 'Apply'),
      variant: 'default',
    }),
  )
  const trigger = $derived(
    triggerButtonView(table, 'filters', {
      label: t('table.filters', {}, 'Filters'),
      badge: activeCount > 0 ? activeCount : undefined,
    }),
  )
  const showReset = $derived(activeCount > 0 && resetView !== null)
  const resetInHeader = $derived(table.filtersResetActionPosition === 'header')
</script>

{#snippet funnelIcon()}<Icon
    name="alfakit::tables.actions.filter"
    fallback={FunnelIcon}
  />{/snippet}

{#snippet resetButton()}
  {#if activeCount > 0 && resetView}
    <TableTriggerButton view={resetView} data-slot="filters-reset" onclick={reset} />
  {/if}
{/snippet}

{#snippet applyButton()}
  {#if applyView}
    <TableTriggerButton
      view={applyView}
      data-slot="filters-apply"
      disabled={!unsent}
      onclick={apply}
    />
  {/if}
{/snippet}

{#snippet form()}
  <FormProvider {store}>
    <div class="flex flex-col gap-4">
      {#if resetInHeader && showReset}
        <div class="flex justify-end">{@render resetButton()}</div>
      {/if}
      <SchemaRenderer
        components={formState.current.components}
        columns={formState.current.columns}
        class="gap-4"
      />
      {#if (!resetInHeader && showReset) || (deferred && applyView)}
        <div class="flex items-center justify-end gap-2">
          {#if !resetInHeader}{@render resetButton()}{/if}
          {#if deferred}{@render applyButton()}{/if}
        </div>
      {/if}
    </div>
  </FormProvider>
{/snippet}

{#if filters.length > 0}
  {#if sidebar}
    <aside
      data-slot="table-filters-sidebar"
      aria-label={t('table.filters', {}, 'Filters')}
      class={cn('bg-muted/30 rounded-lg border lg:w-72 lg:shrink-0', widthClass)}
    >
      {#if collapsible}
        <button
          type="button"
          class="flex w-full items-center gap-2 p-4 text-sm font-medium"
          aria-expanded={open}
          onclick={() => (open = !open)}
        >
          <FunnelIcon class="size-4" />
          {t('table.filters', {}, 'Filters')}
          {#if activeCount > 0}<Badge class="h-5 min-w-5 px-1">{activeCount}</Badge>{/if}
          <ChevronDownIcon
            class={cn('ms-auto size-4 transition-transform', open && 'rotate-180')}
          />
        </button>
      {:else}
        <div class="flex items-center gap-2 px-4 pt-4 text-sm font-medium">
          <FunnelIcon class="size-4" />
          {t('table.filters', {}, 'Filters')}
        </div>
      {/if}
      {#if !collapsible || open}
        <div class={cn('p-4', collapsible && 'border-t')}>{@render form()}</div>
      {/if}
    </aside>
  {:else if table.filtersLayout === 'above-content-collapsible'}
    <div class="bg-muted/30 rounded-lg border">
      <button
        type="button"
        class="flex w-full items-center gap-2 p-4 text-sm font-medium"
        aria-expanded={open}
        onclick={() => (open = !open)}
      >
        <FunnelIcon class="size-4" />
        {t('table.filters', {}, 'Filters')}
        {#if activeCount > 0}<Badge class="h-5 min-w-5 px-1">{activeCount}</Badge>{/if}
        <ChevronDownIcon class={cn('ms-auto size-4 transition-transform', open && 'rotate-180')} />
      </button>
      {#if open}<div class="border-t p-4">{@render form()}</div>{/if}
    </div>
  {:else if table.filtersLayout === 'modal'}
    <Dialog bind:open={() => open, setModalOpen}>
      {#if trigger}
        <DialogTrigger>
          {#snippet child({ props })}
            <TableTriggerButton
              view={trigger}
              defaultIcon={funnelIcon}
              responsiveLabel={!table.triggerActions?.filters}
              active={activeCount > 0}
              {...props}
            />
          {/snippet}
        </DialogTrigger>
      {/if}
      <DialogContent class={widthClass ?? 'sm:max-w-2xl'}>
        <DialogHeader>
          <DialogTitle>{t('table.filters', {}, 'Filters')}</DialogTitle>
          <DialogDescription class="sr-only">{table.pluralModelLabel}</DialogDescription>
        </DialogHeader>
        {#if resetInHeader && showReset}
          <div class="flex justify-end">{@render resetButton()}</div>
        {/if}
        <FormProvider {store}>
          <div class="max-h-[60vh] overflow-y-auto">
            <SchemaRenderer
              components={formState.current.components}
              columns={formState.current.columns}
              class="gap-4"
            />
          </div>
        </FormProvider>
        <DialogFooter class="items-center gap-2">
          {#if !resetInHeader}{@render resetButton()}{/if}
          <span class="flex-1"></span>
          <Button type="button" variant="outline" size="sm" onclick={() => setModalOpen(false)}>
            {t('table_filters.cancel', {}, 'Cancel')}
          </Button>
          {@render applyButton()}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  {:else if inline}
    <div class="bg-muted/30 rounded-lg border p-4">{@render form()}</div>
  {:else}
    <Popover bind:open>
      {#if trigger}
        <PopoverTrigger>
          {#snippet child({ props })}
            <TableTriggerButton
              view={trigger}
              defaultIcon={funnelIcon}
              responsiveLabel={!table.triggerActions?.filters}
              active={activeCount > 0}
              {...props}
            />
          {/snippet}
        </PopoverTrigger>
      {/if}
      <PopoverContent
        align="end"
        class={cn(
          widthClass ? ['w-[calc(100vw-2rem)]', widthClass] : 'w-80 sm:w-96',
          table.filtersFormMaxHeight && 'overflow-y-auto',
        )}
        style={table.filtersFormMaxHeight ? `max-height: ${table.filtersFormMaxHeight}` : undefined}
        >{@render form()}</PopoverContent
      >
    </Popover>
  {/if}
{/if}
