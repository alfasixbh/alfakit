<script lang="ts">
  import type { TreeSchema, TreeWidgetSchema } from '@alfakit/core'
  import TreeView from './TreeView.svelte'

  /** The tree of a `TreePage` (schema component `tree`) or a `TreeWidget` (alfasix/alfakit-tree). */
  let { component, widget }: { component?: TreeSchema; widget?: TreeWidgetSchema } = $props()

  const tree = $derived(component ?? widget?.tree)
</script>

{#if tree}
  {#key tree.actionComponent}
    <TreeView {tree} />
  {/key}
{/if}
