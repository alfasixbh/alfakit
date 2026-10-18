<script lang="ts">
  import type { BreadcrumbSchema } from '@alfakit/core'
  import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
  } from '../ui/breadcrumb'

  import { useT } from '../../context.svelte'

  let { items }: { items: BreadcrumbSchema[] } = $props()
  const t = useT()
</script>

{#if items.length > 0}
  <Breadcrumb class="min-w-0" aria-label={t('breadcrumbs', {}, 'Breadcrumb')}>
    <BreadcrumbList class="flex-nowrap">
      {#each items as item, index (`${item.label}-${index}`)}
        {@const last = index === items.length - 1}
        <BreadcrumbItem class={!last ? 'hidden md:inline-flex' : 'min-w-0'}>
          {#if last || !item.url}
            <BreadcrumbPage class="block truncate">{item.label}</BreadcrumbPage>
          {:else}
            <BreadcrumbLink href={item.url}>{item.label}</BreadcrumbLink>
          {/if}
        </BreadcrumbItem>
        {#if !last}<BreadcrumbSeparator class="hidden md:block" />{/if}
      {/each}
    </BreadcrumbList>
  </Breadcrumb>
{/if}
