<script lang="ts">
  import { cmsGridClass, type CmsBlockSchema, type CmsTestimonialsBlockData } from '@alfakit/core'
  import QuoteIcon from '@lucide/svelte/icons/quote'
  import CmsBlockHeading from './CmsBlockHeading.svelte'
  import CmsImage from './CmsImage.svelte'
  import { useSectionClass } from './context'

  let {
    data,
  }: { block: CmsBlockSchema<CmsTestimonialsBlockData>; data: CmsTestimonialsBlockData } = $props()

  const sectionClass = useSectionClass()
</script>

<section data-slot="cms-testimonials" class={sectionClass}>
  <div class="mx-auto max-w-6xl">
    <CmsBlockHeading heading={data.heading} />
    <ul class={cmsGridClass(Math.min(3, data.items.length))} role="list">
      {#each data.items as item, index (`${item.author}-${index}`)}
        <li>
          <figure class="bg-card flex h-full flex-col gap-5 rounded-xl border p-6">
            <QuoteIcon class="text-primary/60 size-6 rtl:-scale-x-100" aria-hidden="true" />
            <blockquote class="flex-1 text-pretty">
              <p>{item.quote}</p>
            </blockquote>
            <figcaption class="flex items-center gap-3">
              {#if item.avatar}<CmsImage
                  image={{ ...item.avatar, alt: '' }}
                  class="size-10 rounded-full object-cover"
                />{/if}
              <span class="flex flex-col">
                <span class="font-medium">{item.author}</span>
                {#if item.role}<span class="text-muted-foreground text-sm">{item.role}</span>{/if}
              </span>
            </figcaption>
          </figure>
        </li>
      {/each}
    </ul>
  </div>
</section>
