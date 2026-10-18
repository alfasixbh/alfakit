<script lang="ts">
  import { Tabs as TabsPrimitive } from 'bits-ui'
  import { cn } from '../../../lib/utils'

  let { ref = $bindable(null), class: className, ...rest }: TabsPrimitive.ListProps = $props()
</script>

<TabsPrimitive.List
  bind:ref
  data-slot="tabs-list"
  class={cn(
    'bg-muted text-muted-foreground inline-flex w-fit items-center justify-center rounded-lg p-[3px] data-[orientation=horizontal]:h-9 data-[orientation=vertical]:h-auto data-[orientation=vertical]:flex-col',
    className,
  )}
  {...rest}
/>
