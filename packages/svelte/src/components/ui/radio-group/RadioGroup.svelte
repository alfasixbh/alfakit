<script lang="ts">
  import { RadioGroup as RadioGroupPrimitive } from 'bits-ui'
  import { cn } from '../../../lib/utils'

  let {
    ref = $bindable(null),
    value = $bindable(''),
    class: className,
    ...rest
  }: RadioGroupPrimitive.RootProps = $props()
</script>

<RadioGroupPrimitive.Root
  bind:ref
  bind:value
  data-slot="radio-group"
  class={cn('grid gap-3', className)}
  {...rest}
/>
