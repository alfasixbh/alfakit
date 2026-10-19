import type {
  ColumnSchema,
  TableRecordGroupSchema,
  TableSchema,
  TriggerButtonView,
} from '@alfakit/core'
import {
  initialCollapsedGroups,
  registerTablePersistence,
  toggleCollapsedGroup,
  triggerButtonView,
  visitTable,
} from '@alfakit/core'
import { ChevronDownIcon, ChevronRightIcon, LayersIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useT } from '../../context'
import { colorClass, textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { Checkbox } from '../ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { TableCell, TableRow } from '../ui/table'
import { TableTriggerButton } from './trigger-button'

/** The "group by" menu: one of the table's groups (or none) and the direction. */
export function TableGroupingMenu({ table }: { table: TableSchema }) {
  const t = useT()

  if (!table.groups || table.groups.length === 0) {
    return null
  }

  const active = table.grouping?.group ?? ''
  const groups = table.groups
  // `groupRecordsTriggerAction()`.
  const trigger = triggerButtonView(table, 'groupRecords', {
    label: t('table_grouping.group_by', {}, 'Group by'),
  })
  const changeGroup = (group: string) => visitTable(table.identifier, { group }, ['page'])
  const changeDirection = (direction: string) =>
    visitTable(table.identifier, { groupDirection: direction === 'desc' ? 'desc' : 'asc' }, [
      'page',
    ])
  const inDropdownOnly = Boolean(table.groupingSettingsInDropdownOnDesktop)

  // Desktop default: the settings inline in the toolbar (the dropdown is for phones).
  const inline = inDropdownOnly ? null : (
    <div data-slot="table-grouping-inline" className="hidden items-center gap-2 text-sm sm:flex">
      <label className="flex items-center gap-2">
        <span className="text-muted-foreground">
          {t('table_grouping.group_by', {}, 'Group by')}
        </span>
        <select
          value={active}
          onChange={(event) => changeGroup(event.target.value)}
          className="border-input h-8 rounded-md border bg-transparent px-2 text-sm"
        >
          <option value="">{t('table_grouping.none', {}, 'No grouping')}</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.label}
            </option>
          ))}
        </select>
      </label>
      {table.grouping && !table.groupingDirectionSettingHidden && (
        <label className="flex items-center">
          <span className="sr-only">{t('table_grouping.direction', {}, 'Group direction')}</span>
          <select
            value={table.grouping.direction}
            onChange={(event) => changeDirection(event.target.value)}
            className="border-input h-8 rounded-md border bg-transparent px-2 text-sm"
          >
            <option value="asc">{t('table_grouping.ascending', {}, 'Ascending')}</option>
            <option value="desc">{t('table_grouping.descending', {}, 'Descending')}</option>
          </select>
        </label>
      )}
    </div>
  )

  if (!trigger) return inline

  return (
    <>
      {inline}
      <div className={cn(!inDropdownOnly && 'sm:hidden')}>
        <TableGroupingDropdown
          table={table}
          groups={groups}
          trigger={trigger}
          active={active}
          onGroup={changeGroup}
          onDirection={changeDirection}
        />
      </div>
    </>
  )
}

