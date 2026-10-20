<script lang="ts" module>
  import type { StandaloneComponentSchema } from '@alfakit/core'
  import type { AnyComponent } from '../context.svelte'
  import { lazyLoader } from '../lib/lazy'

  type LoadedProps = {
    component: StandaloneComponentSchema
    components?: Record<string, AnyComponent>
    class?: string
  }

  // The widgets' code loads once mounted in the browser (never during SSR).
  const loader = lazyLoader<LoadedProps>(() =>
    import('../standalone/AlfakitComponent.svelte').then((module) => module.default),
  )
</script>

<script lang="ts">
  import { standaloneWidgetCount, starterKitDashboardWidgets } from '@alfakit/core'
  import { page } from '@inertiajs/svelte'
  import type { Snippet } from 'svelte'
  import Lazy from '../lib/Lazy.svelte'

  /**
   * The dashboard widgets of a `starterKit()` panel on the host's own dashboard. Reads the
   * `alfakitWidgets` prop (shared on the panel's `starterKitDashboard()` pages only, the
   * starter kit's `/dashboard` by default) and renders the widgets with the host's theme,
   * as `<AlfakitComponent>` renders standalone widgets: lazy widgets, polling and table
   * widget actions go through the panel's endpoints. Its code loads once mounted; the
   * server render and hydration show placeholders. Renders `children` (the kit's
   * placeholder boxes) when there are no widgets to show: other pages, guests, users who
   * may not open the panel.
   *
   * ```svelte
   * <AlfakitWidgets>
   *   <MyEmptyState />
   * </AlfakitWidgets>
   * ```
   */
  let {
    panel,
    components,
    class: className,
    children,
  }: {
    /** The `starterKit()` panel whose widgets to show (the first one by default). */
    panel?: string
    /** Frontend components of custom widgets (`{ RevenueWidget }`), as for `<AlfakitComponent>`. */
    components?: Record<string, AnyComponent>
    class?: string
    /** Rendered instead when there are no widgets to show. */
    children?: Snippet
  } = $props()

  const component = $derived(starterKitDashboardWidgets(page.props, panel))
</script>

{#if component}
  {@const value = component}
  <div data-slot="starter-kit-widgets">
    <Lazy {loader} props={{ component: value, components, class: className }}>
      {#snippet fallback()}
        <div
          data-slot="starter-kit-widgets-placeholder"
          aria-busy="true"
          class={['grid auto-rows-min gap-4 md:grid-cols-2', className]}
        >
          {#each { length: Math.max(standaloneWidgetCount(value), 1) }, index (index)}
            <div aria-hidden="true" class="bg-muted h-28 animate-pulse rounded-xl"></div>
          {/each}
        </div>
      {/snippet}
    </Lazy>
  </div>
{:else}
  {@render children?.()}
{/if}
