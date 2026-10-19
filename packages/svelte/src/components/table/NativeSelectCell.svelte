<script lang="ts">
  import type { SelectColumnSchema } from '@alfakit/core'
  import { isOptionGroup } from '@alfakit/core'
  import { untrack } from 'svelte'
  import { cn } from '../../lib/utils'
  import { useCellUpdate, type CellProps } from './cell-update.svelte'

  let props: CellProps = $props()

  const schema = $derived(props.column as SelectColumnSchema)
  const updater = useCellUpdate(() => props)
  const errorId = $props.id()
  let value = $state(
    untrack(() =>
      props.cell.state === null || props.cell.state === undefined ? '' : String(props.cell.state),
    ),
  )
  // `ignoreRecord()`: the record itself is not an option (e.g. a parent of itself).
  const options = $derived(
    schema.options
      .flatMap((option) => (isOptionGroup(option) ? option.options : [option]))
      .filter((option) => !(schema.ignoreRecord && option.value === String(props.recordKey))),
  )
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<span onclick={(event) => event.stopPropagation()}>
  <select
    bind:value
    disabled={Boolean(props.cell.disabled) || updater.saving}
    onchange={() => void updater.update(value === '' ? null : value)}
    aria-label={props.column.label || props.column.name}
    aria-invalid={updater.error ? true : undefined}
    aria-describedby={updater.error ? errorId : undefined}
    class={cn(
      'border-input focus-visible:ring-ring/50 dark:bg-input/30 h-8 min-w-32 rounded-md border bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]',
      updater.error && 'border-destructive',
    )}
  >
    {#if schema.selectablePlaceholder}<option value="">{schema.placeholder ?? ''}</option>{/if}
    {#each options as option (option.value)}
      <option value={option.value} disabled={option.disabled}>{option.label}</option>
    {/each}
  </select>
  {#if updater.error}<span id={errorId} class="text-destructive block text-xs">{updater.error}</span
    >{/if}
</span>
