<script lang="ts">
  import { cmsGridClass, type CmsBlockSchema, type CmsFeaturesBlockData } from '@alfakit/core'
  import Icon from '../../lib/Icon.svelte'
  import CmsBlockHeading from './CmsBlockHeading.svelte'
  import { useSectionClass } from './context'

  let { data }: { block: CmsBlockSchema<CmsFeaturesBlockData>; data: CmsFeaturesBlockData } =
    $props()

  const sectionClass = useSectionClass()
</script>

{#snippet content(item: CmsFeaturesBlockData['items'][number])}
  {#if item.icon}
    <span
      class="bg-primary/10 text-primary inline-flex size-10 items-center justify-center rounded-lg"
    >
      <Icon name={item.icon} class="size-5" aria-hidden="true" />
    </span>
  {/if}
  <h3 class="text-lg font-semibold">{item.title}</h3>
  {#if item.description}<p class="text-muted-foreground text-pretty">{item.description}</p>{/if}
{/snippet}

<section data-slot="cms-features" class={sectionClass}>
  <div class="mx-auto max-w-6xl">
    <CmsBlockHeading heading={data.heading} intro={data.intro} />
    <ul class={cmsGridClass(data.columns)} role="list">
      {#each data.items as item, index (`${item.title}-${index}`)}
        <li class="bg-card flex flex-col gap-3 rounded-xl border p-6">
          {#if item.url}
            <a
              href={item.url}
              class="focus-visible:ring-ring/50 flex flex-col gap-3 rounded-md outline-none focus-visible:ring-[3px]"
            >
              {@render content(item)}
            </a>
          {:else}
            {@render content(item)}
          {/if}
        </li>
      {/each}
    </ul>
  </div>
</section>
