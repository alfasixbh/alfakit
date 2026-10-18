<script lang="ts">
  import CircleIcon from '@lucide/svelte/icons/circle'
  import { RadioGroup as RadioGroupPrimitive } from 'bits-ui'
  import { cn } from '../../../lib/utils'

  let {
    ref = $bindable(null),
    class: className,
    ...rest
  }: Omit<RadioGroupPrimitive.ItemProps, 'children'> = $props()
</script>

<RadioGroupPrimitive.Item
  bind:ref
  data-slot="radio-group-item"
  class={cn(
    'border-input text-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:ring-destructive/40 aspect-square size-4 shrink-0 rounded-full border shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
    className,
  )}
  {...rest}
>
  {#snippet children({ checked })}
    <span data-slot="radio-group-indicator" class="relative flex items-center justify-center">
      {#if checked}
        <CircleIcon
          class="fill-primary absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2"
        />
      {/if}
    </span>
  {/snippet}
</RadioGroupPrimitive.Item>
