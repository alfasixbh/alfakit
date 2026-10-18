<script lang="ts">
  import type { Snippet } from 'svelte'
  import PageBlock from './PageBlock.svelte'

  /** The page's header (default) or footer widgets. */
  let {
    position = 'header',
    class: className,
    fallback,
  }: { position?: 'header' | 'footer'; class?: string; fallback?: Snippet } = $props()
</script>

<PageBlock
  name={position === 'footer' ? 'footerWidgets' : 'headerWidgets'}
  class={className}
  {fallback}
/>
