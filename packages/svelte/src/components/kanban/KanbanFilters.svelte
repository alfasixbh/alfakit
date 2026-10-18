<script lang="ts">
  import type { FormStore, KanbanController } from '@alfakit/core'
  import { kanbanActiveFilters } from '@alfakit/core'
  import FunnelIcon from '@lucide/svelte/icons/funnel'
  import { untrack } from 'svelte'
  import { useT } from '../../context.svelte'
  import { useStore } from '../../hooks/store.svelte'
  import FormProvider from '../form/FormProvider.svelte'
  import SchemaRenderer from '../schema/SchemaRenderer.svelte'
  import { Badge } from '../ui/badge'
  import { Button } from '../ui/button'
  import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'

  let { controller, store }: { controller: KanbanController; store: FormStore } = $props()

  const t = useT()
  const form = useStore(untrack(() => store.store))
  const initial = untrack(() => ({
    components: store.state.components,
    state: store.state.values,
    columns: store.state.columns,
  }))
  const active = $derived(kanbanActiveFilters(form.current.values))

  $effect(() => {
    const { values, dirty } = form.current

    if (dirty.size > 0) untrack(() => controller.setFilters(values))
  })

  function reset() {
    store.fill(initial)
    controller.setFilters(null, 0)
  }
</script>

<Popover>
  <PopoverTrigger>
    {#snippet child({ props })}
      <Button type="button" variant="outline" size="sm" data-slot="kanban-filters" {...props}>
        <FunnelIcon aria-hidden="true" />
        {t('kanban.filters', {}, 'Filters')}
        {#if active > 0}<Badge class="h-5 min-w-5 px-1">{active}</Badge>{/if}
      </Button>
    {/snippet}
  </PopoverTrigger>
  <PopoverContent align="end" class="w-80 sm:w-96">
    <FormProvider {store}>
      <div class="flex flex-col gap-4">
        <SchemaRenderer
          components={form.current.components}
          columns={form.current.columns}
          class="gap-4"
        />
        {#if active > 0}
          <div class="flex justify-end">
            <Button type="button" variant="link" size="sm" onclick={reset}>
              {t('kanban.reset_filters', {}, 'Reset')}
            </Button>
          </div>
        {/if}
      </div>
    </FormProvider>
  </PopoverContent>
</Popover>
