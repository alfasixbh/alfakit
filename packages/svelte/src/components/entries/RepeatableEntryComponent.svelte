<script lang="ts">
  import type { RepeatableEntrySchema } from '@alfakit/core'
  import { gridColumnsClasses } from '@alfakit/core'
  import { cn } from '../../lib/utils'
  import SchemaRenderer from '../schema/SchemaRenderer.svelte'
  import EntryPlaceholder from './EntryPlaceholder.svelte'
  import EntryWrapper from './EntryWrapper.svelte'
  import RepeatableEntryTable from './RepeatableEntryTable.svelte'

  let { component }: { component: RepeatableEntrySchema } = $props()
</script>

<EntryWrapper entry={component}>
  {#if component.items.length === 0}
    <EntryPlaceholder entry={component} />
  {:else if component.table?.length}
    <RepeatableEntryTable columns={component.table} items={component.items} />
  {:else}
    <div class={cn('grid gap-3', component.grid && gridColumnsClasses(component.grid))}>
      {#each component.items as item, index (index)}
        <div class={cn(component.contained && 'bg-card rounded-lg border p-4 shadow-xs')}>
          <div class="contents">
            <SchemaRenderer
              components={item}
              columns={component.columns ?? { default: 1, lg: 2 }}
              class="gap-4"
            />
          </div>
        </div>
      {/each}
    </div>
  {/if}
</EntryWrapper>
