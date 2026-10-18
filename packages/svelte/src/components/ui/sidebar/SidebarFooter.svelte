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
  data-slot="sidebar-footer"
  data-sidebar="footer"
  class={cn('flex flex-col gap-2 p-2', className)}
  {...rest}
>
  {@render children?.()}
</div>
