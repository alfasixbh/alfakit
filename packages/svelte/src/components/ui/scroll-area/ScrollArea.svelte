<script lang="ts">
  import { ScrollArea as ScrollAreaPrimitive } from 'bits-ui'
  import { useDirection } from '../../../context.svelte'
  import { cn } from '../../../lib/utils'

  let {
    ref = $bindable(null),
    class: className,
    orientation = 'vertical',
    dir,
    children,
    ...rest
  }: ScrollAreaPrimitive.RootProps & { orientation?: 'vertical' | 'horizontal' | 'both' } = $props()

  const direction = $derived(dir ?? useDirection())
</script>

<ScrollAreaPrimitive.Root
  bind:ref
  data-slot="scroll-area"
  dir={direction}
  class={cn('relative', className)}
  {...rest}
>
  <ScrollAreaPrimitive.Viewport
    data-slot="scroll-area-viewport"
    class="focus-visible:ring-ring/50 size-full max-h-[inherit] rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px]"
  >
    {@render children?.()}
  </ScrollAreaPrimitive.Viewport>
  {#if orientation === 'vertical' || orientation === 'both'}
    <ScrollAreaPrimitive.Scrollbar
      orientation="vertical"
      class="flex h-full w-2.5 touch-none border-s border-s-transparent p-px transition-colors select-none"
    >
      <ScrollAreaPrimitive.Thumb class="bg-border relative flex-1 rounded-full" />
    </ScrollAreaPrimitive.Scrollbar>
  {/if}
  {#if orientation === 'horizontal' || orientation === 'both'}
    <ScrollAreaPrimitive.Scrollbar
      orientation="horizontal"
      class="flex h-2.5 touch-none flex-col border-t border-t-transparent p-px transition-colors select-none"
    >
      <ScrollAreaPrimitive.Thumb class="bg-border relative flex-1 rounded-full" />
    </ScrollAreaPrimitive.Scrollbar>
  {/if}
  <ScrollAreaPrimitive.Corner />
</ScrollAreaPrimitive.Root>
