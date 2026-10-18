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
  data-slot="sidebar-menu-item"
  data-sidebar="menu-item"
  class={cn('group/menu-item relative', className)}
  {...rest}
>
  {@render children?.()}
</li>
