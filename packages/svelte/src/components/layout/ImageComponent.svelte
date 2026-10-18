<script lang="ts">
  import type { ImageSchema } from '@alfakit/core'
  import { extraProps } from '../../lib/attributes'
  import { cn } from '../../lib/utils'
  import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'

  const ALIGNMENT: Record<string, string> = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
  }

  let { component }: { component: ImageSchema } = $props()
  const imageClass = $derived(
    cn('max-w-full object-cover', component.circular ? 'rounded-full' : 'rounded-md'),
  )
</script>

<div
  data-slot="image"
  {...extraProps(
    component.extraAttributes,
    cn('flex', ALIGNMENT[component.alignment ?? 'start'] ?? 'justify-start'),
  )}
>
  {#if component.tooltip}
    <Tooltip>
      <TooltipTrigger>
        {#snippet child({ props })}
          <img
            src={component.url}
            alt={component.alt}
            loading="lazy"
            class={imageClass}
            style:width={component.imageWidth}
            style:height={component.imageHeight}
            {...props}
          />
        {/snippet}
      </TooltipTrigger>
      <TooltipContent>{component.tooltip}</TooltipContent>
    </Tooltip>
  {:else}
    <img
      src={component.url}
      alt={component.alt}
      loading="lazy"
      class={imageClass}
      style:width={component.imageWidth}
      style:height={component.imageHeight}
    />
  {/if}
</div>
