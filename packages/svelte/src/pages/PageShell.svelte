<script lang="ts">
  import type { PageSchema } from '@alfakit/core'
  import { applyBodyAttributes } from '@alfakit/core'
  import type { Snippet } from 'svelte'
  import KeyboardShortcuts from '../components/panel/KeyboardShortcuts.svelte'
  import Slot from '../components/panel/Slot.svelte'
  import { useRegistry, type AnyComponent } from '../context.svelte'
  import BlankLayout from '../layouts/BlankLayout.svelte'
  import SubNavigationLayout from '../components/panel/SubNavigationLayout.svelte'
  import ConflictBanner from '../components/realtime/ConflictBanner.svelte'
  import PageHeader from './PageHeader.svelte'

  let { page, children }: { page: PageSchema; children?: Snippet } = $props()

  // Each layout can be replaced: createAlfakit({ components: { 'layout:app': MyLayout } }).
  // `createAlfakit()` registers the panel's layouts (`panelLayouts`), the starter kit its content
  // layout; importing the panel layouts here would put the sidebar in every starter kit page.
  const registry = useRegistry()
  const Auth: AnyComponent = $derived(registry.resolve('layout:auth') ?? BlankLayout)
  const Blank: AnyComponent = $derived(registry.resolve('layout:blank') ?? BlankLayout)
  const Fullscreen: AnyComponent = $derived(registry.resolve('layout:fullscreen') ?? BlankLayout)
  const App: AnyComponent = $derived(registry.resolve('layout:app') ?? BlankLayout)
  // Edit pages: somebody else saved the record (`detectConflicts()`, `Panel::realtime()`).
  const Conflicts: AnyComponent = $derived(
    registry.resolve('page:conflict-banner') ?? ConflictBanner,
  )

  // The page's `$extraBodyAttributes` on `<body>` while it is open.
  const bodyAttributes = $derived(JSON.stringify(page.extraBodyAttributes ?? null))
  $effect(() => applyBodyAttributes(JSON.parse(bodyAttributes) as Record<string, string> | null))
</script>

{#if page.layout === 'auth'}
  <Auth heading={page.heading ?? page.title} subheading={page.subheading} {page}>
    {@render children?.()}
  </Auth>
{:else if page.layout === 'blank'}
  <Blank {page}>{@render children?.()}</Blank>
{:else if page.layout === 'fullscreen'}
  <Fullscreen {page}>{@render children?.()}</Fullscreen>
{:else}
  <App breadcrumbs={page.breadcrumbs} maxContentWidth={page.maxContentWidth} {page}>
    <!-- `?` overlay, `/`, `g d` and panel command shortcuts (`keyboardShortcuts()`). -->
    <KeyboardShortcuts />
    <Slot name="page.start" />
    <PageHeader {page} />
    {#if page.conflicts}<Conflicts {page} />{/if}
    {#if page.subNavigation}
      <SubNavigationLayout navigation={page.subNavigation}
        >{@render children?.()}</SubNavigationLayout
      >
    {:else}
      {@render children?.()}
    {/if}
    <Slot name="page.end" />
  </App>
{/if}
