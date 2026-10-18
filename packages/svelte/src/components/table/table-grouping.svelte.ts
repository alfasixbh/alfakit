import type { TableSchema } from '@alfakit/core'
import {
  initialCollapsedGroups,
  registerTablePersistence,
  toggleCollapsedGroup,
} from '@alfakit/core'
import { untrack } from 'svelte'

/**
 * Collapsed group keys. Starts collapsed for `collapsedGroupsByDefault()` and resets when
 * the table is grouped differently.
 */
export function useCollapsedGroups(table: () => TableSchema) {
  const groupingKey = () => {
    const grouping = table().grouping

    return grouping ? `${grouping.group}:${grouping.direction}` : ''
  }

  let collapsed = $state(untrack(() => initialCollapsedGroups(table())))
  let syncedKey = untrack(groupingKey)

  $effect.pre(() => {
    const key = groupingKey()

    if (key !== syncedKey) {
      syncedKey = key
      collapsed = untrack(() => initialCollapsedGroups(table()))
    }
  })

  return {
    get collapsed() {
      return collapsed
    },
    toggle(key: string) {
      collapsed = toggleCollapsedGroup(collapsed, key)
    },
  }
}

/** Register the table's session-persisted keys so cleared values are sent explicitly. */
export function useTablePersistence(table: () => TableSchema) {
  $effect(() => {
    const identifier = table().identifier
    const keys = (table().persistedState ?? []).join(',')

    return registerTablePersistence(identifier, keys ? keys.split(',') : undefined)
  })
}
