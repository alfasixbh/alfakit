<script lang="ts">
  import type { PageSchema } from '@alfakit/core'
  import { applyBodyAttributes } from '@alfakit/core'
  import type { Snippet } from 'svelte'
  import KeyboardShortcuts from '../components/panel/KeyboardShortcuts.svelte'
  import Slot from '../components/panel/Slot.svelte'
  import { useRegistry, type AnyComponent } from '../context.svelte'
  import SubNavigationLayout from '../components/panel/SubNavigationLayout.svelte'
  import ConflictBanner from '../components/realtime/ConflictBanner.svelte'
  import { layoutKind, useHostedLayout } from './hosted-layout'
  import PageHeader from './PageHeader.svelte'
  import PanelLayout from './PanelLayout.svelte'

  let { page, children }: { page: PageSchema; children?: Snippet } = $props()

  const registry = useRegistry()
  // Edit pages: somebody else saved the record (`detectConflicts()`, `Panel::realtime()`).
  const Conflicts: AnyComponent = $derived(
    registry.resolve('page:conflict-banner') ?? ConflictBanner,
  )

  const kind = $derived(layoutKind(page))
  // The persistent layout around the page (`PanelLayoutHost`) already draws this layout.
  const host = useHostedLayout()
  const hosted = $derived(host?.current === kind)

  // The page's `$extraBodyAttributes` on `<body>` while it is open.
  const bodyAttributes = $derived(JSON.stringify(page.extraBodyAttributes ?? null))
  $effect(() => applyBodyAttributes(JSON.parse(bodyAttributes) as Record<string, string> | null))
</script>

{#snippet content()}
  {#if kind === 'app'}
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
  {:else}
    {@render children?.()}
  {/if}
{/snippet}

{#if hosted}
  {@render content()}
{:else}
  <PanelLayout {page}>{@render content()}</PanelLayout>
{/if}
