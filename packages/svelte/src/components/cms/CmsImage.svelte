<script lang="ts">
  import type { CmsImageSchema } from '@alfakit/core'
  import { cn } from '../../lib/utils'

  /** A lazily loaded image with its alternative text; decorative images get `alt=""`. */
  let {
    image,
    class: className,
    sizes,
    eager = false,
  }: {
    image: CmsImageSchema | null | undefined
    class?: string
    sizes?: string
    eager?: boolean
  } = $props()
</script>

{#if image}
  <img
    src={image.url}
    alt={image.alt ?? ''}
    loading={eager ? 'eager' : 'lazy'}
    decoding="async"
    {sizes}
    class={cn('h-auto max-w-full', className)}
    data-slot="cms-image"
  />
{/if}
