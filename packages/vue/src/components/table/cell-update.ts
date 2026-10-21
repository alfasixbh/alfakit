import type { CellSchema, ColumnSchema, RecordKey } from '@alfakit/core'
import { resolvePartialProps, updateTableCell } from '@alfakit/core'
import { router } from '@inertiajs/vue3'
import { ref } from 'vue'
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
    } catch (caught) {
      const errors = (caught as { errors?: Record<string, string[]> }).errors
      error.value = errors?.state?.[0] ?? (caught as Error).message
    } finally {
      saving.value = false
    }
  }

  return { update, saving, error }
}
