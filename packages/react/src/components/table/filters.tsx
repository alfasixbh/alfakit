import type { TableSchema } from '@alfakit/core'
import {
  FilterFormSync,
  FormStore,
  filterFormComponents,
  filtersAreDeferred,
  filtersCollapsible,
  filtersFormWidthClass,
  filtersPlacement,
  removeAllFilterIndicators,
  removeFilterIndicator,
  triggerButtonView,
  visitTable,
} from '@alfakit/core'
import { ChevronDownIcon, FilterIcon, XIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { usePageSchema, usePanel, useT } from '../../context'
import { useStore } from '../../hooks/use-store'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { FormProvider } from '../form/form-context'
import { SchemaRenderer } from '../schema/schema-renderer'
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
import { TableTriggerButton } from './trigger-button'

/**
 * Filters are a small form whose state (keyed by filter name) is pushed into the query
 * string. The server re-renders the table with the filtered records.
 */
export function TableFilters({ table, component }: { table: TableSchema; component: string }) {
  const t = useT()
  const panel = usePanel()
  const page = usePageSchema()
  const filters = useMemo(() => table.filters ?? [], [table.filters])

  // `filtersFormSchema()` lays the filters out itself.
  const components = useMemo(
    () => table.filtersFormSchema ?? filterFormComponents(filters),
    [filters, table.filtersFormSchema],
  )

  // One store per table; server responses are merged in by FilterFormSync so typing that
  // happens while a filter request is in flight is never reset.
  const [{ store, sync }] = useState(() => {
    const store = new FormStore(
      {
        components,
        state: table.filterState ?? {},
        columns: table.filtersFormColumns ?? { default: 1 },
      },
      {
        token: page?.token ?? '',
        component: `${component}.filters`,
        refreshUrl: undefined,
        optionsUrl: panel.endpoints.schemaOptions,
      },
    )

    return { store, sync: new FilterFormSync(store) }
  })

  useEffect(() => {
    sync.receive({
      components,
      state: table.filterState,
      columns: table.filtersFormColumns ?? { default: 1 },
    })
  }, [sync, components, table.filterState, table.filtersFormColumns])

  useEffect(() => {
    if (page?.token) {
      store.setToken(page.token)
    }
  }, [store, page?.token])

  useEffect(() => () => store.destroy(), [store])

  const state = useStore(store.store)
  const [open, setOpen] = useState(false)
  const deferred = filtersAreDeferred(table)

  const apply = () => {
    sync.pushed(state.values)
    visitTable(
      table.identifier,
      { filters: state.values as Record<string, Record<string, unknown>> },
      ['page'],
    )
  }

  const discard = () =>
    sync.discard({
      components,
      state: table.filterState,
      columns: table.filtersFormColumns ?? { default: 1 },
    })

  // Push changes to the server (debounced by the browser's natural typing pauses), unless
  // the filters wait for the Apply button.
  useEffect(() => {
    if (!state.dirty.size || deferred) {
      return
    }

    const timer = setTimeout(() => {
      sync.pushed(state.values)
      visitTable(
        table.identifier,
        { filters: state.values as Record<string, Record<string, unknown>> },
        ['page'],
      )
    }, 400)

    return () => clearTimeout(timer)
  }, [sync, state.values, state.dirty, table.identifier, deferred])

  if (filters.length === 0) {
    return null
  }

  const activeCount = table.filterIndicators?.length ?? 0

  const unsent = deferred && sync.hasUnsentChanges
  // `filtersResetAction()` / `filtersApplyAction()` / `filtersTriggerAction()`.
  const resetView = triggerButtonView(table, 'filtersReset', {
    label: t('table.reset_filters', {}, 'Reset'),
    variant: 'link',
  })
  const applyView = triggerButtonView(table, 'filtersApply', {
    label: t('table_filters.apply', {}, 'Apply'),
    variant: 'default',
  })
  const trigger = triggerButtonView(table, 'filters', {
    label: t('table.filters', {}, 'Filters'),
    badge: activeCount > 0 ? activeCount : undefined,
  })
  const resetButton =
    activeCount > 0 && resetView ? (
      <TableTriggerButton
        view={resetView}
        data-slot="filters-reset"
        onClick={() => visitTable(table.identifier, { filters: null }, ['page'])}
      />
    ) : null
  const applyButton = applyView ? (
    <TableTriggerButton
      view={applyView}
      data-slot="filters-apply"
      disabled={!unsent}
      onClick={() => {
        apply()
        setOpen(false)
      }}
    />
  ) : null
  const resetInHeader = table.filtersResetActionPosition === 'header'
  const triggerButton = trigger ? (
    <TableTriggerButton
      view={trigger}
      defaultIcon={<Icon name="alfakit::tables.actions.filter" fallback={FilterIcon} />}
      responsiveLabel={!table.triggerActions?.filters}
      active={activeCount > 0}
    />
  ) : null

  const widthClass = filtersFormWidthClass(table)
  const placement = filtersPlacement(table.filtersLayout)

  const fields = (
    <SchemaRenderer components={state.components} columns={state.columns} className="gap-4" />
  )

  if (table.filtersLayout === 'modal') {
    return (
      <Dialog
        open={open}
        onOpenChange={(next) => {
          // Dismissing the dialog drops edits that were not applied.
          if (!next) discard()
          setOpen(next)
        }}
      >
        {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
        <DialogContent className={widthClass ?? 'sm:max-w-2xl'}>
          <DialogHeader>
            <DialogTitle>{t('table.filters', {}, 'Filters')}</DialogTitle>
            <DialogDescription className="sr-only">{table.pluralModelLabel}</DialogDescription>
          </DialogHeader>
          {resetInHeader && resetButton && <div className="flex justify-end">{resetButton}</div>}
          <FormProvider store={store}>
            <div className="max-h-[60vh] overflow-y-auto">{fields}</div>
          </FormProvider>
          <DialogFooter className="items-center gap-2">
            {!resetInHeader && resetButton}
            <span className="flex-1" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                discard()
                setOpen(false)
              }}
            >
              {t('table_filters.cancel', {}, 'Cancel')}
            </Button>
            {applyButton}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  const form = (
    <FormProvider store={store}>
      <div className="flex flex-col gap-4">
        {resetInHeader && resetButton && <div className="flex justify-end">{resetButton}</div>}
        {fields}
        {((!resetInHeader && resetButton) || (deferred && applyButton)) && (
          <div className="flex items-center justify-end gap-2">
            {!resetInHeader && resetButton}
            {deferred && applyButton}
          </div>
        )}
      </div>
    </FormProvider>
  )

  if (placement === 'before' || placement === 'after') {
    const collapsible = filtersCollapsible(table.filtersLayout)

    return (
      <aside
        data-slot="table-filters-sidebar"
        aria-label={t('table.filters', {}, 'Filters')}
        className={cn('bg-muted/30 rounded-lg border lg:w-72 lg:shrink-0', widthClass)}
      >
        {collapsible ? (
          <button
            type="button"
            className="flex w-full items-center gap-2 p-4 text-sm font-medium"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <FilterIcon className="size-4" />
            {t('table.filters', {}, 'Filters')}
            {activeCount > 0 && <Badge className="h-5 min-w-5 px-1">{activeCount}</Badge>}
            <ChevronDownIcon
              className={cn('ms-auto size-4 transition-transform', open && 'rotate-180')}
            />
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 pt-4 text-sm font-medium">
            <FilterIcon className="size-4" />
            {t('table.filters', {}, 'Filters')}
          </div>
        )}
        {(!collapsible || open) && (
          <div className={cn('p-4', collapsible && 'border-t')}>{form}</div>
        )}
      </aside>
    )
  }

  if (table.filtersLayout === 'above-content-collapsible') {
    return (
      <div className="bg-muted/30 rounded-lg border">
        <button
          type="button"
          className="flex w-full items-center gap-2 p-4 text-sm font-medium"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <FilterIcon className="size-4" />
          {t('table.filters', {}, 'Filters')}
          {activeCount > 0 && <Badge className="h-5 min-w-5 px-1">{activeCount}</Badge>}
          <ChevronDownIcon
            className={cn('ms-auto size-4 transition-transform', open && 'rotate-180')}
          />
        </button>
        {open && <div className="border-t p-4">{form}</div>}
      </div>
    )
  }

  if (table.filtersLayout.startsWith('above-content') || table.filtersLayout === 'below-content') {
    return <div className="bg-muted/30 rounded-lg border p-4">{form}</div>
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {triggerButton && <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>}
      <PopoverContent
        align="end"
        className={cn(
          widthClass ? ['w-[calc(100vw-2rem)]', widthClass] : 'w-80 sm:w-96',
          table.filtersFormMaxHeight && 'overflow-y-auto',
        )}
        style={table.filtersFormMaxHeight ? { maxHeight: table.filtersFormMaxHeight } : undefined}
      >
        {form}
      </PopoverContent>
    </Popover>
  )
}

export function FilterIndicators({ table }: { table: TableSchema }) {
  const t = useT()
  const indicators = table.filterIndicators ?? []

  if (indicators.length === 0) {
    return null
  }

  // `filtersRemoveAllAction()`; shown while any indicator can be removed.
  const removeAll = indicators.some((indicator) => indicator.removable !== false)
    ? triggerButtonView(table, 'filtersRemoveAll', {
        label: t('table.remove_all_filters', {}, 'Remove all filters'),
        showLabel: false,
        variant: 'ghost',
      })
    : null

  return (
    <div className="flex flex-wrap items-center gap-2" data-slot="filter-indicators">
      {indicators.map((indicator) => (
        <Badge
          key={`${indicator.filter}-${indicator.removeField ?? ''}-${indicator.label}`}
          variant="secondary"
          className={cn('gap-1', indicator.removable !== false && 'pe-1')}
        >
          {indicator.label}
          {indicator.removable !== false && (
            <button
              type="button"
              aria-label={`${t('table.remove_filter', {}, 'Remove filter')}: ${indicator.label}`}
              className="hover:bg-foreground/10 rounded-sm"
              onClick={() =>
                visitTable(
                  table.identifier,
                  { filters: removeFilterIndicator(table.filterState, indicator) },
                  ['page'],
                )
              }
            >
              <XIcon className="size-3" />
            </button>
          )}
        </Badge>
      ))}
      {removeAll && (
        <TableTriggerButton
          view={removeAll}
          defaultIcon={<Icon name="alfakit::tables.filters.remove-all-button" fallback={XIcon} />}
          data-slot="filters-remove-all"
          onClick={() =>
            visitTable(
              table.identifier,
              { filters: removeAllFilterIndicators(table.filterState, table.filterIndicators) },
              ['page'],
            )
          }
        />
      )}
    </div>
  )
}
