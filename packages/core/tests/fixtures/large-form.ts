import type { RepeaterSchema, SchemaComponent, TableSchema } from '../../src'

/**
 * Fixtures for the large-form regression suites in every renderer: a Repeater with many
 * items (each a TextInput, a Select and a FileUpload) and a kitchen-sink table.
 */
export function largeRepeater(count: number, virtualize = true): RepeaterSchema {
  const fields = (index: string): SchemaComponent[] => [
    {
      type: 'TextInput',
      key: `items.${index}.name`,
      name: 'name',
      statePath: `items.${index}.name`,
      label: 'Name',
      inputType: 'text',
      required: true,
    } as SchemaComponent,
    {
      type: 'Select',
      key: `items.${index}.kind`,
      name: 'kind',
      statePath: `items.${index}.kind`,
      label: 'Kind',
      options: [
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta' },
        { value: 'c', label: 'Gamma' },
      ],
      selectablePlaceholder: true,
    } as SchemaComponent,
    {
      type: 'FileUpload',
      key: `items.${index}.attachment`,
      name: 'attachment',
      statePath: `items.${index}.attachment`,
      label: 'Attachment',
      image: true,
      previewable: true,
      deletable: true,
      panelLayout: 'compact',
      files: [],
    } as SchemaComponent,
  ]

  return {
    type: 'Repeater',
    key: 'items',
    name: 'items',
    statePath: 'items',
    label: 'Items',
    items: Array.from({ length: count }, (_, index) => ({
      key: String(index),
      label: `Item ${index + 1}`,
      schema: fields(String(index)),
    })),
    template: fields('__INDEX__'),
    templateState: { name: null, kind: null, attachment: null },
    addable: true,
    deletable: true,
    reorderable: true,
    collapsible: true,
    addActionLabel: 'Add item',
    virtualize: virtualize ? { threshold: 50 } : undefined,
  } as RepeaterSchema
}

export function largeRepeaterState(count: number): Record<string, unknown> {
  return {
    items: Array.from({ length: count }, (_, index) => ({
      name: `Item ${index + 1}`,
      kind: ['a', 'b', 'c'][index % 3],
      attachment: null,
    })),
  }
}

export function largeTable(rows: number, columns = 12, virtualize = true): TableSchema {
  const names = Array.from({ length: columns }, (_, index) => `col_${index}`)

  return {
    type: 'Table',
    modelLabel: 'row',
    pluralModelLabel: 'rows',
    columns: names.map((name, index) => ({
      type: 'TextColumn',
      name,
      label: `Column ${index + 1}`,
      sortable: index % 2 === 0,
    })),
    visibleColumns: names,
    filtersLayout: 'dropdown',
    recordActionsPosition: 'after-columns',
    records: Array.from({ length: rows }, (_, row) => ({
      key: row + 1,
      cells: Object.fromEntries(
        names.map((name, col) => [name, { state: `r${row + 1}c${col + 1}` }]),
      ),
    })),
    pagination: {
      currentPage: 1,
      lastPage: 1,
      perPage: rows,
      total: rows,
      from: 1,
      to: rows,
      pageOptions: [rows],
    },
    searchPlaceholder: 'Search',
    searchDebounce: 500,
    emptyState: { heading: 'No rows', icon: 'inbox' },
    virtualize: virtualize ? { threshold: 50 } : undefined,
  } as TableSchema
}

/**
 * Run `render` and return the CPU time (ms) the current thread spent on it. The budgets use
 * CPU time rather than wall-clock time so that a machine busy with other work (parallel test
 * projects, a loaded CI runner) does not count the time this worker spent descheduled, while a
 * renderer that stops windowing still blows through them (it multiplies the work itself).
 */
export function cpuTime<T>(render: () => T): { result: T; elapsed: number } {
  const usage =
    (
      process as { threadCpuUsage?: (previous?: NodeJS.CpuUsage) => NodeJS.CpuUsage }
    ).threadCpuUsage?.bind(process) ?? process.cpuUsage.bind(process)
  const started = usage()
  const result = render()
  const used = usage(started)

  return { result, elapsed: (used.user + used.system) / 1_000 }
}
