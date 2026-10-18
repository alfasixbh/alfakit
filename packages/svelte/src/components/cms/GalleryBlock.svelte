<script lang="ts">
  import { cmsGridClass, type CmsBlockSchema, type CmsGalleryBlockData } from '@alfakit/core'
  import CmsBlockHeading from './CmsBlockHeading.svelte'
  import CmsImage from './CmsImage.svelte'
  import { useSectionClass } from './context'

  let { data }: { block: CmsBlockSchema<CmsGalleryBlockData>; data: CmsGalleryBlockData } = $props()

  const sectionClass = useSectionClass()
</script>

<section data-slot="cms-gallery" class={sectionClass}>
  <div class="mx-auto max-w-6xl">
    <CmsBlockHeading heading={data.heading} />
    <ul class={cmsGridClass(data.columns)} role="list">
      {#each data.images as image, index (`${image.url}-${index}`)}
        <li>
          <figure class="flex flex-col gap-2">
            <CmsImage {image} class="aspect-[4/3] w-full rounded-xl object-cover" />
            {#if image.caption}<figcaption class="text-muted-foreground text-sm">
                {image.caption}
              </figcaption>{/if}
          </figure>
        </li>
      {/each}
    </ul>
  </div>
</section>
