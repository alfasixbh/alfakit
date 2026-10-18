<script lang="ts">
  import { cn } from '../../lib/utils'

  /** A block's optional heading and introduction. */
  let {
    heading,
    intro,
    class: className,
  }: { heading?: string | null; intro?: string | null; class?: string } = $props()
</script>

{#if heading || intro}
  <div class={cn('mx-auto mb-10 max-w-2xl text-center', className)}>
    {#if heading}<h2 class="text-3xl font-semibold tracking-tight text-balance">{heading}</h2>{/if}
    {#if intro}<p class="text-muted-foreground mt-3 text-lg text-pretty">{intro}</p>{/if}
  </div>
{/if}
