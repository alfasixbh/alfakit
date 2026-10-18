<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check'
  import MinusIcon from '@lucide/svelte/icons/minus'
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui'
  import { cn } from '../../../lib/utils'

  let {
    ref = $bindable(null),
    class: className,
    checked = $bindable(false),
    indeterminate = $bindable(false),
    children: childrenProp,
    ...rest
  }: DropdownMenuPrimitive.CheckboxItemProps = $props()
</script>

<DropdownMenuPrimitive.CheckboxItem
  bind:ref
  bind:checked
  bind:indeterminate
  data-slot="dropdown-menu-checkbox-item"
  class={cn(
    "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 ps-8 pe-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    className,
  )}
  {...rest}
>
  {#snippet children({ checked: isChecked, indeterminate: isIndeterminate })}
    <span class="pointer-events-none absolute start-2 flex size-3.5 items-center justify-center">
      {#if isIndeterminate}
        <MinusIcon class="size-4" />
      {:else if isChecked}
        <CheckIcon class="size-4" />
      {/if}
    </span>
    {@render childrenProp?.({ checked: isChecked, indeterminate: isIndeterminate })}
  {/snippet}
</DropdownMenuPrimitive.CheckboxItem>
