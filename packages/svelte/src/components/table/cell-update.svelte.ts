import type { CellSchema, ColumnSchema, RecordKey } from '@alfakit/core'
import { resolvePartialProps, updateTableCell } from '@alfakit/core'
import { router } from '@inertiajs/svelte'
import { untrack } from 'svelte'
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

      return true
    } catch (caught) {
      const errors = (caught as { errors?: Record<string, string[]> }).errors
      error = errors?.state?.[0] ?? (caught as Error).message

      return false
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

/**
 * Keep an editable cell's local value in step with the server: `apply` runs when the
 * server's value changes. The row (keyed by its record) outlives reloads, so a value changed
 * by an action, a poll or another user must replace the local one.
 */
export function followCellState<T>(server: () => T, apply: (value: T) => void): void {
  let seen = untrack(server)

  $effect.pre(() => {
    const next = server()

    if (!Object.is(next, seen)) {
      seen = next
      apply(next)
    }
  })
}

export const cellText = (state: unknown): string =>
  state === null || state === undefined ? '' : String(state)
