<script lang="ts">
  import { extraProps } from '../../lib/attributes'
  import NavLabel from './NavLabel.svelte'
  import {
    PREFETCH_CACHE_FOR,
    bottomNavigationItems,
    isNavigationItemActive,
    navigationItemUrl,
    type NavigationItemSchema,
  } from '@alfakit/core'
  import { Link } from '@inertiajs/svelte'
  import MenuIcon from '@lucide/svelte/icons/menu'
  import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet'
  import { usePanel, useT } from '../../context.svelte'
  import Icon from '../../lib/Icon.svelte'
  import { navigationKey, uniqueKey } from '../../lib/keys'

  /**
   * The mobile preset's bottom navigation bar (`Panel::mobile()`): the top-level items, with
   * the rest behind a "More" button that opens a sheet. Hidden from `md` up; replace it
   * everywhere with `createAlfakit({ components: { 'panel:bottom-nav': … } })`.
   */
  const t = useT()
  const panel = $derived(usePanel())
  const items = $derived(bottomNavigationItems(panel.navigation))
  const overflowActive = $derived(items.overflow.some(isNavigationItemActive))
  const overflowLinks = $derived(items.overflow.flatMap((item) => [item, ...(item.children ?? [])]))
  let open = $state(false)

  const url = (item: NavigationItemSchema): string => navigationItemUrl(item) ?? '#'
</script>

{#if items.primary.length > 0 || items.overflow.length > 0}
  <nav data-slot="bottom-nav" aria-label={t('navigation', {}, 'Navigation')} class="md:hidden">
    {#each items.primary as item, index (uniqueKey(items.primary, index, navigationKey))}
      {#if item.openInNewTab}
        <a
          {...extraProps(item.extraAttributes, 'min-w-0')}
          href={url(item)}
          target="_blank"
          rel="noopener noreferrer"
          data-slot="bottom-nav-item"
        >
          {#if item.icon}<Icon name={item.icon} />{/if}
          <NavLabel class="max-w-full truncate" text={item.label} html={item.labelHtml} />
        </a>
      {:else}
        <Link
          {...extraProps(item.extraAttributes, 'min-w-0')}
          href={url(item)}
          prefetch
          cacheFor={PREFETCH_CACHE_FOR}
          data-slot="bottom-nav-item"
          data-active={isNavigationItemActive(item) ? 'true' : undefined}
          aria-current={isNavigationItemActive(item) ? 'page' : undefined}
        >
          {#if item.icon}<Icon name={item.icon} />{/if}
          <NavLabel class="max-w-full truncate" text={item.label} html={item.labelHtml} />
        </Link>
      {/if}
    {/each}
    {#if items.overflow.length > 0}
      <Sheet bind:open>
        <button
          type="button"
          data-slot="bottom-nav-item"
          data-active={overflowActive ? 'true' : undefined}
          aria-haspopup="dialog"
          aria-expanded={open}
          class="min-w-0 bg-transparent"
          onclick={() => (open = true)}
        >
          <Icon name="alfakit::panels.topbar.open-sidebar-button" fallback={MenuIcon} />
          <span class="max-w-full truncate">{t('more', {}, 'More')}</span>
        </button>
        <SheetContent side="bottom" class="max-h-[80dvh] overflow-y-auto rounded-t-xl p-0">
          <SheetHeader class="border-b">
            <SheetTitle>{t('more', {}, 'More')}</SheetTitle>
          </SheetHeader>
          <nav
            aria-label={t('navigation', {}, 'Navigation')}
            class="flex flex-col gap-1 p-3 text-sm"
          >
            {#each overflowLinks as item, index (uniqueKey(overflowLinks, index, navigationKey))}
              <Link
                href={url(item)}
                data-active={isNavigationItemActive(item) ? 'true' : undefined}
                class="hover:bg-accent data-[active=true]:bg-accent flex min-h-11 items-center gap-3 rounded-md px-3 font-medium [&_svg]:size-4"
                onclick={() => (open = false)}
              >
                {#if item.icon}<Icon name={item.icon} />{/if}
                <NavLabel text={item.label} html={item.labelHtml} />
              </Link>
            {/each}
          </nav>
        </SheetContent>
      </Sheet>
    {/if}
  </nav>
{/if}
