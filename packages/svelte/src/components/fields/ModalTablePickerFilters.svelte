<script lang="ts">
  import type { TableSchema } from '@alfakit/core'
  import { FormStore, filterFormComponents, pickerFilterFormOptions } from '@alfakit/core'
  import { onDestroy, untrack } from 'svelte'
  import { useT } from '../../context.svelte'
  import { useStore } from '../../hooks/store.svelte'
  import FormProvider from '../form/FormProvider.svelte'
  import SchemaRenderer from '../schema/SchemaRenderer.svelte'
  import { Button } from '../ui/button'

  let {
    table,
    owner,
    path,
    onchange,
  }: {
    table: TableSchema
    owner: FormStore
    path: string
    onchange: (filters: Record<string, Record<string, unknown>> | null) => void
  } = $props()

  /**
   * The picker's filters: a small form whose state becomes the table's `filters`. Searchable
   * selects among them load options through the owning form's endpoint (`pickerFilters`).
   */
  const t = useT()
  const components = untrack(() => filterFormComponents(table.filters ?? []))
  const store = untrack(
    () =>
      new FormStore(
        {
          components,
          state: table.filterState ?? {},
          columns: table.filtersFormColumns ?? { default: 1, sm: 2 },
        },
        pickerFilterFormOptions(owner, path),
      ),
  )
  const state = useStore(store.store)

  $effect(() => {
    const { values, dirty } = state.current

    if (!dirty.size) return

    const timer = setTimeout(() => onchange(values as Record<string, Record<string, unknown>>), 400)

    return () => clearTimeout(timer)
  })

  const reset = () => {
    store.fill({ components, state: {}, columns: state.current.columns })
    onchange(null)
  }

  onDestroy(() => store.destroy())
</script>

<FormProvider {store}>
  <div class="bg-muted/30 flex flex-col gap-2 rounded-lg border p-3">
    <SchemaRenderer
      components={state.current.components}
      columns={state.current.columns}
      class="gap-3"
    />
    {#if (table.filterIndicators?.length ?? 0) > 0}
      <Button type="button" variant="link" size="sm" class="self-end" onclick={reset}
        >{t('table.reset_filters', {}, 'Reset')}</Button
      >
    {/if}
  </div>
</FormProvider>
