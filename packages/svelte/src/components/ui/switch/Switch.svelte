<script lang="ts">
  import { Switch as SwitchPrimitive } from 'bits-ui'
  import { cn } from '../../../lib/utils'

  let {
    ref = $bindable(null),
    checked = $bindable(false),
    class: className,
    ...rest
  }: Omit<SwitchPrimitive.RootProps, 'children'> = $props()
</script>

<SwitchPrimitive.Root
  bind:ref
  bind:checked
  data-slot="switch"
  class={cn(
    'peer focus-visible:border-ring focus-visible:ring-ring/50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
    className,
  )}
  {...rest}
>
  <SwitchPrimitive.Thumb
    data-slot="switch-thumb"
    class="bg-background dark:data-[state=checked]:bg-primary-foreground dark:data-[state=unchecked]:bg-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0 rtl:data-[state=checked]:-translate-x-[calc(100%-2px)]"
  />
</SwitchPrimitive.Root>
