import type { ModalTableSelectResponse, ModalTableSelectSchema, TableQuery } from '@alfakit/core'
import {
  FILTERS_MODAL_WIDTH_CLASSES,
  FormStore,
  debounce,
  fieldIds,
  filterFormComponents,
  modalTablePaging,
  modalTableSelected,
  pickerFilterFormOptions,
  toggleModalTableKey,
} from '@alfakit/core'
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useChoice, useFormatter, useT } from '../../context'
import { useStore } from '../../hooks/use-store'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { FormProvider, useField, useFormStore } from '../form/form-context'
import { FieldWrapper } from '../schema/field-wrapper'
import { SchemaRenderer } from '../schema/schema-renderer'
import { TableCellContent } from '../table/cells'
import { Badge } from '../ui/badge'
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

/**
 * Select records from a table in a modal. The table (columns, search, filters, sorting,
 * pagination) comes from the server's picker endpoint; the field keeps only keys, with
 * labels from the server.
 */
export function ModalTableSelectField({ component }: { component: ModalTableSelectSchema }) {
  const t = useT()
  const { value, setValue, error, id, disabled, readOnly, aria } = useField<unknown>(component)
  const multiple = Boolean(component.multiple)
  const selected = modalTableSelected(value, multiple)
  const locked = disabled || readOnly
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<Record<string, string>>({})
  const labels = { ...picked, ...component.selectedLabels }

  const store = (keys: string[]) => setValue(multiple ? keys : (keys[0] ?? null))

  return (
    <FieldWrapper field={component} htmlFor={id} error={error}>
      <div
        id={id}
        role="group"
        data-slot="modal-table-select"
        className="flex flex-wrap items-center gap-2"
        aria-labelledby={component.label ? fieldIds(id).label : undefined}
        aria-describedby={aria['aria-describedby']}
      >
        {selected.length === 0 ? (
          <span className="text-muted-foreground text-sm">
            {component.placeholder ?? t('table_select.none', {}, 'Nothing selected')}
          </span>
        ) : (
          selected.map((key) => (
            <Badge key={key} variant="secondary" className="gap-1 pe-1">
              <span>{labels[key] ?? key}</span>
              {!locked && (
                <button
                  type="button"
                  className="hover:bg-foreground/10 rounded-sm"
                  aria-label={t(
                    'table_select.remove',
                    { label: labels[key] ?? key },
                    'Remove :label',
                  )}
                  onClick={() => store(selected.filter((candidate) => candidate !== key))}
                >
                  <XIcon className="size-3" />
                </button>
              )}
            </Badge>
          ))
        )}
        {!locked && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-haspopup="dialog"
            onClick={() => setOpen(true)}
          >
            {component.selectActionIcon && <Icon name={component.selectActionIcon} />}
            {selected.length > 0 && !multiple
              ? t('table_select.change', {}, 'Change')
              : component.selectActionLabel}
          </Button>
        )}
      </div>
      {open && (
        <ModalTablePicker
          component={component}
          initial={selected}
          onClose={() => setOpen(false)}
          onConfirm={(keys, newLabels) => {
            setPicked((state) => ({ ...state, ...newLabels }))
            store(keys)
            setOpen(false)
          }}
        />
      )}
    </FieldWrapper>
  )
}

interface PickerProps {
  component: ModalTableSelectSchema
  initial: string[]
  onClose: () => void
  onConfirm: (keys: string[], labels: Record<string, string>) => void
}

