<script lang="ts">
  import { Tabs as TabsPrimitive } from 'bits-ui'
  import { cn } from '../../../lib/utils'

  let {
    ref = $bindable(null),
    value = $bindable(''),
    class: className,
    ...rest
  }: TabsPrimitive.RootProps = $props()
</script>

<TabsPrimitive.Root
  bind:ref
  bind:value
  data-slot="tabs"
  class={cn('flex gap-2 data-[orientation=horizontal]:flex-col', className)}
  {...rest}
/>
