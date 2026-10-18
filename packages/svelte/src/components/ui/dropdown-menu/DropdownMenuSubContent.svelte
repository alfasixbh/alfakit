<script lang="ts">
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui'
  import { useDirection } from '../../../context.svelte'
  import { cn } from '../../../lib/utils'

  let {
    ref = $bindable(null),
    class: className,
    dir,
    ...rest
  }: DropdownMenuPrimitive.SubContentProps = $props()

  // bits-ui lays floating content out left to right unless told otherwise.
  const direction = $derived(dir ?? useDirection())
</script>

<DropdownMenuPrimitive.SubContent
  dir={direction}
  bind:ref
  data-slot="dropdown-menu-sub-content"
  class={cn(
    'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 z-50 min-w-[8rem] origin-(--bits-dropdown-menu-content-transform-origin) overflow-hidden rounded-md border p-1 shadow-lg',
    className,
  )}
  {...rest}
/>
