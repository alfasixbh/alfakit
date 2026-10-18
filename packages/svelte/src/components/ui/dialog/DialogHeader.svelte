<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import { cn } from '../../../lib/utils'

  let {
    class: className,
    children,
    ...rest
  }: HTMLAttributes<HTMLDivElement> & { children?: Snippet } = $props()
</script>

<div
  data-slot="dialog-header"
  class={cn('flex flex-col gap-2 text-center sm:text-start', className)}
  {...rest}
>
  {@render children?.()}
</div>
