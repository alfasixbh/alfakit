import type {
  ActionButtonSize,
  ActionContext,
  ActionGroupSchema,
  ActionSchema,
  AnyActionSchema,
} from '@alfakit/core'
import {
  bindsKeyBindings,
  flattenActionGroup,
  formatKeyBinding,
  iconButtonSize,
  isActionGroup,
  parseDropdownPlacement,
  registerKeyBindings,
  resolveActionSize,
} from '@alfakit/core'
import { useEffect, type ReactNode } from 'react'
import { useActionRunner, useT } from '../../context'
import {
  badgeColorClasses,
  colorClass,
  ghostButtonColorClasses,
  outlineButtonColorClasses,
  textColorClasses,
} from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { ActionButton } from './action-button'

export interface ActionListProps {
  actions: AnyActionSchema[]
  context: ActionContext
  size?: 'xs' | 'sm' | 'default' | 'lg'
  className?: string
  align?: 'start' | 'end'
  onTrigger?: (action: ActionSchema, context: ActionContext) => void | Promise<void>
}

/** A horizontal row of action buttons and dropdown groups. */
export function ActionList({
  actions,
  context,
  size = 'default',
  className,
  align = 'start',
  onTrigger,
}: ActionListProps) {
  if (actions.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2',
        align === 'end' && 'justify-end',
        className,
      )}
      data-slot="actions"
    >
      {actions.map((action, index) =>
        isActionGroup(action) ? (
          <ActionGroupMenu
            key={`group-${index}`}
            group={action}
            context={context}
            size={size}
            onTrigger={onTrigger}
          />
        ) : (
          <ActionButton
            key={action.name}
            action={action}
            context={context}
            size={size}
            onTrigger={onTrigger}
          />
        ),
      )}
    </div>
  )
}

/** `dropdownWidth()`: widths of the dropdown, spelled out for Tailwind. */
const DROPDOWN_WIDTHS: Record<string, string> = {
  '3xs': 'w-3xs',
  '2xs': 'w-2xs',
  xs: 'w-xs',
  sm: 'w-sm',
  md: 'w-md',
  lg: 'w-lg',
  xl: 'w-xl',
  '2xl': 'w-2xl',
  '3xl': 'w-3xl',
  '4xl': 'w-4xl',
  '5xl': 'w-5xl',
  '6xl': 'w-6xl',
  '7xl': 'w-7xl',
  none: 'w-auto',
  min: 'w-min',
  max: 'w-max',
  fit: 'w-fit',
  prose: 'w-[65ch]',
  container: 'container',
  'screen-sm': 'w-(--breakpoint-sm)',
  'screen-md': 'w-(--breakpoint-md)',
  'screen-lg': 'w-(--breakpoint-lg)',
  'screen-xl': 'w-(--breakpoint-xl)',
  'screen-2xl': 'w-(--breakpoint-2xl)',
  full: 'w-[calc(100vw-2rem)]',
  screen: 'w-screen',
}

/**
 * `buttonGroup()`: the group's actions as joined outline buttons; `dropdown(false)`: as
 * separate buttons in the row.
 */
function InlineActionGroup({
  group,
  context,
  size,
  onTrigger,
}: {
  group: ActionGroupSchema
  context: ActionContext
  size: ActionButtonSize
  onTrigger?: ActionListProps['onTrigger']
}) {
  const actions = flattenActionGroup(group.actions)

  if (!group.buttonGroup) {
    return (
      <>
        {actions.map((action) => (
          <ActionButton
            key={action.name}
            action={action}
            context={context}
            size={size}
            onTrigger={onTrigger}
          />
        ))}
      </>
    )
  }

  return (
    <div
      role="group"
      aria-label={group.label ?? group.tooltip}
      data-slot="button-group"
      className="inline-flex items-stretch rounded-md shadow-xs [&>*]:rounded-none [&>*]:shadow-none focus-within:[&>*]:relative [&>*:first-child]:rounded-s-md [&>*:focus-visible]:z-10 [&>*:last-child]:rounded-e-md [&>*:not(:first-child)]:-ms-px"
    >
      {actions.map((action) => (
        <ActionButton
          key={action.name}
          action={{
            ...action,
            variant: action.variant === 'icon-button' ? action.variant : 'outline',
          }}
          context={context}
          size={size}
          onTrigger={onTrigger}
        />
      ))}
    </div>
  )
}

export function ActionGroupMenu({
  group,
  context,
  size = 'default',
  onTrigger,
}: {
  group: ActionGroupSchema
  context: ActionContext
  size?: ActionButtonSize
  onTrigger?: ActionListProps['onTrigger']
}) {
  if (group.buttonGroup || group.dropdown === false) {
    return (
      <InlineActionGroup
        group={group}
        context={context}
        size={resolveActionSize(group.size, size)}
        onTrigger={onTrigger}
      />
    )
  }

  return <ActionGroupDropdown group={group} context={context} size={size} />
}

