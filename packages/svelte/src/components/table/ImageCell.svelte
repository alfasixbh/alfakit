<script lang="ts">
  import { remainingTextSizeClass, stackedImageStyle, usesDefaultImageStack } from '@alfakit/core'
  import { extraProps } from '../../lib/attributes'
  import { cn } from '../../lib/utils'
  import type { CellProps } from './cell-update.svelte'

  let { column, cell }: CellProps = $props()

  const urls = $derived(Array.isArray(cell.state) ? (cell.state as string[]) : [])
  const schema = $derived(
    column as {
      circular?: boolean
      square?: boolean
      size?: number | string
      height?: number | string
      width?: string
      stacked?: boolean
      limit?: number
      limitedRemainingText?: boolean
      limitedRemainingTextSize?: string
      wrap?: boolean
      ring?: number
      overlap?: number
    },
  )
  const limit = $derived(schema.limit ?? urls.length)
  const size = $derived(schema.size ?? 40)
  const defaultStack = $derived(usesDefaultImageStack(schema))
  const px = (value: number | string | undefined) =>
    value === undefined ? undefined : typeof value === 'number' ? `${value}px` : value
</script>

{#if urls.length === 0}
  <span class="text-muted-foreground">—</span>
{:else}
  <div
    class={cn(
      'flex items-center',
      schema.wrap && 'flex-wrap',
      schema.stacked ? defaultStack && '-space-x-2' : 'gap-1.5',
      schema.wrap && schema.stacked && 'gap-y-1.5',
    )}
  >
    {#each urls.slice(0, limit) as url, index (index)}
      <img
        src={url}
        alt={cell.alt ?? ''}
        style:height={px(schema.height ?? size)}
        style:width={px(schema.width ?? (schema.square || schema.circular ? size : undefined))}
        style:box-shadow={stackedImageStyle(index, schema)?.boxShadow}
        style:margin-inline-start={stackedImageStyle(index, schema)?.marginInlineStart}
        {...extraProps(
          cell.extraImgAttributes,
          cn(
            'object-cover',
            schema.circular ? 'rounded-full' : 'rounded-md',
            schema.stacked && defaultStack && 'ring-background ring-2',
          ),
        )}
      />
    {/each}
    {#if schema.limitedRemainingText && urls.length > limit}<span
        data-slot="image-remaining"
        class={cn(
          'text-muted-foreground ms-1',
          remainingTextSizeClass(schema.limitedRemainingTextSize),
        )}>+{urls.length - limit}</span
      >{/if}
  </div>
{/if}
