<script lang="ts">
  import { cmsAspectClass, type CmsBlockSchema, type CmsEmbedBlockData } from '@alfakit/core'
  import { cn } from '../../lib/utils'
  import { useSectionClass } from './context'

  let { data }: { block: CmsBlockSchema<CmsEmbedBlockData>; data: CmsEmbedBlockData } = $props()

  const sectionClass = useSectionClass('py-8 sm:py-10')
</script>

<section data-slot="cms-embed" class={sectionClass}>
  <figure class="mx-auto flex max-w-4xl flex-col gap-3">
    <div class={cn('bg-muted overflow-hidden rounded-xl', cmsAspectClass(data.aspectRatio))}>
      {#if data.embed.provider === 'video'}
        <!-- svelte-ignore a11y_media_has_caption -->
        <video
          src={data.embed.src}
          controls
          preload="metadata"
          class="size-full"
          title={data.embed.title}
        ></video>
      {:else}
        <iframe
          src={data.embed.src}
          title={data.embed.title}
          loading="lazy"
          class="size-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowfullscreen
          referrerpolicy="strict-origin-when-cross-origin"
          sandbox={data.embed.provider === 'iframe'
            ? 'allow-scripts allow-same-origin allow-popups allow-forms'
            : undefined}
        ></iframe>
      {/if}
    </div>
    {#if data.caption}<figcaption class="text-muted-foreground text-center text-sm">
        {data.caption}
      </figcaption>{/if}
  </figure>
</section>
