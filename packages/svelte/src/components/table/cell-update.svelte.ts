import type { CellSchema, ColumnSchema, RecordKey } from '@alfakit/core'
import { resolvePartialProps, updateTableCell } from '@alfakit/core'
import { router } from '@inertiajs/svelte'
import { usePanel } from '../../context.svelte'

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

/** Persist an inline cell edit and reload the page props. */
export function useCellUpdate(
  props: () => Pick<CellProps, 'recordKey' | 'column' | 'token' | 'component'>,
) {
  let saving = $state(false)
  let error = $state<string | null>(null)

  const update = async (state: unknown) => {
    const panel = usePanel()
    const { recordKey, column, token, component } = props()

    if (!panel.endpoints.tableCell || !panel.endpoints.tableReorder) return

    saving = true
    error = null

    try {
      await updateTableCell(
        { cell: panel.endpoints.tableCell, reorder: panel.endpoints.tableReorder },
        token,
        component,
        recordKey,
        column.name,
        state,
      )
      router.reload({ only: resolvePartialProps(['page']) })
    } catch (caught) {
      const errors = (caught as { errors?: Record<string, string[]> }).errors
      error = errors?.state?.[0] ?? (caught as Error).message
    } finally {
      saving = false
    }
  }

  return {
    update,
    get saving() {
      return saving
    },
    get error() {
      return error
    },
  }
}
