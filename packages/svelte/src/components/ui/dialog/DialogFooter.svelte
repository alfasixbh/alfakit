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
  data-slot="dialog-footer"
  class={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
  {...rest}
>
  {@render children?.()}
</div>
