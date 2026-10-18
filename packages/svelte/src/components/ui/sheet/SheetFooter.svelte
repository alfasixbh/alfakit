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

<div data-slot="sheet-footer" class={cn('mt-auto flex flex-col gap-2 p-4', className)} {...rest}>
  {@render children?.()}
</div>
