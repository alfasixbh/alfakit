<script lang="ts">
  import { cmsLinkRel, type CmsMenuItemSchema } from '@alfakit/core'
  import { useCms } from './context'

  let { item, class: className }: { item: CmsMenuItemSchema; class?: string } = $props()

  const cms = useCms()
</script>

{#if item.url}
  <a
    href={item.url}
    target={item.newTab ? '_blank' : undefined}
    rel={cmsLinkRel(item.newTab)}
    aria-current={item.current ? 'page' : undefined}
    data-active={item.active || undefined}
    class={className}
  >
    {item.label}
    {#if item.newTab}<span class="sr-only">
        {cms.t('cms.new_tab', {}, '(opens in a new tab)')}</span
      >{/if}
  </a>
{:else}
  <span class={className}>{item.label}</span>
{/if}
