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

<ul
  data-slot="sidebar-menu"
  data-sidebar="menu"
  class={cn('flex w-full min-w-0 flex-col gap-1', className)}
  {...rest}
>
  {@render children?.()}
</ul>
