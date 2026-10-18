import type { HtmlSchema, PlaceholderSchema, TextSchema, ViewSchema } from '@alfakit/core'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { createElement, useState } from 'react'
import { useRegistry, useT } from '../../context'
import { extraProps } from '../../lib/attributes'
import { badgeColorClasses, colorClass, textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/badge'
import { Label } from '../ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'

export function PlaceholderComponent({ component }: { component: PlaceholderSchema }) {
  return (
    <div data-slot="field" {...extraProps(component.extraAttributes, 'flex flex-col gap-1.5')}>
      {component.label && <Label>{component.label}</Label>}
      <div
        className="text-sm leading-6"
        dangerouslySetInnerHTML={{ __html: component.content ?? '' }}
      />
      {component.helperText && (
        <p className="text-muted-foreground text-xs">{component.helperText}</p>
      )}
    </div>
  )
}

export function HtmlComponent({ component }: { component: HtmlSchema }) {
  return (
    <div
      dangerouslySetInnerHTML={{ __html: component.content }}
      {...extraProps(component.extraAttributes, 'alfakit-prose text-sm')}
    />
  )
}

const SIZES: Record<string, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
}
const WEIGHTS: Record<string, string> = {
  thin: 'font-thin',
  light: 'font-light',
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
  black: 'font-black',
}

const FONT_FAMILIES: Record<string, string> = {
  sans: 'font-sans',
  serif: 'font-serif',
  mono: 'font-mono',
}

/** `color('neutral')` is the regular text colour (and a gray badge). */
function textColor(color: string | undefined): string | undefined {
  if (!color) return undefined

  return color === 'neutral' ? 'text-foreground' : textColorClasses[color]
}

export function TextComponent({ component }: { component: TextSchema }) {
  const t = useT()
  const [copied, setCopied] = useState(false)

  const copy = () => {
    void navigator.clipboard?.writeText(component.content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), component.copyMessageDuration ?? 1500)
    })
  }

  const copyButton = component.copyable ? (
    <>
      <button
        type="button"
        data-slot="text-copy"
        className="text-muted-foreground hover:text-foreground"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          copy()
        }}
        aria-label={t('copy', {}, 'Copy')}
      >
        {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
      </button>
      {copied && (
        <span role="status" className={cn('text-xs', !component.copyMessage && 'sr-only')}>
          {component.copyMessage ?? t('copied', {}, 'Copied')}
        </span>
      )}
    </>
  ) : null

  const element = component.badge ? (
    <Badge
      variant="outline"
      {...extraProps(
        component.extraAttributes,
        cn(
          colorClass(
            badgeColorClasses,
            component.color === 'neutral' ? 'gray' : component.color,
            'gray',
          ),
          component.fontFamily && FONT_FAMILIES[component.fontFamily],
        ),
      )}
    >
      {component.icon && <Icon name={component.icon} />}
      {component.content}
      {copyButton}
    </Badge>
  ) : (
    <p
      {...extraProps(
        component.extraAttributes,
        cn(
          'flex items-center gap-1.5 text-sm',
          component.size && SIZES[component.size],
          component.weight && WEIGHTS[component.weight],
          component.fontFamily && FONT_FAMILIES[component.fontFamily],
          textColor(component.color),
        ),
      )}
    >
      {component.icon && <Icon name={component.icon} />}
      {component.content}
      {copyButton}
    </p>
  )

  if (!component.tooltip) return element

  return (
    <Tooltip>
      <TooltipTrigger asChild>{element}</TooltipTrigger>
      <TooltipContent>{component.tooltip}</TooltipContent>
    </Tooltip>
  )
}

/** Custom component registered by the application through `createAlfakit({ components })`. */
export function ViewComponent({ component }: { component: ViewSchema }) {
  const registry = useRegistry()
  const t = useT()
  const Custom = registry.resolve(component.component)

  if (!Custom) {
    return (
      <div className="border-destructive/40 text-destructive rounded-md border border-dashed p-3 text-xs">
        {t(
          'component_not_registered',
          { component: component.component },
          `Component ${component.component} is not registered.`,
        )}
      </div>
    )
  }

  return createElement(Custom, { ...(component.props ?? {}), component })
}
