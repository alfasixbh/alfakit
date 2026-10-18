<script lang="ts">
  import { Tooltip as TooltipPrimitive } from 'bits-ui'
  import { useDirection } from '../../../context.svelte'
  import { cn } from '../../../lib/utils'

  let {
    ref = $bindable(null),
    class: className,
    dir,
    sideOffset = 4,
    children,
    ...rest
  }: TooltipPrimitive.ContentProps = $props()

  // bits-ui lays floating content out left to right unless told otherwise.
  const direction = $derived(dir ?? useDirection())
</script>

<TooltipPrimitive.Portal>
  <TooltipPrimitive.Content
    dir={direction}
    bind:ref
    data-slot="tooltip-content"
    {sideOffset}
    class={cn(
      'bg-foreground text-background animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 z-50 w-fit max-w-xs origin-(--bits-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance',
      className,
    )}
    {...rest}
  >
    {@render children?.()}
    <TooltipPrimitive.Arrow
      class="fill-foreground bg-foreground z-50 size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-[2px]"
    />
  </TooltipPrimitive.Content>
</TooltipPrimitive.Portal>
