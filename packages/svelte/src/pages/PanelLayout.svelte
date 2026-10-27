<script lang="ts">
  import type { PageSchema } from '@alfakit/core'
  import type { Snippet } from 'svelte'
  import { useRegistry, type AnyComponent } from '../context.svelte'
  import BlankLayout from '../layouts/BlankLayout.svelte'
  import { layoutKind } from './hosted-layout'

  /** The page's registered layout (`layout:app`, `layout:auth`…) around `children`. */
  let { page, children }: { page: PageSchema; children?: Snippet } = $props()

  // Each layout can be replaced: createAlfakit({ components: { 'layout:app': MyLayout } }).
  // `createAlfakit()` registers the panel's layouts (`panelLayouts`), the starter kit its content
  // layout; importing the panel layouts here would put the sidebar in every starter kit page.
  const registry = useRegistry()
  const kind = $derived(layoutKind(page))
  const Layout: AnyComponent = $derived(registry.resolve(`layout:${kind}`) ?? BlankLayout)
</script>

{#if kind === 'auth'}
  <Layout heading={page.heading ?? page.title} subheading={page.subheading} {page}>
    {@render children?.()}
  </Layout>
{:else if kind === 'app'}
  <Layout breadcrumbs={page.breadcrumbs} maxContentWidth={page.maxContentWidth} {page}>
    {@render children?.()}
  </Layout>
{:else}
  <Layout {page}>{@render children?.()}</Layout>
{/if}
