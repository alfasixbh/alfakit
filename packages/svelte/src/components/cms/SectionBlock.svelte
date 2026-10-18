<script lang="ts">
  import type { CmsBlockSchema, CmsSectionBlockData } from '@alfakit/core'
  import CmsBlocks from './CmsBlocks.svelte'

  /** A reusable section: its blocks, at full page width. */
  let { data }: { block: CmsBlockSchema<CmsSectionBlockData>; data: CmsSectionBlockData } = $props()
</script>

<div data-slot="cms-section" data-section={data.name}>
  <CmsBlocks blocks={data.blocks} />
</div>
