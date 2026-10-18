import type { TableRecordSchema, TableSchema } from './schema/table'
import type { ColumnSummariesSchema, TableRecordGroupSchema } from './schema/table-grouping'

/** One row of a grouped table body, in display order. */
export type GroupedTableRow =
  | { kind: 'group'; group: TableRecordGroupSchema; collapsed: boolean; count: number }
  | { kind: 'record'; record: TableRecordSchema; index: number }
  | { kind: 'summary'; group: TableRecordGroupSchema; summary: ColumnSummariesSchema }

/**
 * Interleave group headings (and group summaries) with the records of a grouped table.
 * Records of collapsed groups are left out; ungrouped tables return their records as is.
 * `index` is the record's position in `records`, for striping and reordering.
 */
export function groupTableRows(
  table: Pick<TableSchema, 'grouping' | 'recordGroups'>,
  records: TableRecordSchema[],
  collapsed: ReadonlySet<string>,
): GroupedTableRow[] {
  const groups = table.grouping ? (table.recordGroups ?? []) : []

  if (groups.length === 0) {
    return records.map((record, index) => ({ kind: 'record', record, index }))
  }

  const groupsOnly = Boolean(table.grouping?.groupsOnly)
  const byGroup = new Map<string, Array<{ record: TableRecordSchema; index: number }>>()

  records.forEach((record, index) => {
    const key = record.group ?? ''
    const list = byGroup.get(key) ?? []
    list.push({ record, index })
    byGroup.set(key, list)
  })

  const rows: GroupedTableRow[] = []

  for (const group of groups) {
    const members = byGroup.get(group.key) ?? []
    const isCollapsed = !groupsOnly && collapsed.has(group.key)

    rows.push({ kind: 'group', group, collapsed: isCollapsed, count: members.length })

    if (!isCollapsed) {
      for (const member of members) {
        rows.push({ kind: 'record', ...member })
      }
    }

    if (group.summary && !isCollapsed) {
      rows.push({ kind: 'summary', group, summary: group.summary })
    }
  }

  return rows
}

/** The initial collapsed set: every group when `collapsedGroupsByDefault()` is on. */
export function initialCollapsedGroups(
  table: Pick<TableSchema, 'grouping' | 'recordGroups'>,
): Set<string> {
  if (!table.grouping?.collapsible || !table.grouping.collapsedByDefault) {
    return new Set()
  }

  return new Set((table.recordGroups ?? []).map((group) => group.key))
}

/** Toggle one group in a collapsed set (returns a new set). */
export function toggleCollapsedGroup(collapsed: ReadonlySet<string>, key: string): Set<string> {
  const next = new Set(collapsed)

  if (next.has(key)) {
    next.delete(key)
  } else {
    next.add(key)
  }

  return next
}
