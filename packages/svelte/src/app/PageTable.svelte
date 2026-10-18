<script lang="ts">
  import type { Snippet } from 'svelte'
  import PageBlock from './PageBlock.svelte'

  /** A table defined by `{name}Table(Table $table)` (or the page's `table()` without a name). */
  let {
    name,
    class: className,
    fallback,
  }: { name?: string; class?: string; fallback?: Snippet } = $props()
</script>

<PageBlock name={name ? `table:${name}` : 'table'} class={className} {fallback} />
