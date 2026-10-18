<script lang="ts">
  import type { CmsMenuSchema } from '@alfakit/core'
  import MenuIcon from '@lucide/svelte/icons/menu'
  import XIcon from '@lucide/svelte/icons/x'
  import type { Snippet } from 'svelte'
  import { Button } from '../ui/button'
  import CmsDropdownItem from './CmsDropdownItem.svelte'
  import CmsMenuLink from './CmsMenuLink.svelte'
  import CmsMenuList from './CmsMenuList.svelte'
  import { CMS_LINK_CLASS, useCms } from './context'

  /**
   * The header navigation: items in a row from `md`, a disclosure menu below it. Items
   * with children get a submenu button (Escape or a click outside closes it).
   */
  let { menu, children }: { menu: CmsMenuSchema | null | undefined; children?: Snippet } = $props()

  const cms = useCms()
  const id = $props.id()
  let open = $state(false)
</script>

{#if menu && menu.items.length > 0}
  <nav
    aria-label={cms.t('cms.main_navigation', {}, 'Main navigation')}
    class="hidden md:block"
    data-slot="cms-nav"
  >
    <ul class="flex items-center gap-1">
      {#each menu.items as item (item.id)}
        {#if item.children.length > 0}
          <CmsDropdownItem {item} />
        {:else}
          <li><CmsMenuLink {item} class={CMS_LINK_CLASS} /></li>
        {/if}
      {/each}
    </ul>
  </nav>
  {@render children?.()}
  <Button
    type="button"
    variant="ghost"
    size="icon"
    class="md:hidden"
    aria-expanded={open}
    aria-controls={id}
    onclick={() => (open = !open)}
  >
    {#if open}<XIcon aria-hidden="true" />{:else}<MenuIcon aria-hidden="true" />{/if}
    <span class="sr-only"
      >{open
        ? cms.t('cms.close_menu', {}, 'Close menu')
        : cms.t('cms.open_menu', {}, 'Open menu')}</span
    >
  </Button>
  <nav
    {id}
    hidden={!open}
    aria-label={cms.t('cms.main_navigation', {}, 'Main navigation')}
    class="bg-background absolute inset-x-0 top-full z-40 border-b px-4 pb-4 shadow-sm md:hidden"
    data-slot="cms-mobile-nav"
  >
    <CmsMenuList items={menu.items} class="flex flex-col gap-1 pt-2" itemClass="py-2.5 text-base" />
  </nav>
{:else}
  {@render children?.()}
{/if}
