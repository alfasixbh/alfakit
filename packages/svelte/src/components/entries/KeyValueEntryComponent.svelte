<script lang="ts">
  import type { KeyValueEntrySchema } from '@alfakit/core'
  import EntryPlaceholder from './EntryPlaceholder.svelte'
  import EntryWrapper from './EntryWrapper.svelte'

  let { component }: { component: KeyValueEntrySchema } = $props()

  const entries = $derived(Object.entries(component.state ?? {}))
</script>

<EntryWrapper entry={component}>
  {#if entries.length === 0}
    <EntryPlaceholder entry={component} />
  {:else}
    <div class="overflow-hidden rounded-md border">
      <table class="w-full text-sm">
        <thead class="bg-muted/50 text-muted-foreground text-xs">
          <tr>
            <th class="px-3 py-1.5 text-start font-medium">{component.keyLabel}</th>
            <th class="px-3 py-1.5 text-start font-medium">{component.valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {#each entries as [key, value] (key)}
            <tr class="border-t">
              <td class="px-3 py-1.5 font-medium">{key}</td>
              <td class="px-3 py-1.5"
                >{typeof value === 'object' ? JSON.stringify(value) : String(value)}</td
              >
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</EntryWrapper>
