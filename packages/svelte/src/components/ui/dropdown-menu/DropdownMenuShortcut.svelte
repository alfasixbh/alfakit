<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements'
  import { cn } from '../../../lib/utils'

  let { class: className, children, ...rest }: HTMLAttributes<HTMLSpanElement> = $props()
</script>

<span
  data-slot="dropdown-menu-shortcut"
  class={cn('text-muted-foreground ms-auto text-xs tracking-widest', className)}
  {...rest}>{@render children?.()}</span
>
