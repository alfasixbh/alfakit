<script lang="ts">
  import type { ImageEntrySchema } from '@alfakit/core'
  import { remainingTextSizeClass, stackedImageStyle, usesDefaultImageStack } from '@alfakit/core'
  import { extraProps } from '../../lib/attributes'
  import { cn } from '../../lib/utils'
  import EntryLink from './EntryLink.svelte'
  import EntryPlaceholder from './EntryPlaceholder.svelte'
  import EntryWrapper from './EntryWrapper.svelte'

  let { component }: { component: ImageEntrySchema } = $props()

  const urls = $derived(component.state ?? [])
  const limit = $derived(component.limit ?? urls.length)
  const size = $derived(component.size ?? 40)
  const defaultStack = $derived(usesDefaultImageStack(component))
  const px = (value: number | string | undefined) =>
    value === undefined ? undefined : typeof value === 'number' ? `${value}px` : value
</script>

<EntryWrapper entry={component}>
  {#if urls.length === 0}
    <EntryPlaceholder entry={component} />
  {:else}
    <EntryLink entry={component}>
      <div
        class={cn('flex items-center', component.stacked ? defaultStack && '-space-x-2' : 'gap-2')}
      >
        {#each urls.slice(0, limit) as url, index (index)}
          <img
            src={url}
            alt={component.alts?.[index] ?? component.alt ?? ''}
            style:height={px(component.height ?? size)}
            style:width={px(
              component.width ?? (component.square || component.circular ? size : undefined),
            )}
            style:box-shadow={stackedImageStyle(index, component)?.boxShadow}
            style:margin-inline-start={stackedImageStyle(index, component)?.marginInlineStart}
            {...extraProps(
              component.extraImgAttributes,
              cn(
                'object-cover',
                component.circular ? 'rounded-full' : 'rounded-md',
                component.stacked && defaultStack && 'ring-background ring-2',
              ),
            )}
          />
        {/each}
        {#if component.limitedRemainingText !== false && urls.length > limit}<span
            data-slot="image-remaining"
            class={cn(
              'text-muted-foreground',
              remainingTextSizeClass(component.limitedRemainingTextSize),
            )}>+{urls.length - limit}</span
          >{/if}
      </div>
    </EntryLink>
  {/if}
</EntryWrapper>