function TableGroupingDropdown({
  table,
  groups,
  trigger,
  active,
  onGroup,
  onDirection,
}: {
  table: TableSchema
  groups: NonNullable<TableSchema['groups']>
  trigger: TriggerButtonView
  active: string
  onGroup: (group: string) => void
  onDirection: (direction: string) => void
}) {
  const t = useT()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <TableTriggerButton
          view={trigger}
          defaultIcon={<Icon name="alfakit::tables.actions.group" fallback={LayersIcon} />}
          responsiveLabel={!table.triggerActions?.groupRecords}
          active={Boolean(table.grouping)}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuLabel>{t('table_grouping.group_by', {}, 'Group by')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={active} onValueChange={onGroup}>
          <DropdownMenuRadioItem value="">
            {t('table_grouping.none', {}, 'No grouping')}
          </DropdownMenuRadioItem>
          {groups.map((group) => (
            <DropdownMenuRadioItem key={group.id} value={group.id}>
              {group.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {table.grouping && !table.groupingDirectionSettingHidden && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>
              {t('table_grouping.direction', {}, 'Group direction')}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={table.grouping.direction} onValueChange={onDirection}>
              <DropdownMenuRadioItem value="asc">
                {t('table_grouping.ascending', {}, 'Ascending')}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="desc">
                {t('table_grouping.descending', {}, 'Descending')}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** A group heading row (`data-slot="table-group"`), with a collapse toggle when collapsible. */
export function GroupHeaderRow({
  group,
  collapsed,
  collapsible,
  colSpan,
  onToggle,
  selection,
}: {
  group: TableRecordGroupSchema
  collapsed: boolean
  collapsible: boolean
  colSpan: number
  onToggle: () => void
  /** `selectGroupsOnly()`: a checkbox selecting the group's records on the page. */
  selection?: { checked: boolean | 'indeterminate'; onChange: (checked: boolean) => void }
}) {
  const t = useT()
  const text = (
    <span className="flex flex-col items-start">
      <span className="font-medium">{group.title}</span>
      {group.description && (
        <span className="text-muted-foreground text-xs font-normal">{group.description}</span>
      )}
    </span>
  )
  // An enum group shows its `HasIcon` icon, in its `HasColor` colour, before the title.
  const content = group.icon ? (
    <span data-slot="table-group-title" className="flex items-center gap-2">
      <Icon
        name={group.icon}
        className={cn('size-4 shrink-0', colorClass(textColorClasses, group.color, 'gray'))}
        aria-hidden="true"
      />
      {text}
    </span>
  ) : (
    text
  )

  return (
    <TableRow data-slot="table-group" className="bg-muted/50 hover:bg-muted/50">
      <TableCell colSpan={colSpan} className="py-2">
        <span className="flex items-center gap-3">
          {selection && (
            <Checkbox
              checked={selection.checked}
              onCheckedChange={(checked) => selection.onChange(checked === true)}
              aria-label={t('table.select_group', { group: group.title }, 'Select group :group')}
            />
          )}
          {collapsible ? (
            <button
              type="button"
              className="focus-visible:ring-ring/50 flex items-center gap-2 rounded-sm text-start outline-none focus-visible:ring-[3px]"
              aria-expanded={!collapsed}
              aria-label={`${collapsed ? t('table_grouping.expand', {}, 'Expand group') : t('table_grouping.collapse', {}, 'Collapse group')}: ${group.title}`}
              onClick={onToggle}
            >
              {collapsed ? (
                <ChevronRightIcon className="size-4 shrink-0 rtl:rotate-180" aria-hidden="true" />
              ) : (
                <Icon
                  name="alfakit::tables.grouping.collapse-button"
                  fallback={ChevronDownIcon}
                  className="size-4 shrink-0"
                  aria-hidden="true"
                />
              )}
              {content}
            </button>
          ) : (
            content
          )}
        </span>
      </TableCell>
    </TableRow>
  )
}

/**
 * Collapsed group keys. Starts collapsed for `collapsedGroupsByDefault()` and resets when
 * the table is grouped differently.
 */
export function useCollapsedGroups(
  table: Pick<TableSchema, 'grouping' | 'recordGroups'>,
): [Set<string>, (key: string) => void] {
  const groupId = table.grouping ? `${table.grouping.group}:${table.grouping.direction}` : ''
  const [state, setState] = useState(() => ({
    groupId,
    collapsed: initialCollapsedGroups(table),
  }))

  if (state.groupId !== groupId) {
    setState({ groupId, collapsed: initialCollapsedGroups(table) })
  }

  return [
    state.collapsed,
    (key: string) =>
      setState((current) => ({
        ...current,
        collapsed: toggleCollapsedGroup(current.collapsed, key),
      })),
  ]
}

/** Register the table's session-persisted keys so cleared values are sent explicitly. */
export function useTablePersistence(table: Pick<TableSchema, 'identifier' | 'persistedState'>) {
  const keys = (table.persistedState ?? []).join(',')

  useEffect(
    () => registerTablePersistence(table.identifier, keys ? keys.split(',') : undefined),
    [table.identifier, keys],
  )
}

/** Number of cells in a row of `columns` plus leading and trailing cells. */
export function rowCellCount(columns: ColumnSchema[], leading: number, trailing: number): number {
  return columns.length + leading + trailing
}
