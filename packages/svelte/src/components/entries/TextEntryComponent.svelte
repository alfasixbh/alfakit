<script lang="ts">
  import type { TextEntrySchema } from '@alfakit/core'
  import { Link } from '@inertiajs/svelte'
  import EntryPlaceholder from './EntryPlaceholder.svelte'
  import EntryWrapper from './EntryWrapper.svelte'
  import FormattedText from './FormattedText.svelte'
  import NewTabHint from '../../lib/NewTabHint.svelte'

  let { component }: { component: TextEntrySchema } = $props()
</script>

<EntryWrapper entry={component}>
  {#if component.state === null || component.state === undefined}
    <EntryPlaceholder entry={component} />
  {:else if component.url && component.openUrlInNewTab}
    <a href={component.url} target="_blank" rel="noopener noreferrer" class="hover:underline"
      ><FormattedText value={component.state} schema={component} /><NewTabHint /></a
    >
  {:else if component.url}
    <Link href={component.url} class="hover:underline"
      ><FormattedText value={component.state} schema={component} /></Link
    >
  {:else}
    <FormattedText value={component.state} schema={component} />
  {/if}
</EntryWrapper>
