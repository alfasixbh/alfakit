<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLThAttributes } from 'svelte/elements'
  import { cn } from '../../../lib/utils'

  let { class: className, children, ...rest }: HTMLThAttributes & { children?: Snippet } = $props()
</script>

<th
  data-slot="table-head"
  class={cn(
    'text-foreground h-10 px-2 text-start align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pe-0 [&>[role=checkbox]]:translate-y-[2px]',
    className,
  )}
  {...rest}
>
  {@render children?.()}
</th>
