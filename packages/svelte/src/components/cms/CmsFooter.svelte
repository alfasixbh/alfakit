<script lang="ts">
  import type { CmsPayload } from '@alfakit/core'
  import CmsLanguageSwitcher from './CmsLanguageSwitcher.svelte'
  import CmsMenuList from './CmsMenuList.svelte'
  import { useCms } from './context'

  /** The site footer: the `footer` menu and the site name. */
  let { cms: payload }: { cms: CmsPayload } = $props()

  const cms = useCms()
</script>

<footer data-slot="cms-footer" class="border-t">
  <div
    class="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6 lg:px-8"
  >
    <p class="font-semibold">{payload.site.name}</p>
    {#if payload.menus.footer && payload.menus.footer.items.length > 0}
      <nav aria-label={cms.t('cms.footer_navigation', {}, 'Footer navigation')}>
        <CmsMenuList
          items={payload.menus.footer.items}
          class="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-4"
        />
      </nav>
    {/if}
    <CmsLanguageSwitcher site={payload.site} class="sm:hidden" />
  </div>
</footer>
