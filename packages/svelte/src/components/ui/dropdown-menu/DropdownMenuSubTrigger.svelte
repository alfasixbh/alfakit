<script lang="ts">
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui'
  import { cn } from '../../../lib/utils'

  let {
    ref = $bindable(null),
    class: className,
    inset,
    children,
    ...rest
  }: DropdownMenuPrimitive.SubTriggerProps & { inset?: boolean } = $props()
</script>

<DropdownMenuPrimitive.SubTrigger
  bind:ref
  data-slot="dropdown-menu-sub-trigger"
  data-inset={inset}
  class={cn(
    "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:ps-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    className,
  )}
  {...rest}
>
  {@render children?.()}
  <ChevronRightIcon class="ms-auto size-4 rtl:rotate-180" />
</DropdownMenuPrimitive.SubTrigger>
