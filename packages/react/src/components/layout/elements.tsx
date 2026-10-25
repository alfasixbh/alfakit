import type {
  CalloutSchema,
  EmptyStateComponentSchema,
  FlexSchema,
  IconSchema,
  ImageSchema,
  SchemaComponent,
  UnorderedListSchema,
} from '@alfakit/core'
import {
  actionsAlignmentClass,
  flexItemClasses,
  flexLayoutClasses,
  schemaGapClass,
} from '@alfakit/core'
import type { ReactElement } from 'react'
import { extraProps } from '../../lib/attributes'
import {
  colorClass,
  iconBackgroundColorClasses,
  iconSizeClasses,
  textColorClasses,
} from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { usePageActionContext } from '../actions/action-context'
import { ActionList } from '../actions/action-list'
import { useOptionalFormStore } from '../form/form-context'
import { useFieldActionContext } from '../schema/field-actions'
import { RenderComponent } from '../schema/schema-renderer'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { MixedContent } from './mixed-content'

export function FlexComponent({ component }: { component: FlexSchema }) {
  return (
    <div
      data-slot="flex"
      {...extraProps(
        component.extraAttributes,
        cn(flexLayoutClasses(component), schemaGapClass(component)),
      )}
    >
      {(component.schema ?? []).map((child: SchemaComponent) => (
        <div key={child.key} data-slot="flex-item" className={flexItemClasses(child)}>
          <RenderComponent component={child} />
        </div>
      ))}
    </div>
  )
}

const CALLOUT_COLORS: Record<string, string> = {
  primary: 'border-primary/30 bg-primary/5 [&_[data-slot=callout-icon]]:text-primary',
  secondary: 'border-border bg-secondary [&_[data-slot=callout-icon]]:text-secondary-foreground',
  success: 'border-success/30 bg-success/5 [&_[data-slot=callout-icon]]:text-success',
  warning: 'border-warning/40 bg-warning/10 [&_[data-slot=callout-icon]]:text-warning',
  danger: 'border-destructive/30 bg-destructive/5 [&_[data-slot=callout-icon]]:text-destructive',
  info: 'border-info/30 bg-info/5 [&_[data-slot=callout-icon]]:text-info',
  gray: 'border-border bg-muted/40 [&_[data-slot=callout-icon]]:text-muted-foreground',
}

const CALLOUT_ICON_SIZES: Record<string, string> = {
  xs: 'size-4',
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
  xl: 'size-7',
  '2xl': 'size-8',
}

