<script lang="ts">
  import { uniqueKey, valueKey } from '../../lib/keys'
  import type { ColorEntrySchema } from '@alfakit/core'
  import EntryLink from './EntryLink.svelte'
  import EntryPlaceholder from './EntryPlaceholder.svelte'
  import EntryWrapper from './EntryWrapper.svelte'
  import FormattedText from './FormattedText.svelte'

  let { component }: { component: ColorEntrySchema } = $props()

  const colors = $derived(
    Array.isArray(component.state) ? component.state : component.state ? [component.state] : [],
  )
</script>

<EntryWrapper entry={component}>
  {#if colors.length === 0}
    <EntryPlaceholder entry={component} />
  {:else}
    <EntryLink entry={component}>
      <div class="flex flex-wrap items-center gap-2">
        {#each colors as color, colorIndex (uniqueKey(colors, colorIndex, valueKey))}
          <span class="inline-flex items-center gap-1.5 text-sm">
            <span class="size-5 rounded border shadow-xs" style:background-color={color}></span>
            <!-- The code honours the entry's text styles and copy settings. -->
            {#if component.copyable}
              <FormattedText
                value={color}
                class="text-xs"
                schema={{
                  size: component.size,
                  weight: component.weight,
                  fontFamily: component.fontFamily ?? 'mono',
                  copyable: true,
                  copyMessage: component.copyMessage,
                  copyMessageDuration: component.copyMessageDuration,
                }}
              />
            {/if}
          </span>
        {/each}
      </div>
    </EntryLink>
  {/if}
</EntryWrapper>
