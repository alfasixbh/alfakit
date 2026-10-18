import type { TriggerButtonView } from '@alfakit/core'
import type { ComponentProps, ReactNode } from 'react'
import {
  badgeColorClasses,
  colorClass,
  outlineButtonColorClasses,
  solidButtonColorClasses,
  textColorClasses,
} from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'

export interface TableTriggerButtonProps extends Omit<ComponentProps<'button'>, 'children'> {
  view: TriggerButtonView
  /** Icon of the default look; a server icon (`->icon()`) replaces it. */
  defaultIcon?: ReactNode
  /** The default look hides the label below `sm` (icon only on phones). */
  responsiveLabel?: boolean
  /** Highlight the default look (active filters, an active grouping). */
  active?: boolean
}

/**
 * A table toolbar button (filters, column manager, grouping, reordering, apply / reset)
 * in its default look or as customised with `filtersTriggerAction()` & co. Extra props
 * (`aria-*`, handlers, the ref of a popover trigger) reach the button.
 */
export function TableTriggerButton({
  view,
  defaultIcon,
  responsiveLabel = false,
  active = false,
  className,
  disabled,
  ...props
}: TableTriggerButtonProps) {
  const icon = view.icon ? <Icon name={view.icon} /> : defaultIcon
  const iconOnly = !view.showLabel
  const colored = view.color
    ? view.variant === 'default'
      ? colorClass(solidButtonColorClasses, view.color, 'primary')
      : view.variant === 'outline'
        ? colorClass(outlineButtonColorClasses, view.color, 'gray')
        : colorClass(textColorClasses, view.color, 'primary')
    : undefined

  return (
    <Button
      type="button"
      variant={view.variant}
      size={
        iconOnly
          ? view.size === 'xs'
            ? 'icon-xs'
            : view.size === 'lg'
              ? 'icon'
              : 'icon-sm'
          : view.size
      }
      title={view.tooltip}
      aria-label={iconOnly ? view.label : undefined}
      data-slot="table-trigger"
      {...props}
      disabled={view.disabled || disabled}
      className={cn(
        colored,
        active && !view.color && view.variant === 'outline' && 'border-primary/50 text-primary',
        className,
      )}
    >
      {!view.iconAfter && icon}
      {!iconOnly && (
        <span className={cn(responsiveLabel && icon ? 'sr-only sm:not-sr-only' : undefined)}>
          {view.label}
        </span>
      )}
      {view.iconAfter && icon}
      {view.badge !== undefined && view.badge !== null && view.badge !== 0 && (
        <Badge
          className={cn(
            'ms-1 h-5 min-w-5 px-1',
            view.badgeColor && colorClass(badgeColorClasses, view.badgeColor, 'primary'),
          )}
        >
          {view.badge}
        </Badge>
      )}
    </Button>
  )
}