function ModalTablePicker({ component, initial, onClose, onConfirm }: PickerProps) {
  const t = useT()
  const format = useFormatter()
  const choice = useChoice()
  const form = useFormStore()
  const multiple = Boolean(component.multiple)
  const [query, setQuery] = useState<TableQuery>({})
  const [response, setResponse] = useState<ModalTableSelectResponse | null>(null)
  const [failed, setFailed] = useState(false)
  // The query the shown records answer; anything else means a request is in flight.
  const [loadedQuery, setLoadedQuery] = useState<TableQuery | null>(null)
  const loading = loadedQuery !== query
  const [draft, setDraft] = useState<string[]>(initial)
  const [labels, setLabels] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    form
      .modalTable(component.statePath, component.tableStateIdentifier, query, controller.signal)
      .then((next) => {
        if (next) {
          setResponse(next)
          setLabels((state) => ({ ...state, ...next.labels }))
        }
        setFailed(false)
        setLoadedQuery(query)
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name === 'AbortError') return
        setFailed(true)
        setLoadedQuery(query)
      })

    return () => controller.abort()
  }, [form, component.statePath, component.tableStateIdentifier, query])

  const table = response?.table
  const pushSearch = useMemo(
    () =>
      debounce(
        (next: string) => setQuery((state) => ({ ...state, search: next || null, page: null })),
        table?.searchDebounce ?? 400,
      ),
    [table?.searchDebounce],
  )
  useEffect(() => () => pushSearch.cancel(), [pushSearch])

  const columns = table
    ? table.columns.filter((column) => table.visibleColumns.includes(column.name))
    : []
  const records = table?.records ?? []
  const paging = modalTablePaging(table?.pagination)
  const atMax = multiple && component.maxItems != null && draft.length >= component.maxItems

  const toggle = (key: string) =>
    setDraft((state) => toggleModalTableKey(state, key, multiple, component.maxItems))

  const sort = (column: string) => {
    const direction =
      table?.sort?.column === column && table.sort.direction === 'asc' ? 'desc' : 'asc'
    setQuery((state) => ({ ...state, sort: column, direction, page: null }))
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className={cn(
          'flex max-h-[90vh] flex-col gap-4',
          FILTERS_MODAL_WIDTH_CLASSES[component.modalWidth ?? '3xl'] ?? 'sm:max-w-3xl',
        )}
        data-slot="modal-table-select-dialog"
      >
        <DialogHeader>
          <DialogTitle>{component.modalHeading}</DialogTitle>
          {component.modalDescription && (
            // Escaped on the server (`Html::from()`), like action modal descriptions.
            <p
              className="text-muted-foreground text-sm"
              data-slot="modal-table-select-description"
              dangerouslySetInnerHTML={{ __html: component.modalDescription }}
            />
          )}
          <DialogDescription aria-live="polite">
            {choice(
              'table.selected',
              draft.length,
              { count: draft.length },
              `${draft.length} selected`,
            )}
          </DialogDescription>
        </DialogHeader>
        {table && (table.searchable || (table.filters?.length ?? 0) > 0) && (
          <div className="flex flex-col gap-3">
            {table.searchable && (
              <div className="relative">
                <SearchIcon className="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  type="search"
                  value={search}
                  aria-label={table.searchPlaceholder}
                  placeholder={table.searchPlaceholder}
                  className="ps-8"
                  onChange={(event) => {
                    setSearch(event.target.value)
                    pushSearch(event.target.value)
                  }}
                />
              </div>
            )}
            {(table.filters?.length ?? 0) > 0 && (
              <PickerFilters
                table={table}
                owner={form}
                path={component.statePath}
                onChange={(filters) => setQuery((state) => ({ ...state, filters, page: null }))}
              />
            )}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-auto rounded-md border" aria-busy={loading}>
          {failed ? (
            <p role="alert" className="text-destructive p-6 text-center text-sm">
              {t('table_select.load_failed', {}, "Couldn't load the records.")}
            </p>
          ) : !table ? (
            <div className="flex flex-col gap-2 p-4" aria-hidden="true">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : records.length === 0 ? (
            <p className="text-muted-foreground p-6 text-center text-sm">
              {table.emptyState.heading}
            </p>
          ) : (
            <Table className={cn(loading && 'opacity-60')}>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <span className="sr-only">{t('table.select_row', {}, 'Select row')}</span>
                  </TableHead>
                  {columns.map((column) => (
                    <TableHead
                      key={column.name}
                      aria-sort={
                        table.sort?.column === column.name
                          ? table.sort.direction === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                    >
                      {column.sortable ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1"
                          onClick={() => sort(column.name)}
                        >
                          {column.label}
                          {table.sort?.column === column.name ? (
                            table.sort.direction === 'asc' ? (
                              <ArrowUpIcon className="size-3.5" />
                            ) : (
                              <ArrowDownIcon className="size-3.5" />
                            )
                          ) : (
                            <ArrowUpDownIcon className="text-muted-foreground size-3.5" />
                          )}
                        </button>
                      ) : (
                        column.label
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => {
                  const key = String(record.key)
                  const checked = draft.includes(key)
                  const selectable = record.selectable === true && (checked || !atMax)
                  const label = labels[key] ?? key

                  return (
                    <TableRow
                      key={key}
                      data-state={checked ? 'selected' : undefined}
                      className={cn(selectable && 'cursor-pointer')}
                      onClick={() => selectable && toggle(key)}
                    >
                      <TableCell className="w-10" onClick={(event) => event.stopPropagation()}>
                        {multiple ? (
                          <Checkbox
                            checked={checked}
                            disabled={!selectable}
                            aria-label={t(
                              'table_select.select_record',
                              { label },
                              `Select ${label}`,
                            )}
                            onCheckedChange={() => toggle(key)}
                          />
                        ) : (
                          <input
                            type="radio"
                            name={`${component.statePath}-picker`}
                            className="accent-primary size-4"
                            checked={checked}
                            disabled={!selectable}
                            aria-label={t(
                              'table_select.select_record',
                              { label },
                              `Select ${label}`,
                            )}
                            onChange={() => toggle(key)}
                          />
                        )}
                      </TableCell>
                      {columns.map((column) => (
                        <TableCell key={column.name}>
                          {record.cells[column.name] && (
                            <TableCellContent
                              column={column}
                              cell={record.cells[column.name]!}
                              recordKey={record.key}
                              token=""
                              component={`picker:${component.statePath}`}
                            />
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
        {atMax && (
          <p className="text-muted-foreground text-sm" role="status">
            {choice(
              'table_select.max_reached',
              component.maxItems ?? 0,
              { count: component.maxItems ?? 0 },
              'You can select up to :count records.',
            )}
          </p>
        )}
        <DialogFooter className="items-center sm:justify-between">
          {paging ? (
            <nav className="flex items-center gap-2" aria-label={t('pagination', {}, 'Pagination')}>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={!paging.hasPrevious || loading}
                aria-label={t('table.previous', {}, 'Previous')}
                onClick={() => setQuery((state) => ({ ...state, page: paging.page - 1 }))}
              >
                <ChevronLeftIcon className="rtl:rotate-180" />
              </Button>
              <span className="text-muted-foreground text-sm">
                {paging.total !== undefined
                  ? t(
                      'table.showing',
                      {
                        first: format.number(paging.from),
                        last: format.number(paging.to),
                        total: format.number(paging.total),
                      },
                      'Showing :first–:last of :total',
                    )
                  : `${paging.from}–${paging.to}`}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={!paging.hasNext || loading}
                aria-label={t('table.next', {}, 'Next')}
                onClick={() => setQuery((state) => ({ ...state, page: paging.page + 1 }))}
              >
                <ChevronRightIcon className="rtl:rotate-180" />
              </Button>
            </nav>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            {draft.length > 0 && (
              <Button type="button" variant="ghost" onClick={() => setDraft([])}>
                {t('table_select.clear', {}, 'Clear selection')}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              {t('cancel', {}, 'Cancel')}
            </Button>
            <Button
              type="button"
              onClick={() =>
                onConfirm(
                  draft,
                  Object.fromEntries(
                    draft.filter((key) => labels[key]).map((key) => [key, labels[key]!]),
                  ),
                )
              }
            >
              {component.modalSubmitActionLabel ?? t('table_select.confirm', {}, 'Select')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * The picker's filters: a small form whose state becomes the table's `filters`. Searchable
 * selects among them load options through the owning form's endpoint (`pickerFilters`).
 */
function PickerFilters({
  table,
  owner,
  path,
  onChange,
}: {
  table: NonNullable<ModalTableSelectResponse['table']>
  owner: FormStore
  path: string
  onChange: (filters: Record<string, Record<string, unknown>> | null) => void
}) {
  const t = useT()
  const components = useMemo(() => filterFormComponents(table.filters ?? []), [table.filters])
  const [store] = useState(
    () =>
      new FormStore(
        {
          components,
          state: table.filterState ?? {},
          columns: table.filtersFormColumns ?? { default: 1, sm: 2 },
        },
        pickerFilterFormOptions(owner, path),
      ),
  )
  const state = useStore(store.store)
  const latest = useRef(onChange)

  useEffect(() => {
    latest.current = onChange
  })

  useEffect(() => {
    if (!state.dirty.size) return

    const timer = setTimeout(
      () => latest.current(state.values as Record<string, Record<string, unknown>>),
      400,
    )

    return () => clearTimeout(timer)
  }, [state.values, state.dirty])

  useEffect(() => () => store.destroy(), [store])

  return (
    <FormProvider store={store}>
      <div className="bg-muted/30 flex flex-col gap-2 rounded-lg border p-3">
        <SchemaRenderer components={state.components} columns={state.columns} className="gap-3" />
        {(table.filterIndicators?.length ?? 0) > 0 && (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="self-end"
            onClick={() => {
              store.fill({ components, state: {}, columns: state.columns })
              onChange(null)
            }}
          >
            {t('table.reset_filters', {}, 'Reset')}
          </Button>
        )}
      </div>
    </FormProvider>
  )
}
