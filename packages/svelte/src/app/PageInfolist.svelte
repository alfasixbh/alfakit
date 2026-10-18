<script lang="ts">
  import type { Snippet } from 'svelte'
  import PageBlock from './PageBlock.svelte'

  /** An infolist defined by `{name}Infolist(Schema $schema)` (or the page's `infolist()`). */
  let {
    name,
    class: className,
    fallback,
  }: { name?: string; class?: string; fallback?: Snippet } = $props()
</script>

<PageBlock name={name ? `infolist:${name}` : 'infolist'} class={className} {fallback} />
