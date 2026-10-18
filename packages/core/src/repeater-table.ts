import type { SchemaComponent, TableColumnSchema } from './schema/components'

/**
 * The item components to show under each column of a table-layout Repeater or
 * RepeatableEntry. Columns name their component (relative state path for fields, entry
 * name for entries), so a component the server left out (hidden) leaves an empty cell
 * instead of shifting the row; unnamed columns (layout components) fall back to position.
 *
 * @param prefix The item's state path prefix (`lines.0.`) for Repeater items.
 */
export function tableColumnCells(
  columns: TableColumnSchema[],
  components: SchemaComponent[],
  prefix = '',
): Array<SchemaComponent | undefined> {
  return columns.map((column, index) => {
    if (!column.name) {
      return components[index]
    }

    const path = `${prefix}${column.name}`

    return components.find(
      (component) =>
        (component as { statePath?: string }).statePath === path ||
        component.key === path ||
        (component as { name?: string }).name === column.name,
    )
  })
}

/** Logical text alignment classes for a table column (mirrors in right-to-left locales). */
export function tableColumnAlignmentClass(column: Pick<TableColumnSchema, 'alignment'>): string {
  switch (column.alignment) {
    case 'center':
      return 'text-center'
    case 'end':
      return 'text-end'
    default:
      return 'text-start'
  }
}
