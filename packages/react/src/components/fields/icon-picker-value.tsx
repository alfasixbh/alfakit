import { isCustomSvgIcon, type IconPickerSchema } from '@alfakit/core'
import { useT } from '../../context'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'

/** Icon sizes per `previewSize()`: the drawn icon and its grid cell. */
export const ICON_PICKER_SIZES = {
  sm: { icon: 'size-4', cell: 'h-8' },
  md: { icon: 'size-5', cell: 'h-10' },
  lg: { icon: 'size-6', cell: 'h-12' },
} as const

/** The selected icon and its name (or the placeholder), inside the picker's trigger. */
export function IconPickerValue({
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
}) {
  const t = useT()
  const size = ICON_PICKER_SIZES[component.previewSize] ?? ICON_PICKER_SIZES.md
  const custom = isCustomSvgIcon(value)

  if (!value) {
    return (
      <span id={id} className="text-muted-foreground truncate">
        {component.placeholder ?? t('form.icon_picker.placeholder', {}, 'Choose an icon')}
      </span>
    )
  }

  return (
    <span id={id} data-slot="icon-picker-value" className="flex min-w-0 items-center gap-2">
      <Icon name={preview ?? 'square-code'} className={cn(size.icon)} />
      <span className="truncate">
        {custom ? t('form.icon_picker.custom_svg', {}, 'Custom SVG') : value}
      </span>
    </span>
  )
}
