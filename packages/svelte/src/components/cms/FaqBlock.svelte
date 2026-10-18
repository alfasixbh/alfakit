<script lang="ts">
  import type { CmsBlockSchema, CmsFaqBlockData } from '@alfakit/core'
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down'
  import CmsBlockHeading from './CmsBlockHeading.svelte'
  import { useSectionClass } from './context'

  let { block, data }: { block: CmsBlockSchema<CmsFaqBlockData>; data: CmsFaqBlockData } = $props()

  const sectionClass = useSectionClass()
</script>

<section data-slot="cms-faq" class={sectionClass}>
  <div class="mx-auto max-w-3xl">
    <CmsBlockHeading heading={data.heading} />
    <div class="divide-y rounded-xl border">
      {#each data.items as item, index (`${block.id}-${index}`)}
        <details class="group px-5" data-slot="cms-faq-item">
          <summary
            class="focus-visible:ring-ring/50 flex cursor-pointer list-none items-center justify-between gap-4 rounded-md py-4 text-start font-medium outline-none focus-visible:ring-[3px] [&::-webkit-details-marker]:hidden"
          >
            {item.question}
            <ChevronDownIcon
              class="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <p class="text-muted-foreground pb-5 whitespace-pre-line">{item.answer}</p>
        </details>
      {/each}
    </div>
  </div>
</section>
