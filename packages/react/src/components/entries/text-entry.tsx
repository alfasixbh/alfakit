import type { TextEntrySchema } from '@alfakit/core'
import { isolationDirection, limitedListItems } from '@alfakit/core'
import { Link } from '@inertiajs/react'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { useState } from 'react'
import { useT } from '../../context'
import { badgeColorClasses, colorClass, textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { NewTabHint } from '../../lib/new-tab-hint'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/badge'
import { EntryPlaceholder, EntryWrapper } from './entry-wrapper'

const SIZES: Record<string, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
}
const WEIGHTS: Record<string, string> = {
  thin: 'font-thin',
  extralight: 'font-extralight',
  light: 'font-light',
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
  extrabold: 'font-extrabold',
  black: 'font-black',
}
const FAMILIES: Record<string, string> = {
  sans: 'font-sans',
  serif: 'font-serif',
  mono: 'font-mono',
}

export function FormattedText({
  value,
  schema,
  className,
}: {
  value: unknown
  schema: Partial<TextEntrySchema>
  className?: string
}) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  // `expandableLimitedList()`: the items past `listLimit` show behind a toggle.
  const [expanded, setExpanded] = useState(false)

  if (
    value === null ||
    value === undefined ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  ) {
    return <span className="text-muted-foreground">{schema.placeholder ?? '—'}</span>
  }

  if (schema.boolean) {
    return (
      <Icon
        name={value ? 'circle-check' : 'circle-x'}
        className={cn('size-5', value ? 'text-success' : 'text-danger')}
      />
    )
  }

  const items = Array.isArray(value) ? value : [value]
  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), schema.copyMessageDuration ?? 1500)
    })
  }

  // Relationship lists (`tags.name` with a `url()` closure) link each item on its own.
  const renderItem = (item: unknown, index: number) => {
    const url = schema.itemUrls?.[index]
    const content = renderItemContent(item, index)

    if (!url) return content

    return schema.openUrlInNewTab ? (
      <a
        key={index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex hover:underline"
      >
        {content}
        <NewTabHint />
      </a>
    ) : (
      <Link key={index} href={url} className="inline-flex hover:underline">
        {content}
      </Link>
    )
  }

  const renderItemContent = (item: unknown, index: number) => {
    const text = String(item)
    // Lists of enums whose items differ carry a colour and icon per item.
    const color = schema.itemColors?.[index] ?? schema.color
    const icon = schema.itemIcons?.[index] ?? schema.icon
    const inner = schema.html ? (
      <span
        className={cn(schema.prose && 'alfakit-prose')}
        dangerouslySetInnerHTML={{ __html: text }}
      />
    ) : (
      // <bdi> isolates each value's direction (an English email inside an Arabic page).
      <bdi
        dir={isolationDirection(text)}
        className={cn(
          schema.lineClamp && `line-clamp-${schema.lineClamp}`,
          !schema.wrap && !schema.lineClamp && 'whitespace-pre-line',
        )}
      >
        {text}
      </bdi>
    )

    if (schema.badge) {
      return (
        <Badge
          key={index}
          variant="outline"
          className={colorClass(badgeColorClasses, color, 'gray')}
        >
          {icon && schema.iconPosition !== 'after' && (
            <Icon
              name={icon}
              className={cn(schema.iconColor && textColorClasses[schema.iconColor])}
            />
          )}
          {inner}
          {icon && schema.iconPosition === 'after' && <Icon name={icon} />}
        </Badge>
      )
    }

    return (
      <span
        key={index}
        className={cn(
          'inline-flex items-center gap-1.5',
          color && textColorClasses[color],
          schema.size && SIZES[schema.size],
          schema.weight && WEIGHTS[schema.weight],
          schema.fontFamily && FAMILIES[schema.fontFamily],
        )}
      >
        {icon && schema.iconPosition !== 'after' && (
          <Icon
            name={icon}
            className={cn(schema.iconColor && textColorClasses[schema.iconColor])}
          />
        )}
        {inner}
        {icon && schema.iconPosition === 'after' && (
          <Icon
            name={icon}
            className={cn(schema.iconColor && textColorClasses[schema.iconColor])}
          />
        )}
        {schema.copyable && (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={(event) => {
              // The entry may sit inside a link or a clickable table row.
              event.preventDefault()
              event.stopPropagation()
              copy(text)
            }}
            aria-label={t('copy', {}, 'Copy')}
          >
            {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
          </button>
        )}
        {schema.copyable && copied && (
          <span role="status" className={cn('text-xs', !schema.copyMessage && 'sr-only')}>
            {schema.copyMessage ?? t('copied', {}, 'Copied')}
          </span>
        )}
      </span>
    )
  }

  if (items.length > 1 || Array.isArray(value)) {
    const limited = limitedListItems(items, schema, expanded)
    const canCollapse = expanded && limitedListItems(items, schema, false).hidden > 0
    const toggle =
      limited.hidden > 0 || canCollapse ? (
        <button
          type="button"
          data-slot="list-expand"
          aria-expanded={expanded}
          className="text-primary text-xs hover:underline"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setExpanded(!expanded)
          }}
        >
          {expanded
            ? t('list.show_less', {}, 'Show less')
            : t('list.show_more', { count: limited.hidden }, `+${limited.hidden} more`)}
        </button>
      ) : null

    if (schema.listWithLineBreaks) {
      return (
        <ul className={cn('flex flex-col gap-0.5', schema.bulleted && 'list-disc ps-4', className)}>
          {limited.items.map((item, index) => (
            <li key={index}>{renderItem(item, index)}</li>
          ))}
          {toggle && <li className="list-none">{toggle}</li>}
        </ul>
      )
    }

    return (
      <span className={cn('flex flex-wrap items-center gap-1', className)}>
        {limited.items.map(renderItem)}
        {toggle}
      </span>
    )
  }

  return <span className={className}>{renderItem(items[0], 0)}</span>
}

export function TextEntryComponent({ component }: { component: TextEntrySchema }) {
  const content = <FormattedText value={component.state} schema={component} />

  return (
    <EntryWrapper entry={component}>
      {component.state === null || component.state === undefined ? (
        <EntryPlaceholder entry={component} />
      ) : component.url ? (
        component.openUrlInNewTab ? (
          <a
            href={component.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            {content}
            <NewTabHint />
          </a>
        ) : (
          <Link href={component.url} className="hover:underline">
            {content}
          </Link>
        )
      ) : (
        content
      )}
    </EntryWrapper>
  )
}
