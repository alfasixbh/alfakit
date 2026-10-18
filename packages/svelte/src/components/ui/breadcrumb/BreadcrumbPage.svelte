<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import { cn } from '../../../lib/utils'

  let {
    class: className,
    children,
    ...rest
  }: HTMLAttributes<HTMLSpanElement> & { children?: Snippet } = $props()
</script>

<span
  data-slot="breadcrumb-page"
  role="link"
  aria-disabled="true"
  aria-current="page"
  class={cn('text-foreground font-normal', className)}
  {...rest}
>
  {@render children?.()}
</span>
