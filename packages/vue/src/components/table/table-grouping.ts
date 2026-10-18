import type { TableSchema } from '@alfakit/core'
import {
  initialCollapsedGroups,
  registerTablePersistence,
  toggleCollapsedGroup,
} from '@alfakit/core'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

/**
 * Collapsed group keys. Starts collapsed for `collapsedGroupsByDefault()` and resets when
 * the table is grouped differently.
 */
export function useCollapsedGroups(table: () => TableSchema) {
  const collapsed = ref<Set<string>>(initialCollapsedGroups(table()))

  watch(
    () => {
      const grouping = table().grouping

      return grouping ? `${grouping.group}:${grouping.direction}` : ''
    },
    () => {
      collapsed.value = initialCollapsedGroups(table())
    },
  )

  const toggle = (key: string) => {
    collapsed.value = toggleCollapsedGroup(collapsed.value, key)
  }

  return { collapsed, toggle }
}

/**
 * Register the table's session-persisted keys so cleared values are sent explicitly.
 * Only in the browser (after mount), never during SSR.
 */
export function useTablePersistence(table: () => TableSchema) {
  let cleanup = () => {}
  let mounted = false

  const register = () => {
    cleanup()
    const keys = table().persistedState
    cleanup = registerTablePersistence(table().identifier, keys?.length ? [...keys] : undefined)
  }

  onMounted(() => {
    mounted = true
    register()
  })

  watch(
    () => `${table().identifier ?? ''}|${(table().persistedState ?? []).join(',')}`,
    () => mounted && register(),
  )

  onBeforeUnmount(() => cleanup())
}
