<script lang="ts">
  import { cmsWidthClass, type CmsBlockSchema, type CmsRichTextBlockData } from '@alfakit/core'
  import { cn } from '../../lib/utils'
  import { useSectionClass } from './context'

  let { data }: { block: CmsBlockSchema<CmsRichTextBlockData>; data: CmsRichTextBlockData } =
    $props()

  const sectionClass = useSectionClass('py-8 sm:py-10')
</script>

<section data-slot="cms-rich-text" class={sectionClass}>
  <!-- Sanitised on the server (`Html::sanitize()`); never raw editor input. -->
  <div class={cn('alfakit-prose', cmsWidthClass(data.width))}>{@html data.html}</div>
</section>
