import type { CellSchema, ColumnSchema, RecordKey } from '@alfakit/core'
import { resolvePartialProps, updateTableCell } from '@alfakit/core'
import { router } from '@inertiajs/vue3'
import { ref, watch, type Ref } from 'vue'
import { usePanel } from '../../context'

export interface CellProps {
  column: ColumnSchema
  cell: CellSchema
  recordKey: RecordKey
  token: string
  component: string
  /**
   * Set when this renderer was picked from the registry (`column:<type>`): it then renders
   * the built-in cell instead of looking itself up again, so an ejected `TableCellContent`
   * registered for a column type doesn't render itself forever.
   */
  fromRegistry?: boolean
}

export function useCellUpdate(props: CellProps) {
  const panel = usePanel()
  const saving = ref(false)
  const error = ref<string | null>(null)

  const update = async (state: unknown) => {
    if (!panel.value.endpoints.tableCell || !panel.value.endpoints.tableReorder) return

    saving.value = true
    error.value = null

    try {
      await updateTableCell(
        { cell: panel.value.endpoints.tableCell, reorder: panel.value.endpoints.tableReorder },
        props.token,
        props.component,
        props.recordKey,
        props.column.name,
        state,
      )
      router.reload({ only: resolvePartialProps(['page']) })

      return true
    } catch (caught) {
      const errors = (caught as { errors?: Record<string, string[]> }).errors
      error.value = errors?.state?.[0] ?? (caught as Error).message

      return false
    } finally {
      saving.value = false
    }
  }

  return { update, saving, error }
}

/**
 * An editable cell's value: what the user picked, until the server sends another one. The
 * row (keyed by its record) outlives reloads, so a value changed by an action, a poll or
 * another user must replace the local one.
 */
export function useCellState<T>(server: () => T): Ref<T> {
  const value = ref(server()) as Ref<T>

  watch(server, (next) => {
    value.value = next
  })

  return value
}

export const cellText = (state: unknown): string =>
  state === null || state === undefined ? '' : String(state)
