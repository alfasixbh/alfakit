<script lang="ts">
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down'
  import { Select as SelectPrimitive } from 'bits-ui'
  import { cn } from '../../../lib/utils'

  let {
    ref = $bindable(null),
    class: className,
    size = 'default',
    children,
    ...rest
  }: SelectPrimitive.TriggerProps & { size?: 'sm' | 'default' } = $props()
</script>

<!-- Bits renders a plain button with aria-haspopup; the combobox role matches the other
     renderers and makes aria-required/aria-invalid valid on it. -->
<SelectPrimitive.Trigger
  bind:ref
  role="combobox"
  data-slot="select-trigger"
  data-size={size}
  class={cn(
    "border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[placeholder]:text-muted-foreground dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='text-'])]:text-muted-foreground flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none select-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    className,
  )}
  {...rest}
>
  {@render children?.()}
  <ChevronDownIcon class="size-4 opacity-50" />
</SelectPrimitive.Trigger>
