<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    breadcrumbs = [],
    children,
  }: { breadcrumbs?: { title: string; href: string }[]; children?: Snippet } = $props()
</script>

<div data-testid="host-layout">
  <nav aria-label="breadcrumb">{breadcrumbs.map((crumb) => crumb.title).join(' / ')}</nav>
  {@render children?.()}
</div>