export function CalloutComponent({ component }: { component: CalloutSchema }) {
  // Inside a form the actions run as field actions of this component, so `$get` / `$set`
  // reach the form (like a section's header actions).
  const form = useOptionalFormStore()
  const pageContext = usePageActionContext()
  const fieldContext = useFieldActionContext(component)
  const context = form ? fieldContext : pageContext
  const tone = component.color ?? component.status
  // `iconColor()`, or the status colour once `color(null)` removed the background.
  const iconColor = component.iconColor ?? (component.color ? undefined : component.status)

  return (
    <div
      data-slot="callout"
      data-color={component.color ?? 'gray'}
      data-status={component.status}
      role={tone === 'danger' || tone === 'warning' ? 'alert' : 'note'}
      {...extraProps(
        component.extraAttributes,
        cn(
          'flex items-start gap-3 rounded-lg border p-4 text-sm',
          colorClass(CALLOUT_COLORS, component.color),
        ),
      )}
    >
      {component.icon && (
        <span data-slot="callout-icon" className="mt-0.5 shrink-0">
          <Icon
            name={component.icon}
            className={cn(
              (component.iconSize && CALLOUT_ICON_SIZES[component.iconSize]) || 'size-5',
              iconColor && colorClass(textColorClasses, iconColor),
            )}
          />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {component.heading && <p className="leading-6 font-semibold">{component.heading}</p>}
        {component.description && (
          <div
            className="text-muted-foreground alfakit-prose"
            dangerouslySetInnerHTML={{ __html: component.description }}
          />
        )}
        {component.actions && component.actions.length > 0 && (
          <ActionList
            actions={component.actions}
            context={context}
            size="sm"
            className={cn('mt-2', actionsAlignmentClass(component.footerActionsAlignment))}
          />
        )}
        <MixedContent
          items={component.footer}
          name="callout-footer"
          className="mt-2"
          context={context}
        />
      </div>
      <MixedContent
        items={component.controls}
        name="callout-controls"
        className="-me-1 -mt-1 shrink-0 gap-1"
        context={context}
      />
    </div>
  )
}

export function EmptyStateComponent({ component }: { component: EmptyStateComponentSchema }) {
  // Inside a form the actions run as field actions of this component, so `$get` / `$set`
  // reach the form (like a section's header actions).
  const form = useOptionalFormStore()
  const pageContext = usePageActionContext()
  const fieldContext = useFieldActionContext(component)
  const context = form ? fieldContext : pageContext

  return (
    <div
      data-slot="empty-state"
      {...extraProps(
        component.extraAttributes,
        cn(
          'flex flex-col items-center justify-center gap-3 px-6 py-10 text-center',
          component.contained && 'rounded-xl border border-dashed',
        ),
      )}
    >
      {component.icon && (
        <div
          className={cn(
            'flex size-12 items-center justify-center rounded-full',
            colorClass(iconBackgroundColorClasses, component.color),
          )}
        >
          <Icon name={component.icon} className="size-6" />
        </div>
      )}
      {component.heading && <h3 className="text-base font-semibold">{component.heading}</h3>}
      {component.description && (
        <div
          className="text-muted-foreground max-w-md text-sm"
          dangerouslySetInnerHTML={{ __html: component.description }}
        />
      )}
      {component.actions && component.actions.length > 0 && (
        <ActionList actions={component.actions} context={context} className="mt-2 justify-center" />
      )}
      <MixedContent
        items={component.footer}
        name="empty-state-footer"
        className="justify-center"
        context={context}
      />
    </div>
  )
}

function withTooltip(element: ReactElement, tooltip?: string): ReactElement {
  if (!tooltip) return element

  return (
    <Tooltip>
      <TooltipTrigger asChild>{element}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}

export function IconComponent({ component }: { component: IconSchema }) {
  return withTooltip(
    <span
      data-slot="icon"
      {...extraProps(component.extraAttributes, 'inline-flex')}
      aria-label={component.tooltip}
      role={component.tooltip ? 'img' : undefined}
    >
      <Icon
        name={component.icon}
        aria-hidden
        className={cn(
          iconSizeClasses[component.size ?? 'md'] ?? 'size-5',
          component.color && textColorClasses[component.color],
        )}
      />
    </span>,
    component.tooltip,
  )
}

const IMAGE_ALIGNMENT: Record<string, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
}

export function ImageComponent({ component }: { component: ImageSchema }) {
  return (
    <div
      data-slot="image"
      {...extraProps(
        component.extraAttributes,
        cn('flex', IMAGE_ALIGNMENT[component.alignment ?? 'start'] ?? 'justify-start'),
      )}
    >
      {withTooltip(
        <img
          src={component.url}
          alt={component.alt}
          loading="lazy"
          className={cn(
            'max-w-full object-cover',
            component.circular ? 'rounded-full' : 'rounded-md',
          )}
          style={{
            width: component.imageWidth ?? undefined,
            height: component.imageHeight ?? undefined,
          }}
        />,
        component.tooltip,
      )}
    </div>
  )
}

const LIST_SIZES: Record<string, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
}

export function UnorderedListComponent({ component }: { component: UnorderedListSchema }) {
  return (
    <ul
      data-slot="unordered-list"
      {...extraProps(
        component.extraAttributes,
        cn(
          'marker:text-muted-foreground flex list-disc flex-col gap-1 ps-5',
          LIST_SIZES[component.size ?? 'sm'] ?? 'text-sm',
        ),
      )}
    >
      {(component.schema ?? []).map((child) => (
        <li key={child.key}>
          <RenderComponent component={child} />
        </li>
      ))}
    </ul>
  )
}
