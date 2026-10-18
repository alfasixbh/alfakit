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
  import { useCellUpdate, type CellProps } from './cell-update.svelte'

  let props: CellProps = $props()

  const updater = useCellUpdate(() => props)
  let checked = $state(untrack(() => Boolean(props.cell.state)))
  const disabled = $derived(Boolean(props.cell.disabled) || updater.saving)
  const toggle = $derived(props.column as ToggleColumnSchema)

  const onChange = (next: boolean) => {
    checked = next
    void updater.update(next)
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
  </span>
{/if}
