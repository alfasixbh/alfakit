<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check'
  import MinusIcon from '@lucide/svelte/icons/minus'
  import { Checkbox as CheckboxPrimitive } from 'bits-ui'
  import { cn } from '../../../lib/utils'

  let {
    ref = $bindable(null),
    checked = $bindable(false),
    indeterminate = $bindable(false),
    class: className,
    ...rest
  }: Omit<CheckboxPrimitive.RootProps, 'children'> = $props()
</script>

<CheckboxPrimitive.Root
  bind:ref
  bind:checked
  bind:indeterminate
  data-slot="checkbox"
  class={cn(
    'peer border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground data-[state=checked]:text-primary-foreground dark:bg-input/30 dark:aria-invalid:ring-destructive/40 dark:data-[state=checked]:bg-primary size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
    className,
  )}
  {...rest}
>
  {#snippet children({ checked: isChecked, indeterminate: isIndeterminate })}
    <span
      data-slot="checkbox-indicator"
      class="flex items-center justify-center text-current transition-none"
    >
      {#if isIndeterminate}
        <MinusIcon class="size-3.5" />
      {:else if isChecked}
        <CheckIcon class="size-3.5" />
      {/if}
    </span>
  {/snippet}
</CheckboxPrimitive.Root>
