<script lang="ts">
  import { cmsColumnsClass, type CmsBlockSchema, type CmsColumnsBlockData } from '@alfakit/core'
  import { setContext } from 'svelte'
  import { cn } from '../../lib/utils'
  import CmsBlocks from './CmsBlocks.svelte'
  import { CMS_NESTED_CONTEXT, useSectionClass } from './context'

  let { data }: { block: CmsBlockSchema<CmsColumnsBlockData>; data: CmsColumnsBlockData } = $props()

  const sectionClass = useSectionClass('py-8 sm:py-10')

  // Blocks inside the columns drop the page padding (the columns block has it).
  setContext(CMS_NESTED_CONTEXT, true)
</script>

<section data-slot="cms-columns" class={sectionClass}>
  <div
    class={cn(
      'mx-auto max-w-6xl',
      cmsColumnsClass(data.columns.length),
      data.align === 'center' && 'items-center',
    )}
  >
    {#each data.columns as column, index (index)}
      <div class="min-w-0" data-slot="cms-column">
        <CmsBlocks blocks={column.blocks} />
      </div>
    {/each}
  </div>
</section>
