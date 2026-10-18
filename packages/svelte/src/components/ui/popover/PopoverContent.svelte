<script lang="ts">
  import { Popover as PopoverPrimitive } from 'bits-ui'
  import { useDirection } from '../../../context.svelte'
  import { cn } from '../../../lib/utils'

  let {
    ref = $bindable(null),
    class: className,
    sideOffset = 4,
    align = 'center',
    dir,
    portalProps,
    ...rest
  }: PopoverPrimitive.ContentProps & { portalProps?: PopoverPrimitive.PortalProps } = $props()

  // bits-ui lays floating content out left to right unless told otherwise.
  const direction = $derived(dir ?? useDirection())
</script>

<PopoverPrimitive.Portal {...portalProps}>
  <PopoverPrimitive.Content
    bind:ref
    data-slot="popover-content"
    {sideOffset}
    {align}
    dir={direction}
    class={cn(
      'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 z-50 w-72 origin-(--bits-popover-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden',
      className,
    )}
    {...rest}
  />
</PopoverPrimitive.Portal>
