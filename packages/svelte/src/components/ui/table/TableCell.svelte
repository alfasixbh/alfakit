<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLTdAttributes } from 'svelte/elements'
  import { cn } from '../../../lib/utils'

  let { class: className, children, ...rest }: HTMLTdAttributes & { children?: Snippet } = $props()
</script>

<td
  data-slot="table-cell"
  class={cn(
    'p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pe-0 [&>[role=checkbox]]:translate-y-[2px]',
    className,
  )}
  {...rest}
>
  {@render children?.()}
</td>
