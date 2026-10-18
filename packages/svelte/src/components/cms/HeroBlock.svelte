<script lang="ts">
  import type { CmsBlockSchema, CmsHeroBlockData } from '@alfakit/core'
  import { cn } from '../../lib/utils'
  import CmsImage from './CmsImage.svelte'
  import CmsLinkButton from './CmsLinkButton.svelte'
  import { useSectionClass } from './context'

  let { data }: { block: CmsBlockSchema<CmsHeroBlockData>; data: CmsHeroBlockData } = $props()

  const sectionClass = useSectionClass('sm:py-20 lg:py-24')
  const centered = $derived(data.alignment === 'center' && !data.image)
</script>

<section data-slot="cms-hero" class={sectionClass}>
  <div
    class={cn(
      'mx-auto grid max-w-6xl items-center gap-10',
      data.image && 'lg:grid-cols-2',
      centered && 'text-center',
    )}
  >
    <div class={cn('flex flex-col gap-5', centered && 'items-center')}>
      {#if data.eyebrow}<p class="text-primary text-sm font-semibold tracking-wide uppercase">
          {data.eyebrow}
        </p>{/if}
      <h1 class="text-4xl font-bold tracking-tight text-balance sm:text-5xl">{data.heading}</h1>
      {#if data.subheading}<p
          class="text-muted-foreground max-w-2xl text-lg text-pretty sm:text-xl"
        >
          {data.subheading}
        </p>{/if}
      {#if data.primaryAction || data.secondaryAction}
        <div class={cn('flex flex-wrap gap-3 pt-2', centered && 'justify-center')}>
          <CmsLinkButton link={data.primaryAction} />
          <CmsLinkButton link={data.secondaryAction} variant="outline" />
        </div>
      {/if}
    </div>
    {#if data.image}
      <CmsImage
        image={data.image}
        eager
        class="w-full rounded-2xl object-cover shadow-sm"
        sizes="(min-width: 1024px) 50vw, 100vw"
      />
    {/if}
  </div>
</section>
