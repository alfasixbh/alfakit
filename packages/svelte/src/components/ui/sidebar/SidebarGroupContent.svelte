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
  data-slot="sidebar-group-content"
  data-sidebar="group-content"
  class={cn('w-full text-sm', className)}
  {...rest}
>
  {@render children?.()}
</div>
