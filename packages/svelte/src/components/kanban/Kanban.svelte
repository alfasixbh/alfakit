<script lang="ts">
  import type { KanbanSchema, KanbanWidgetSchema } from '@alfakit/core'
  import KanbanBoard from './KanbanBoard.svelte'

  /** The board of a `KanbanPage` (schema component `kanban`) or a `KanbanWidget` (alfasix/alfakit-kanban). */
  let { component, widget }: { component?: KanbanSchema; widget?: KanbanWidgetSchema } = $props()

  const board = $derived(component ?? widget?.kanban)
</script>

{#if board}
  {#key board.actionComponent}
    <KanbanBoard {board} />
  {/key}
{/if}
