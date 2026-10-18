<script lang="ts">
  import type { IconSchema } from '@alfakit/core'
  import { extraProps } from '../../lib/attributes'
  import { iconSizeClasses, textColorClasses } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'

  let { component }: { component: IconSchema } = $props()
  const iconClass = $derived(
    cn(
      iconSizeClasses[component.size ?? 'md'] ?? 'size-5',
      component.color && textColorClasses[component.color],
    ),
  )
</script>

{#if component.tooltip}
  <Tooltip>
    <TooltipTrigger>
      {#snippet child({ props })}
        <span
          data-slot="icon"
          role="img"
          aria-label={component.tooltip}
          {...extraProps(component.extraAttributes, 'inline-flex')}
          {...props}
        >
          <Icon name={component.icon} aria-hidden="true" class={iconClass} />
        </span>
      {/snippet}
    </TooltipTrigger>
    <TooltipContent>{component.tooltip}</TooltipContent>
  </Tooltip>
{:else}
  <span data-slot="icon" {...extraProps(component.extraAttributes, 'inline-flex')}>
    <Icon name={component.icon} aria-hidden="true" class={iconClass} />
  </span>
{/if}
