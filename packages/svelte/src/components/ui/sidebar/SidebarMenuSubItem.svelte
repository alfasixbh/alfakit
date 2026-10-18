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

<li
  data-slot="sidebar-menu-sub-item"
  data-sidebar="menu-sub-item"
  class={cn('group/menu-sub-item relative', className)}
  {...rest}
>
  {@render children?.()}
</li>
