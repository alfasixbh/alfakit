<script lang="ts">
  import type { CmsSiteSchema } from '@alfakit/core'
  import { cn } from '../../lib/utils'
  import { CMS_LINK_CLASS, useCms } from './context'

  /** Links to the page in the site's other languages. */
  let { site, class: className }: { site: CmsSiteSchema; class?: string } = $props()

  const cms = useCms()
</script>

{#if site.locales.length > 1}
  <nav
    aria-label={cms.t('cms.language', {}, 'Language')}
    class={className}
    data-slot="cms-language-switcher"
  >
    <ul class="flex flex-wrap items-center gap-1">
      {#each site.locales as locale (locale.code)}
        <li>
          <a
            href={locale.url}
            hreflang={locale.code}
            lang={locale.code}
            aria-current={locale.current ? 'true' : undefined}
            class={cn(CMS_LINK_CLASS, 'px-2 py-1 uppercase')}
          >
            {locale.label}
          </a>
        </li>
      {/each}
    </ul>
  </nav>
{/if}
