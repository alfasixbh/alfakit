<script lang="ts">
  import type { ToggleColumnSchema } from '@alfakit/core'
  import { untrack } from 'svelte'
  import {
    colorClass,
    switchOffColorClasses,
    switchOnColorClasses,
    textColorClasses,
  } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { Checkbox } from '../ui/checkbox'
  import { Switch } from '../ui/switch'
  import { followCellState, useCellUpdate, type CellProps } from './cell-update.svelte'

  let props: CellProps = $props()

  const updater = useCellUpdate(() => props)
  let checked = $state(untrack(() => Boolean(props.cell.state)))
  followCellState(
    () => Boolean(props.cell.state),
    (next) => (checked = next),
  )
  const disabled = $derived(Boolean(props.cell.disabled) || updater.saving)
  const toggle = $derived(props.column as ToggleColumnSchema)

  const onChange = (next: boolean) => {
    checked = next
    // A refused update (validation, authorisation) puts the stored value back.
    void updater.update(next).then((saved) => {
      if (saved === false) checked = Boolean(props.cell.state)
    })
  }
</script>

{#if props.column.type === 'CheckboxColumn'}
  <Checkbox
    {checked}
    {disabled}
    aria-label={props.column.label || props.column.name}
    onCheckedChange={(value) => onChange(value === true)}
    onclick={(event: MouseEvent) => event.stopPropagation()}
  />
  {#if updater.error}<span class="text-destructive block text-xs">{updater.error}</span>{/if}
{:else}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <span class="inline-flex items-center gap-2" onclick={(event) => event.stopPropagation()}>
    <Switch
      {checked}
      {disabled}
      aria-label={props.column.label || props.column.name}
      onCheckedChange={onChange}
      class={cn(
        toggle.onColor && colorClass(switchOnColorClasses, toggle.onColor),
        toggle.offColor && colorClass(switchOffColorClasses, toggle.offColor),
      )}
    />
    {#if checked ? toggle.onIcon : toggle.offIcon}<Icon
        name={checked ? toggle.onIcon : toggle.offIcon}
        class={colorClass(textColorClasses, checked ? toggle.onColor : toggle.offColor, 'gray')}
      />{/if}
    {#if updater.error}<span class="text-destructive block text-xs">{updater.error}</span>{/if}
  </span>
{/if}
