import type { Color } from '@alfakit/core'
import { customColorClasses, isCustomColorName } from '@alfakit/core'

/**
 * Semantic colour → Tailwind class maps. Classes are spelled out so Tailwind's scanner
 * keeps them.
 */
export const badgeColorClasses: Record<string, string> = {
  primary: 'border-transparent bg-primary/10 text-primary dark:bg-primary/20',
  secondary: 'border-transparent bg-secondary text-secondary-foreground',
  success: 'border-transparent bg-success/10 text-success dark:bg-success/20',
  warning: 'border-transparent bg-warning/10 text-warning dark:bg-warning/20',
  danger: 'border-transparent bg-destructive/10 text-destructive dark:bg-destructive/20',
  info: 'border-transparent bg-info/10 text-info dark:bg-info/20',
  gray: 'border-transparent bg-muted text-muted-foreground',
}

export const textColorClasses: Record<string, string> = {
  primary: 'text-primary',
  secondary: 'text-secondary-foreground',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
  info: 'text-info',
  gray: 'text-muted-foreground',
}

export const solidButtonColorClasses: Record<string, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  success: 'bg-success text-success-foreground hover:bg-success/90',
  warning: 'bg-warning text-warning-foreground hover:bg-warning/90',
  danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  info: 'bg-info text-info-foreground hover:bg-info/90',
  gray: 'bg-muted text-foreground hover:bg-muted/80',
}

export const outlineButtonColorClasses: Record<string, string> = {
  primary: 'border-primary/40 text-primary hover:bg-primary/10',
  secondary: 'border-border text-secondary-foreground hover:bg-secondary',
  success: 'border-success/40 text-success hover:bg-success/10',
  warning: 'border-warning/50 text-warning hover:bg-warning/10',
  danger: 'border-destructive/40 text-destructive hover:bg-destructive/10',
  info: 'border-info/40 text-info hover:bg-info/10',
  gray: 'border-border text-foreground hover:bg-accent',
}

export const ghostButtonColorClasses: Record<string, string> = {
  primary: 'text-primary hover:bg-primary/10',
  secondary: 'text-secondary-foreground hover:bg-secondary',
  success: 'text-success hover:bg-success/10',
  warning: 'text-warning hover:bg-warning/10',
  danger: 'text-destructive hover:bg-destructive/10',
  info: 'text-info hover:bg-info/10',
  gray: 'text-muted-foreground hover:bg-accent hover:text-foreground',
}

/** Switch track colour when on (`onColor()`), for Toggle fields and ToggleColumn. */
export const switchOnColorClasses: Record<string, string> = {
  primary: 'data-[state=checked]:bg-primary',
  secondary: 'data-[state=checked]:bg-secondary-foreground',
  success: 'data-[state=checked]:bg-success',
  warning: 'data-[state=checked]:bg-warning',
  danger: 'data-[state=checked]:bg-destructive',
  info: 'data-[state=checked]:bg-info',
  gray: 'data-[state=checked]:bg-muted-foreground',
}

/** Switch track colour when off (`offColor()`); repeats the dark variant it replaces. */
export const switchOffColorClasses: Record<string, string> = {
  primary: 'data-[state=unchecked]:bg-primary dark:data-[state=unchecked]:bg-primary',
  secondary:
    'data-[state=unchecked]:bg-secondary-foreground dark:data-[state=unchecked]:bg-secondary-foreground',
  success: 'data-[state=unchecked]:bg-success dark:data-[state=unchecked]:bg-success',
  warning: 'data-[state=unchecked]:bg-warning dark:data-[state=unchecked]:bg-warning',
  danger: 'data-[state=unchecked]:bg-destructive dark:data-[state=unchecked]:bg-destructive',
  info: 'data-[state=unchecked]:bg-info dark:data-[state=unchecked]:bg-info',
  gray: 'data-[state=unchecked]:bg-muted-foreground dark:data-[state=unchecked]:bg-muted-foreground',
}

/** Square icon sizes (IconColumn / IconEntry `size()`). */
export const iconSizeClasses: Record<string, string> = {
  xs: 'size-3',
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
  xl: 'size-8',
  '2xl': 'size-10',
}

export const iconBackgroundColorClasses: Record<string, string> = {
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary text-secondary-foreground',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-destructive/10 text-destructive',
  info: 'bg-info/10 text-info',
  gray: 'bg-muted text-muted-foreground',
}

/** The themes.css utility each map uses for custom colour names (`colors(['brand' => …])`). */
const customColorUtilities = new Map<Record<string, string>, string>([
  [badgeColorClasses, 'alfakit-soft'],
  [textColorClasses, 'alfakit-text'],
  [solidButtonColorClasses, 'alfakit-solid'],
  [outlineButtonColorClasses, 'alfakit-outline'],
  [ghostButtonColorClasses, 'alfakit-ghost'],
  [switchOnColorClasses, 'alfakit-switch-on'],
  [switchOffColorClasses, 'alfakit-switch-off'],
  [iconBackgroundColorClasses, 'alfakit-soft'],
])

export function colorClass(
  map: Record<string, string>,
  color: Color | undefined | null,
  fallback = 'gray',
): string {
  // A custom panel colour: the generic utility pointed at `--alfakit-{name}`.
  if (color && !(color in map) && isCustomColorName(color)) {
    const utility = customColorUtilities.get(map)

    if (utility) return customColorClasses(color, utility)
  }

  return map[color ?? fallback] ?? map[fallback] ?? ''
}

/** Resolve a semantic colour to a CSS colour value for inline styles (charts, swatches). */
export function cssColor(color: Color | undefined | null): string {
  switch (color) {
    case 'primary':
      return 'var(--primary)'
    case 'success':
      return 'var(--success)'
    case 'warning':
      return 'var(--warning)'
    case 'danger':
      return 'var(--destructive)'
    case 'info':
      return 'var(--info)'
    case 'secondary':
      return 'var(--secondary-foreground)'
    case 'gray':
    case undefined:
    case null:
      return 'var(--muted-foreground)'
    default:
      // A custom panel colour (`colors(['brand' => …])`), else the CSS value itself.
      return isCustomColorName(color) ? `var(--alfakit-${color}, ${color})` : color
  }
}
