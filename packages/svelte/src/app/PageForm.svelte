<script lang="ts">
  import type { Snippet } from 'svelte'
  import PageBlock from './PageBlock.svelte'

  /** A form defined by `{name}Form(Schema $schema)` (or the page's `form()` without a name). */
  let {
    name,
    class: className,
    fallback,
  }: { name?: string; class?: string; fallback?: Snippet } = $props()
</script>

<PageBlock name={name ? `form:${name}` : 'form'} class={className} {fallback} />
