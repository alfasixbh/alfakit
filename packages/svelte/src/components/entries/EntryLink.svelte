<script lang="ts">
  import type { BaseEntry } from '@alfakit/core'
  import { Link } from '@inertiajs/svelte'
  import type { Snippet } from 'svelte'
  import NewTabHint from '../../lib/NewTabHint.svelte'

  /** Wrap an entry's content in its `url()` link (icon, image and colour entries). */
  let { entry, children }: { entry: BaseEntry; children: Snippet } = $props()
</script>

{#if entry.url && entry.openUrlInNewTab}
  <a href={entry.url} target="_blank" rel="noopener noreferrer" class="inline-flex w-fit"
    >{@render children()}<NewTabHint /></a
  >
{:else if entry.url}
  <Link href={entry.url} class="inline-flex w-fit">{@render children()}</Link>
{:else}
  {@render children()}
{/if}
