<script lang="ts">
  import FormattedText from '../entries/FormattedText.svelte'
  import type { CellProps } from './cell-update.svelte'

  let { column, cell }: CellProps = $props()

  const position = $derived(
    (column as { descriptionPosition?: 'above' | 'below' }).descriptionPosition ?? 'below',
  )
  const schema = $derived({
    ...(column as object),
    color: cell.color,
    icon: cell.icon,
    iconPosition: cell.iconPosition,
    iconColor: cell.iconColor,
    itemColors: cell.itemColors,
    itemIcons: cell.itemIcons,
    itemUrls: cell.itemUrls,
  })
</script>

<div class="flex flex-col gap-0.5">
  {#if position === 'above' && cell.description}<span class="text-muted-foreground block text-xs"
      >{cell.description}</span
    >{/if}
  <FormattedText value={cell.state} {schema} />
  {#if position === 'below' && cell.description}<span class="text-muted-foreground block text-xs"
      >{cell.description}</span
    >{/if}
</div>
