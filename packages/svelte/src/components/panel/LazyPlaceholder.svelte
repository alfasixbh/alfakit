<script lang="ts">
  import { useT } from '../../context.svelte'
  import { cn } from '../../lib/utils'
  import { Skeleton } from '../ui/skeleton'

  /**
   * Stands in for a lazy widget or relation manager until the `alfakitLazy` deferred prop
   * brings its schema. `table` mimics a table (relation managers, table widgets).
   */
  let { variant = 'widget', class: className }: { variant?: 'widget' | 'table'; class?: string } =
    $props()

  const t = useT()
</script>

<div
  data-slot="lazy-placeholder"
  data-variant={variant}
  role="status"
  aria-busy="true"
  class={cn('bg-card flex flex-col gap-3 rounded-xl border p-6', className)}
>
  <span class="sr-only">{t('loading', {}, 'Loading…')}</span>
  <Skeleton class="h-5 w-1/3" />
  {#if variant === 'table'}
    <Skeleton class="h-9 w-full" />
    <Skeleton class="h-9 w-full" />
    <Skeleton class="h-9 w-full" />
  {:else}
    <Skeleton class="h-20 w-full" />
  {/if}
</div>
