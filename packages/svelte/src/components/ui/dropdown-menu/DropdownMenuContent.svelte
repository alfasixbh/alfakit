<script lang="ts">
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui'
  import { useDirection } from '../../../context.svelte'
  import { cn } from '../../../lib/utils'

  let {
    ref = $bindable(null),
    class: className,
    dir,
    sideOffset = 4,
    portalProps,
    ...rest
  }: DropdownMenuPrimitive.ContentProps & {
    portalProps?: DropdownMenuPrimitive.PortalProps
  } = $props()

  // bits-ui lays floating content out left to right unless told otherwise.
  const direction = $derived(dir ?? useDirection())
</script>

<DropdownMenuPrimitive.Portal {...portalProps}>
  <DropdownMenuPrimitive.Content
    dir={direction}
    bind:ref
    data-slot="dropdown-menu-content"
    {sideOffset}
    class={cn(
      'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 z-50 max-h-(--bits-dropdown-menu-content-available-height) min-w-[8rem] origin-(--bits-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md outline-none',
      className,
    )}
    {...rest}
  />
</DropdownMenuPrimitive.Portal>
