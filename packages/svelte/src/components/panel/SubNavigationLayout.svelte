<script lang="ts">
  import type { SubNavigationSchema } from '@alfakit/core'
  import type { Snippet } from 'svelte'
  import { useRegistry, type AnyComponent } from '../../context.svelte'
  import Slot from './Slot.svelte'
  import SubNavigation from './SubNavigation.svelte'

  /**
   * Places the sub-navigation next to (`start`/`end`) or above (`top`) the page content.
   * Replace the navigation with `createAlfakit({ components: { 'panel:sub-navigation': … } })`.
   */
  let { navigation, children }: { navigation: SubNavigationSchema; children?: Snippet } = $props()

  const registry = useRegistry()
  const Nav: AnyComponent = $derived(registry.resolve('panel:sub-navigation') ?? SubNavigation)
</script>

{#if navigation.position === 'top'}
  <Slot name="page.sub-navigation.top.before" />
  <Nav {navigation} />
  <Slot name="page.sub-navigation.top.after" />
  {@render children?.()}
{:else}
  <!-- The navigation goes beside the content once the page's content area (this `@container`)
    has 42rem, so the content keeps about 30rem next to it; narrower (beside the panel
    sidebar on a tablet), it is a scrolling row of links above (`end`: below) the content. -->
  <div data-slot="sub-navigation-container" class="@container">
    <div
      data-slot="sub-navigation-layout"
      class="flex flex-col gap-6 @2xl:flex-row @2xl:items-start"
    >
      {#if navigation.position !== 'end'}
        <Slot name="page.sub-navigation.start.before" />
        <Nav {navigation} />
        <Slot name="page.sub-navigation.start.after" />
      {/if}
      <div class="flex min-w-0 flex-1 flex-col gap-6">{@render children?.()}</div>
      {#if navigation.position === 'end'}
        <Slot name="page.sub-navigation.end.before" />
        <Nav {navigation} />
        <Slot name="page.sub-navigation.end.after" />
      {/if}
    </div>
  </div>
{/if}
