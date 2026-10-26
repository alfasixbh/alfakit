import type { ActionContext, ActionSchema } from '@alfakit/core'
import {
  bindsKeyBindings,
  formatKeyBinding,
  iconButtonSize,
  isActionLoading,
  isActionProcessing,
  registerKeyBindings,
  resolveActionSize,
} from '@alfakit/core'
import { Link } from '@inertiajs/react'
import { useEffect, type MouseEvent } from 'react'
import { useActionRunner, useT } from '../../context'
import { useStoreSelector } from '../../hooks/use-store'
import { extraProps } from '../../lib/attributes'
import {
  badgeColorClasses,
  colorClass,
  ghostButtonColorClasses,
  outlineButtonColorClasses,
  solidButtonColorClasses,
  textColorClasses,
} from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Spinner } from '../ui/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'

/** `labeledFrom()`: the label shows from the breakpoint up. */
const LABEL_FROM: Record<string, string> = {
  sm: 'hidden sm:inline',
  md: 'hidden md:inline',
  lg: 'hidden lg:inline',
  xl: 'hidden xl:inline',
  '2xl': 'hidden 2xl:inline',
}

/** `labeledFrom()`: square (icon-only) padding below the breakpoint. */
const ICON_ONLY_BELOW: Record<string, string> = {
  sm: 'max-sm:aspect-square max-sm:px-0',
  md: 'max-md:aspect-square max-md:px-0',
  lg: 'max-lg:aspect-square max-lg:px-0',
  xl: 'max-xl:aspect-square max-xl:px-0',
  '2xl': 'max-2xl:aspect-square max-2xl:px-0',
}

export interface ActionButtonProps {
  action: ActionSchema
  context: ActionContext
  size?: 'xs' | 'sm' | 'default' | 'lg'
  className?: string
  /** Force a variant (e.g. menu items render as plain rows). */
  variant?: ActionSchema['variant']
  /** Bind the action's key bindings globally while mounted. */
  withKeyBindings?: boolean
  /** Override how the action runs (e.g. a form submits its values). */
  onTrigger?: (action: ActionSchema, context: ActionContext) => void | Promise<void>
}

/** The badge trigger style (`badge()` without an argument). */
const BADGE_TRIGGER_CLASSES =
  "h-auto min-h-6 gap-1 rounded-md border px-2 py-0.5 text-xs font-medium [&_svg:not([class*='size-'])]:size-3.5"

function buttonClasses(action: ActionSchema, variant: ActionSchema['variant']): string {
  const color = action.color ?? 'primary'

  switch (variant) {
    case 'outline':
      return cn('bg-background border', colorClass(outlineButtonColorClasses, color, 'gray'))
    case 'ghost':
      return colorClass(ghostButtonColorClasses, color, 'gray')
    case 'link':
      return cn(
        'h-auto p-0 underline-offset-4 hover:underline has-[>svg]:px-0',
        colorClass(textColorClasses, color, 'primary'),
      )
    case 'icon-button':
      return colorClass(ghostButtonColorClasses, color, 'gray')
    case 'badge':
      // `badge()`: a tinted pill in the action's colour.
      return cn(BADGE_TRIGGER_CLASSES, colorClass(badgeColorClasses, color, 'primary'))
    default:
      return colorClass(solidButtonColorClasses, color, 'primary')
  }
}