function ActionGroupDropdown({
  group,
  context,
  size = 'default',
}: {
  group: ActionGroupSchema
  context: ActionContext
  size?: ActionButtonSize
}) {
  const t = useT()
  const runner = useActionRunner()
  const isIconOnly = !group.label || group.variant === 'icon-button'
  const buttonSize = resolveActionSize(group.size, size)
  const placement = parseDropdownPlacement(group.dropdownPlacement)

  // Shortcuts of the actions inside the group work like those of standalone buttons (and,
  // like them, never for record rows).
  useEffect(() => {
    const bindings = flattenActionGroup(group.actions)
      .filter((action) => bindsKeyBindings(action, context))
      .map((action) => ({
        keys: action.keyBindings ?? [],
        handler: () => void runner.trigger(action, context),
      }))

    return bindings.length ? registerKeyBindings(bindings) : undefined
  }, [group, context, runner])

  const renderItems = (actions: AnyActionSchema[]): ReactNode[] =>
    actions.map((action, index) => {
      // `dropdown(false)`: a section of this dropdown, divided from its neighbours.
      if (isActionGroup(action) && action.dropdown === false) {
        return (
          <DropdownMenuGroup key={`section-${index}`} data-slot="dropdown-section">
            {index > 0 && <DropdownMenuSeparator />}
            {renderItems(action.actions)}
            {index < actions.length - 1 && !isDividedGroup(actions[index + 1]) && (
              <DropdownMenuSeparator />
            )}
          </DropdownMenuGroup>
        )
      }

      if (isActionGroup(action)) {
        return (
          <DropdownMenuSub key={`sub-${index}`}>
            <DropdownMenuSubTrigger>
              {action.icon && <Icon name={action.icon} />}
              {action.label}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>{renderItems(action.actions)}</DropdownMenuSubContent>
          </DropdownMenuSub>
        )
      }

      const shortcut = bindsKeyBindings(action, context) ? action.keyBindings?.[0] : undefined

      return (
        <DropdownMenuItem
          key={action.name}
          disabled={action.disabled}
          title={action.tooltip}
          variant={action.color === 'danger' ? 'destructive' : 'default'}
          className={cn(
            action.color && action.color !== 'danger' && action.color !== 'gray'
              ? colorClass(textColorClasses, action.color)
              : undefined,
          )}
          onSelect={() => void runner.trigger(action, context)}
        >
          {action.icon && <Icon name={action.icon} />}
          {action.label}
          {action.badge !== undefined && action.badge !== null && (
            <Badge
              variant="outline"
              className={cn(
                'px-1.5 py-0',
                colorClass(badgeColorClasses, action.badgeColor, 'gray'),
              )}
            >
              {action.badge}
            </Badge>
          )}
          {shortcut && <DropdownMenuShortcut>{formatKeyBinding(shortcut)}</DropdownMenuShortcut>}
        </DropdownMenuItem>
      )
    })

  const trigger = (
    <DropdownMenuTrigger asChild>
      <Button
        type="button"
        variant={group.variant === 'button' ? 'outline' : 'ghost'}
        size={isIconOnly ? iconButtonSize(buttonSize) : buttonSize}
        aria-label={
          isIconOnly ? (group.label ?? group.tooltip ?? t('actions', {}, 'Actions')) : undefined
        }
        className={cn(
          group.color &&
            colorClass(
              group.variant === 'button' ? outlineButtonColorClasses : ghostButtonColorClasses,
              group.color,
            ),
        )}
      >
        <Icon name={group.icon ?? 'ellipsis-vertical'} />
        {!isIconOnly && <span>{group.label}</span>}
      </Button>
    </DropdownMenuTrigger>
  )

  return (
    <DropdownMenu>
      {group.tooltip ? (
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent>{group.tooltip}</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      <DropdownMenuContent
        side={placement.side}
        align={placement.align}
        sideOffset={group.dropdownOffset ?? undefined}
        className={cn(
          group.dropdownWidth && DROPDOWN_WIDTHS[group.dropdownWidth],
          group.maxHeight && 'overflow-y-auto',
        )}
        style={group.maxHeight ? { maxHeight: group.maxHeight } : undefined}
      >
        {renderItems(group.actions)}
        {group.actions.length === 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>—</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function isDividedGroup(action: AnyActionSchema | undefined): boolean {
  return action !== undefined && isActionGroup(action) && action.dropdown === false
}
