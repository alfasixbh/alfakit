<script lang="ts">
  import { resolveLazyComponents } from '@alfakit/core'
  import type { Snippet } from 'svelte'
  import { useAlfakitProps } from '../context.svelte'
  import { cn } from '../lib/utils'
  import ContentBlockRenderer from '../pages/ContentBlockRenderer.svelte'

  /**
   * Render any content block of the page by key (`form:customer`, `table:products`,
   * `infolist:summary`, `form`, `table`, `content`…); `fallback` when it has none.
   */
  let {
    name,
    class: className,
    fallback,
  }: { name: string; class?: string; fallback?: Snippet } = $props()

  const block = $derived.by(() => {
    const props = useAlfakitProps()
    const page = props.page ? resolveLazyComponents(props.page, props.alfakitLazy) : undefined

    return page?.content.find((candidate) => candidate.key === name)
  })
</script>

{#if block}
  <div data-slot="page-block" data-block={name} class={cn('min-w-0', className)}>
    <ContentBlockRenderer {block} />
  </div>
{:else}
  {@render fallback?.()}
{/if}
