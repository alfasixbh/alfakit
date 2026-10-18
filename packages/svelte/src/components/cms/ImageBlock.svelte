<script lang="ts">
  import { cmsWidthClass, type CmsBlockSchema, type CmsImageBlockData } from '@alfakit/core'
  import { getContext, hasContext } from 'svelte'
  import { cn } from '../../lib/utils'
  import CmsImage from './CmsImage.svelte'
  import { CMS_NESTED_CONTEXT, useSectionClass } from './context'

  let { data }: { block: CmsBlockSchema<CmsImageBlockData>; data: CmsImageBlockData } = $props()

  const nested = hasContext(CMS_NESTED_CONTEXT) && getContext<boolean>(CMS_NESTED_CONTEXT)
  const sectionClass = useSectionClass('py-8 sm:py-10')
</script>

<section
  data-slot="cms-image-block"
  class={data.width === 'full' && !nested ? 'py-8' : sectionClass}
>
  <figure class={cn(cmsWidthClass(data.width), 'flex flex-col gap-3')}>
    <CmsImage
      image={data.image}
      class={cn('w-full object-cover', data.width !== 'full' && 'rounded-xl')}
    />
    {#if data.caption}<figcaption class="text-muted-foreground text-center text-sm">
        {data.caption}
      </figcaption>{/if}
  </figure>
</section>
