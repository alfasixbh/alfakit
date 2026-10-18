<script lang="ts">
  import type { CmsMenuItemSchema } from '@alfakit/core'
  import { cn } from '../../lib/utils'
  import CmsMenuList from './CmsMenuList.svelte'
  import CmsMenuLink from './CmsMenuLink.svelte'
  import { CMS_LINK_CLASS } from './context'

  /** Nested items as plain lists (the mobile menu and the footer). */
  let {
    items,
    class: className,
    itemClass,
  }: { items: CmsMenuItemSchema[]; class?: string; itemClass?: string } = $props()
</script>

<ul class={className}>
  {#each items as item (item.id)}
    <li>
      <CmsMenuLink {item} class={cn(CMS_LINK_CLASS, 'block', itemClass)} />
      {#if item.children.length > 0}
        <CmsMenuList items={item.children} class="ms-3 border-s ps-2" {itemClass} />
      {/if}
    </li>
  {/each}
</ul>
