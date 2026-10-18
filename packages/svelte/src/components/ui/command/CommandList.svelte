<script lang="ts">
  import { Command as CommandPrimitive } from 'bits-ui'
  import { cn } from '../../../lib/utils'

  let { ref = $bindable(null), class: className, ...rest }: CommandPrimitive.ListProps = $props()
</script>

<CommandPrimitive.List
  bind:ref
  data-slot="command-list"
  class={cn('max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto', className)}
  {...rest}
/>
