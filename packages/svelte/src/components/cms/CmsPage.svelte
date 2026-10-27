<script lang="ts">
  import {
    CMS_FOOTER_KEY,
    CMS_HEADER_KEY,
    cmsDesignCss,
    cmsPayload,
    type CmsPayload,
  } from '@alfakit/core'
  import { page as inertiaPage } from '@inertiajs/svelte'
  import EyeIcon from '@lucide/svelte/icons/eye'
  import type { Snippet } from 'svelte'
  import { useOptionalRegistry, type AnyComponent } from '../../context.svelte'
  import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
  } from '../ui/breadcrumb'
  import CmsBlocks from './CmsBlocks.svelte'
  import CmsFooter from './CmsFooter.svelte'
  import CmsHead from './CmsHead.svelte'
  import CmsHeader from './CmsHeader.svelte'
  import { provideCms } from './context'
  import Lazy from '../../lib/Lazy.svelte'
  import { lazyLoader } from '../../lib/lazy'

  // The admin bar loads only for signed-in editors (the server sends `cms.admin` to them alone).
  const adminBar = lazyLoader<{ admin: NonNullable<CmsPayload['admin']> }>(() =>
    import('./AdminBar.svelte').then((module) => module.default),
  )

  /**
   * The `Alfakit/CmsPage` Inertia page (public CMS pages and previews). Register it in your
   * public site's Inertia app: `createAlfakit({ pages: { 'Alfakit/CmsPage': CmsPage } })`.
   *
   * Replace the header or footer with `cms:header` / `cms:footer` registry components, a
   * block with `cms:block:{type}`, or build your own page from `CmsBlocks` and `CmsHead`.
   */
  let {
    cms: cmsProp,
    components,
    children,
  }: {
    cms?: CmsPayload
    components?: Record<string, AnyComponent>
    children?: Snippet<[CmsPayload]>
  } = $props()

  function pageProps(): unknown {
    try {
      return inertiaPage.props
    } catch {
      return null
    }
  }

  const cms = $derived(cmsProp ?? cmsPayload(pageProps()))
  const context = provideCms(
    () => cms,
    () => components,
  )
  const registry = useOptionalRegistry()
  const Header = $derived<AnyComponent>(registry?.resolve(CMS_HEADER_KEY) ?? CmsHeader)
  const Footer = $derived<AnyComponent>(registry?.resolve(CMS_FOOTER_KEY) ?? CmsFooter)
  const designCss = $derived(cmsDesignCss(cms?.site.design))

  $effect(() => {
    if (!cms) return

    document.documentElement.lang = cms.site.tag
    document.documentElement.dir = cms.site.direction
  })
</script>

{#if cms}
  <CmsHead seo={cms.page.seo} design={cms.site.design} />
  <div
    dir={cms.site.direction}
    lang={cms.site.tag}
    data-slot="cms-page"
    data-layout={cms.page.layout ?? undefined}
    class="bg-background text-foreground flex min-h-svh flex-col"
  >
    <a
      href="#cms-content"
      class="bg-background focus-visible:ring-ring/50 sr-only z-50 rounded-md px-4 py-2 focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus-visible:ring-[3px]"
    >
      {context.t('cms.skip_to_content', {}, 'Skip to content')}
    </a>
    {#if designCss}
      <!-- Site design: built on the server and checked by `cmsDesignCss()`: it contains no `<`. -->
      <!-- eslint-disable-next-line svelte/no-at-html-tags -- checked by cmsDesignCss() -->
      {@html `<style data-slot="cms-design">${designCss}</` + 'style>'}
    {/if}
    {#if cms.preview}
      <div
        role="status"
        data-slot="cms-preview-banner"
        class="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100"
      >
        <EyeIcon class="size-4 shrink-0" aria-hidden="true" />
        <span>
          <strong class="font-semibold">{context.t('cms.preview', {}, 'Preview')}</strong> ·
          {context.t(
            'cms.preview_notice',
            {},
            "This is a preview. Visitors don't see unpublished changes.",
          )}
        </span>
      </div>
    {/if}
    <Header {cms} />
    <main id="cms-content" tabindex="-1" class="flex-1 outline-none" data-slot="cms-content">
      {#if cms.page.breadcrumbs.length > 1}
        <Breadcrumb
          aria-label={context.t('cms.breadcrumbs', {}, 'Breadcrumbs')}
          class="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8"
        >
          <BreadcrumbList>
            {#each cms.page.breadcrumbs as crumb, index (crumb.url)}
              {#if index > 0}<BreadcrumbSeparator />{/if}
              <BreadcrumbItem>
                {#if index === cms.page.breadcrumbs.length - 1}
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                {:else}
                  <BreadcrumbLink href={crumb.url}>{crumb.label}</BreadcrumbLink>
                {/if}
              </BreadcrumbItem>
            {/each}
          </BreadcrumbList>
        </Breadcrumb>
      {/if}
      {#if children}
        {@render children(cms)}
      {:else if cms.page.blocks.length > 0}
        <CmsBlocks blocks={cms.page.blocks} />
      {:else}
        <p class="text-muted-foreground mx-auto max-w-3xl px-4 py-24 text-center">
          {context.t('cms.empty_page', {}, 'This page has no content yet.')}
        </p>
      {/if}
    </main>
    <Footer {cms} />
    {#if cms.poweredBy}
      <!-- eslint-disable-next-line svelte/no-at-html-tags -- built on the server (Credit::poweredBy) -->
      <div data-slot="cms-powered-by">{@html cms.poweredBy}</div>
    {/if}
    {#if cms.admin}
      <Lazy loader={adminBar} props={{ admin: cms.admin }}>
        {#snippet fallback()}{/snippet}
      </Lazy>
    {/if}
  </div>
{/if}
