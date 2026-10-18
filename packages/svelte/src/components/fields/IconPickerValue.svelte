<script lang="ts">
  import { isCustomSvgIcon, type IconPickerSchema } from '@alfakit/core'
  import { useT } from '../../context.svelte'
  import Icon from '../../lib/Icon.svelte'
  import { ICON_PICKER_SIZES } from './icon-picker-sizes'

  /** The selected icon and its name (or the placeholder), inside the picker's trigger. */
  let {
    id,
    component,
    value,
    preview,
  }: {
    /** Named by the trigger's `aria-labelledby`, after the field label. */
    id: string
    component: IconPickerSchema
    value: string | null
    preview: string | null
  } = $props()

  const t = useT()
  const size = $derived(ICON_PICKER_SIZES[component.previewSize] ?? ICON_PICKER_SIZES.md)
</script>

{#if !value}
  <span {id} class="text-muted-foreground truncate"
    >{component.placeholder ?? t('form.icon_picker.placeholder', {}, 'Choose an icon')}</span
  >
{:else}
  <span {id} data-slot="icon-picker-value" class="flex min-w-0 items-center gap-2">
    <Icon name={preview ?? 'square-code'} class={size.icon} />
    <span class="truncate"
      >{isCustomSvgIcon(value) ? t('form.icon_picker.custom_svg', {}, 'Custom SVG') : value}</span
    >
  </span>
{/if}
