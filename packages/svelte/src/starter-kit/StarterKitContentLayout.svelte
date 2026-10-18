<script lang="ts">
  import type { BreadcrumbSchema, Width } from '@alfakit/core'
  import type { Snippet } from 'svelte'
  import Slot from '../components/panel/Slot.svelte'
  import { usePanel } from '../context.svelte'
  import { MAX_WIDTHS } from '../layouts/max-widths'
  import { cn } from '../lib/utils'

  /**
   * The content area of an Alfakit page inside the host layout: what `layout:app` renders in
   * starter kit mode instead of Alfakit's sidebar and top bar. Replace it with
   * `createStarterKitLayout({ components: { 'layout:app': MyContent } })`.
   */
  let {
    maxContentWidth,
    children,
  }: { breadcrumbs?: BreadcrumbSchema[]; maxContentWidth?: Width | string; children?: Snippet } =
    $props()

  const panel = $derived(usePanel())
  // The host's pages fill the content area, so starter kit pages default to the full width.
  const width = $derived(maxContentWidth ?? panel.maxContentWidth ?? 'full')
</script>

<div
  data-slot="content"
  data-alfakit-embedded=""
  class={cn(
    'mx-auto flex w-full min-w-0 flex-1 flex-col gap-6 p-4 md:p-6',
    MAX_WIDTHS[width] ?? 'max-w-full',
  )}
>
  <Slot name="content.start" />
  {@render children?.()}
  <Slot name="content.end" />
</div>
