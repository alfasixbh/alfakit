<script lang="ts">
  import { cmsDesignLinks, cmsHeadTags, type CmsSeoSchema, type CmsSiteDesign } from '@alfakit/core'

  /**
   * The page's `<title>`, meta, canonical, `hreflang` and JSON-LD tags, plus the site
   * design's favicon and fonts (`<svelte:head>`).
   */
  let { seo, design }: { seo: CmsSeoSchema | null | undefined; design?: CmsSiteDesign | null } =
    $props()

  const tags = $derived(cmsHeadTags(seo))
  const designLinks = $derived(cmsDesignLinks(design))
</script>

<svelte:head>
  <title>{tags.title}</title>
  {#each tags.meta as tag (tag.property ?? tag.name)}
    {#if tag.property}
      <meta property={tag.property} content={tag.content} />
    {:else}
      <meta name={tag.name} content={tag.content} />
    {/if}
  {/each}
  {#each tags.links as link (`${link.rel}:${link.hreflang ?? ''}:${link.href}`)}
    <link rel={link.rel} href={link.href} hreflang={link.hreflang} />
  {/each}
  {#each designLinks as link (`design:${link.rel}`)}
    <link rel={link.rel} href={link.href} />
  {/each}
  {#if tags.jsonLd}
    <!-- Encoded on the server and checked by `cmsHeadTags()`: it contains no `<`. -->
    {@html `<script type="application/ld+json">${tags.jsonLd}</` + 'script>'}
  {/if}
</svelte:head>