export function ActionButton({
  action,
  context,
  size = 'default',
  className,
  variant: variantProp,
  withKeyBindings = true,
  onTrigger,
}: ActionButtonProps) {
  const runner = useActionRunner()
  const t = useT()
  // Only this run (this record's button), not the same action in every table row.
  const loading = useStoreSelector(runner.store, (state) => isActionLoading(state, action, context))
  const processing = useStoreSelector(runner.store, (state) =>
    isActionProcessing(state, action, context),
  )

  const variant =
    variantProp ??
    (action.outlined
      ? 'outline'
      : (action.variant ?? (action.hasAction || action.hasModal || action.url ? 'link' : 'button')))
  const isIconOnly = variant === 'icon-button' || !action.label
  // `labeledFrom()`: icon only on small screens, so the label must be the accessible name.
  const labeledFrom = !isIconOnly && action.icon && action.labeledFrom ? action.labeledFrom : null
  const busy = loading || processing
  // Record actions repeat per row: a global shortcut would run them for every record.
  const bindsKeys = withKeyBindings && bindsKeyBindings(action, context)

  useEffect(() => {
    if (!bindsKeys || !action.keyBindings) {
      return
    }

    return registerKeyBindings([
      {
        keys: action.keyBindings,
        handler: () =>
          void (onTrigger ? onTrigger(action, context) : runner.trigger(action, context)),
      },
    ])
  }, [action, context, runner, bindsKeys, onTrigger])

  // A disabled link renders as a disabled button so it cannot navigate.
  const isPlainLink = Boolean(
    action.url && !action.hasAction && !action.hasModal && !action.disabled,
  )

  const onClick = (event: MouseEvent) => {
    if (isPlainLink) {
      return // Plain link: let Inertia Link / anchor handle it.
    }

    event.preventDefault()
    void (onTrigger ? onTrigger(action, context) : runner.trigger(action, context))
  }

  const content = (
    <>
      {busy ? (
        <Spinner />
      ) : action.icon && action.iconPosition !== 'after' ? (
        <Icon name={action.icon} />
      ) : null}
      {!isIconOnly && (
        <span className={labeledFrom ? LABEL_FROM[labeledFrom] : undefined}>{action.label}</span>
      )}
      {action.icon && action.iconPosition === 'after' && !busy && <Icon name={action.icon} />}
      {action.badge !== undefined && action.badge !== null && (
        <Badge
          variant="outline"
          className={cn(
            'ms-1 px-1.5 py-0',
            colorClass(badgeColorClasses, action.badgeColor, 'gray'),
          )}
        >
          {action.badge}
        </Badge>
      )}
    </>
  )

  const accessibleName = action.label ?? action.tooltip ?? action.name
  const newTabHint = t('opens_in_new_tab', {}, '(opens in a new tab)')
  const buttonSize = variant === 'badge' ? 'xs' : resolveActionSize(action.size, size)
  const sizeProp = isIconOnly ? iconButtonSize(buttonSize) : buttonSize
  const classes = cn(
    buttonClasses(action, variant),
    labeledFrom && ICON_ONLY_BELOW[labeledFrom],
    className,
  )
  const ariaLabel = isIconOnly || labeledFrom ? accessibleName : undefined

  const button = isPlainLink ? (
    action.download ? (
      // `download()`: a plain link that saves the file (an Inertia visit would discard it).
      <Button
        asChild
        variant="plain"
        size={sizeProp}
        disabled={action.disabled}
        aria-label={ariaLabel}
        {...extraProps(action.extraAttributes, classes)}
      >
        <a href={action.url} download="">
          {content}
        </a>
      </Button>
    ) : action.openUrlInNewTab ? (
      <Button
        asChild
        variant="plain"
        size={sizeProp}

        disabled={action.disabled}
        aria-label={ariaLabel ? `${ariaLabel} ${newTabHint}` : undefined}
        {...extraProps(action.extraAttributes, classes)}
      >
        <a href={action.url} target="_blank" rel="noopener noreferrer">
          {content}
          {!isIconOnly && <span className="sr-only"> {newTabHint}</span>}
        </a>
      </Button>
    ) : (
      <Button
        asChild
        variant="plain"
        size={sizeProp}

        disabled={action.disabled}
        aria-label={ariaLabel}
        {...extraProps(action.extraAttributes, classes)}
      >
        <Link href={action.url ?? '#'}>{content}</Link>
      </Button>
    )
  ) : (
    <Button
      type="button"
      variant="plain"
      size={sizeProp}

      disabled={action.disabled || busy}
      onClick={onClick}
      aria-label={ariaLabel}
      {...extraProps(action.extraAttributes, classes)}
    >
      {content}
    </Button>
  )

  const tooltip = action.tooltip ?? (isIconOnly ? action.label : undefined)
  const shortcut = bindsKeys ? action.keyBindings?.[0] : undefined

  if (!tooltip && !shortcut) {
    return button
  }

  // A disabled button gets no pointer or focus events, so a focusable wrapper carries the
  // tooltip (e.g. the reason from `authorizationTooltip()`).
  const trigger =
    action.disabled && tooltip ? (
      <span tabIndex={0} className="inline-flex" data-slot="action-disabled-tooltip">
        {button}
      </span>
    ) : (
      button
    )

  return (
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent>
        {tooltip}
        {shortcut && (
          <kbd dir="ltr" className="ms-2 rounded border border-white/20 px-1 font-mono text-[10px]">
            {formatKeyBinding(shortcut)}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  )
}
