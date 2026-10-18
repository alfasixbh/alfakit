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
  data-slot="alert-description"
  class={cn(
    'text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed',
    className,
  )}
  {...rest}
>
  {@render children?.()}
</div>
