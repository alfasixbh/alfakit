import type { FormStore } from './form'
import type { SchemaComponent } from './schema/components'
import type { FormPayload } from './schema/form'
import type { FilterSchema } from './schema/table'

/**
 * Keeps a table's filter form in step with the filter state the server renders.
 *
 * The form pushes its values into the query string; every response then carries the
 * server's view of the filters. Server state replaces the form values only while the form
 * holds nothing the server has not seen yet (the values it last received or pushed), so
 * text typed while a request is in flight survives, and filters removed elsewhere (an
 * indicator, the reset link) disappear from the form.
 */
export class FilterFormSync {
  private baseline: string

  constructor(private readonly store: FormStore) {
    this.baseline = serialize(store.state.values)
  }

  /** Record the values that were just sent to the server. */
  pushed(values: Record<string, unknown>): void {
    this.baseline = serialize(values)
  }

  /** True when the form holds edits that have not been pushed yet. */
  get hasUnsentChanges(): boolean {
    return serialize(this.store.state.values) !== this.baseline
  }

  /** Throw away unsent edits and show the server's filter state again. */
  discard(payload: {
    components: SchemaComponent[]
    state: Record<string, unknown> | null | undefined
    columns?: FormPayload['columns']
  }): void {
    const state = payload.state ?? {}
    this.store.fill({ components: payload.components, state, columns: payload.columns })
    this.baseline = serialize(state)
  }

  /** Apply a fresh server payload (filter schema and state). */
  receive(payload: {
    components: SchemaComponent[]
    state: Record<string, unknown> | null | undefined
    columns?: FormPayload['columns']
  }): void {
    if (this.hasUnsentChanges) {
      // Keep the user's input; only pick up schema changes (options, visibility).
      this.store.store.update({
        components: payload.components,
        ...(payload.columns ? { columns: payload.columns } : {}),
      })

      return
    }

    const state = payload.state ?? {}
    this.store.fill({ components: payload.components, state, columns: payload.columns })
    this.baseline = serialize(state)
  }
}

/**
 * Whether a table's filters form waits for an "Apply" button: deferred tables, and the
 * modal layout (a dialog is confirmed or dismissed as a whole).
 */
export function filtersAreDeferred(table: {
  deferFilters?: boolean
  filtersLayout: string
}): boolean {
  return Boolean(table.deferFilters) || table.filtersLayout === 'modal'
}

function serialize(values: unknown): string {
  return JSON.stringify(values ?? {})
}

/**
 * The filters form's components: each filter's fields, wrapped in a Group carrying the
 * filter's `columnSpan()` so all of its fields span together.
 */
export function filterFormComponents(filters: FilterSchema[]): SchemaComponent[] {
  return filters.flatMap((filter): SchemaComponent[] =>
    filter.columnSpan
      ? [
          {
            type: 'Group',
            key: `filter:${filter.name}`,
            columnSpan: filter.columnSpan,
            schema: filter.schema,
          },
        ]
      : filter.schema,
  )
}
