import type { BaseField } from './components'

/** An icon set the picker offers (`IconPicker::sets()`). */
export interface IconPickerSetSchema {
  /** `lucide`, an Iconify or directory set prefix (`mdi`) or `heroicon-o`. */
  key: string
  label: string
}

/** `IconPicker::make()`: pick an icon name; search runs on the server, a page at a time. */
export interface IconPickerSchema extends BaseField {
  type: 'IconPicker'
  sets: IconPickerSetSchema[]
  searchable: boolean
  /** Icons per row of the grid. */
  gridColumns: number
  previewSize: 'sm' | 'md' | 'lg'
  /** `allowCustomSvg()`: users may paste SVG markup, sanitised on the server. */
  allowCustomSvg?: boolean
  /** The value the server rendered and what to draw for it (`Icons::resolve()`). */
  selected?: IconPickerOption
}

/** One icon of a picker search: the value to store and what to draw. */
export interface IconPickerOption {
  value: string
  /** A Lucide name, an image URL or sanitised SVG markup. */
  icon: string | null
}

/** Response of the options endpoint for an IconPicker (`path`, `search`, `set`, `page`). */
export interface IconPickerResponse {
  icons: IconPickerOption[]
  page: number
  hasMore: boolean
  total: number
}
