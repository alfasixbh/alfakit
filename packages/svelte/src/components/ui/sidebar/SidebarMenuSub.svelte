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
  data-slot="sidebar-menu-sub"
  data-sidebar="menu-sub"
  class={cn(
    'border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-s px-2.5 py-0.5 group-data-[collapsible=icon]:hidden rtl:-translate-x-px',
    className,
  )}
  {...rest}
>
  {@render children?.()}
</ul>
