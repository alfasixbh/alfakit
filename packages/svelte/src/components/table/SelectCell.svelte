<script lang="ts">
  import type { SelectColumnSchema } from '@alfakit/core'
  import type { CellProps } from './cell-update.svelte'
  import NativeSelectCell from './NativeSelectCell.svelte'
  import SelectComboboxCell from './SelectComboboxCell.svelte'

  let props: CellProps = $props()

  const native = $derived((props.column as SelectColumnSchema).native !== false)
</script>

{#if native}
  <NativeSelectCell {...props} />
{:else}
  <SelectComboboxCell {...props} />
{/if}
