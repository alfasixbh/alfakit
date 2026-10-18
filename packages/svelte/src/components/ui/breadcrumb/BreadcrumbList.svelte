<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import { cn } from '../../../lib/utils'

  let {
    class: className,
    children,
    ...rest
  }: HTMLAttributes<HTMLOListElement> & { children?: Snippet } = $props()
</script>

<ol
  data-slot="breadcrumb-list"
  class={cn(
    'text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5',
    className,
  )}
  {...rest}
>
  {@render children?.()}
</ol>
