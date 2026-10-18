/**
 * Shared primitives of the Alfakit schema contract. Every value here mirrors what the
 * PHP side serialises; renderers must not invent extra semantics.
 */

/** Tailwind container-query sizes (`@md` = the parent container is at least 28rem wide). */
export type ContainerBreakpoint =
  | '@3xs'
  | '@2xs'
  | '@xs'
  | '@sm'
  | '@md'
  | '@lg'
  | '@xl'
  | '@2xl'
  | '@3xl'
  | '@4xl'
  | '@5xl'
  | '@6xl'
  | '@7xl'

/**
 * Responsive map keyed by Tailwind breakpoint (`default`, `sm`, `md`, `lg`, `xl`, `2xl`) or
 * by container size (`@md`, `@xl`…), which follows the width of the surrounding container.
 */
export type Breakpoints<T = number | null> = Partial<
  Record<'default' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | ContainerBreakpoint, T>
>

export type ColumnSpanValue = number | 'full' | null

/**
 * Windowed rendering for a long list (Repeater and Builder items, table rows): present when
 * the server left it on, absent when `virtualize(false)` turned it off.
 */
export interface VirtualizeSchema {
  /** Render only the visible window once the list has more items than this. */
  threshold: number
  /** Height estimate (px) for items not yet measured; the renderer has a default per kind. */
  estimateSize?: number
}

export type Color =
  'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'gray' | (string & {})

export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

export type Width =
  | '3xs'
  | '2xs'
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | '2xl'
  | '3xl'
  | '4xl'
  | '5xl'
  | '6xl'
  | '7xl'
  | 'none'
  | 'full'
  | 'min'
  | 'max'
  | 'fit'
  | 'prose'
  | 'container'
  | 'screen-sm'
  | 'screen-md'
  | 'screen-lg'
  | 'screen-xl'
  | 'screen-2xl'
  | 'screen'

export type Alignment = 'start' | 'center' | 'end' | 'between' | 'justify'

export type VerticalAlignment = 'start' | 'center' | 'end'

export type IconPosition = 'before' | 'after'

export type ActionVariant = 'button' | 'outline' | 'ghost' | 'link' | 'icon-button'

export type Operation = 'create' | 'edit' | 'view' | (string & {})

/** A Lucide icon name, e.g. `users`, `shopping-cart`. */
export type IconName = string

export type RecordKey = string | number

export interface Option {
  value: string
  label: string
  description?: string
  icon?: IconName
  color?: Color
  disabled?: boolean
}

export interface OptionGroup {
  label: string
  options: Option[]
}

export type OptionOrGroup = Option | OptionGroup

export function isOptionGroup(option: OptionOrGroup): option is OptionGroup {
  return 'options' in option && Array.isArray(option.options)
}

export type Attributes = Record<string, unknown>
