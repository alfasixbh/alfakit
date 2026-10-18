<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import { cn } from '../../../lib/utils'

  let {
    class: className,
    children,
    ...rest
  }: HTMLAttributes<HTMLElement> & { children?: Snippet } = $props()
</script>

<div
  data-slot="sidebar-content"
  data-sidebar="content"
  class={cn(
    'flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden',
    className,
  )}
  {...rest}
>
  {@render children?.()}
</div>
