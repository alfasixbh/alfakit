<script lang="ts">
  import type { ActionContext, ItemActionSchema } from '@alfakit/core'
  import ItemActionButton from './ItemActionButton.svelte'

  /** "Collapse all" / "Expand all" above collapsible items. */
  interface Props {
    context: ActionContext
    collapseAll: ItemActionSchema | null
    expandAll: ItemActionSchema | null
    onCollapseAll: () => void
    onExpandAll: () => void
  }

  let { context, collapseAll, expandAll, onCollapseAll, onExpandAll }: Props = $props()
</script>

{#if collapseAll || expandAll}
  <div class="flex justify-end gap-3" data-slot="item-collapse-actions">
    <ItemActionButton action={collapseAll} {context} onClient={onCollapseAll} />
    <ItemActionButton action={expandAll} {context} onClient={onExpandAll} />
  </div>
{/if}
