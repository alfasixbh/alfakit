<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import { cn } from '../../../lib/utils'

  let {
    class: className,
    inset,
    children,
    ...rest
  }: HTMLAttributes<HTMLDivElement> & { inset?: boolean; children?: Snippet } = $props()
</script>

<div
  data-slot="dropdown-menu-label"
  data-inset={inset}
  class={cn('px-2 py-1.5 text-sm font-medium data-[inset]:ps-8', className)}
  {...rest}
>
  {@render children?.()}
</div>
