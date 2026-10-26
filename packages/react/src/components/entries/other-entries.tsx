import type {
  BaseEntry,
  ColorEntrySchema,
  IconEntrySchema,
  ImageEntrySchema,
  KeyValueEntrySchema,
  RepeatableEntrySchema,
} from '@alfakit/core'
import {
  gridColumnsClasses,
  remainingTextSizeClass,
  stackedImageStyle,
  usesDefaultImageStack,
} from '@alfakit/core'
import { Link } from '@inertiajs/react'
import type { ReactNode } from 'react'
import { extraProps } from '../../lib/attributes'
import { textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { NewTabHint } from '../../lib/new-tab-hint'
import { cn } from '../../lib/utils'
import { SchemaRenderer } from '../schema/schema-renderer'
import { EntryPlaceholder, EntryWrapper } from './entry-wrapper'
import { RepeatableEntryTable } from './repeatable-entry-table'
import { FormattedText } from './text-entry'

/** Wrap an entry's content in its `url()` link (icon, image and colour entries). */
export function EntryLink({ entry, children }: { entry: BaseEntry; children: ReactNode }) {
  if (!entry.url) {
    return <>{children}</>
  }

  return entry.openUrlInNewTab ? (
    <a href={entry.url} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit">
      {children}
      <NewTabHint />
    </a>
  ) : (
    <Link href={entry.url} className="inline-flex w-fit">
      {children}
    </Link>
  )
}

const ICON_SIZES: Record<string, string> = {
  xs: 'size-3',
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
  xl: 'size-8',
  '2xl': 'size-10',
}

export function IconEntryComponent({ component }: { component: IconEntrySchema }) {
  return (
    <EntryWrapper entry={component}>
      {component.icon ? (
        <EntryLink entry={component}>
          <Icon
            name={component.icon}
            className={cn(
              ICON_SIZES[component.size ?? 'md'],
              component.color && textColorClasses[component.color],
            )}
          />
        </EntryLink>
      ) : (
        <EntryPlaceholder entry={component} />
      )}
    </EntryWrapper>
  )
}

export function ImageEntryComponent({ component }: { component: ImageEntrySchema }) {
  const urls = component.state ?? []
  const limit = component.limit ?? urls.length
  const size = component.size ?? 40
  const style = {
    height: component.height ?? size,
    width: component.width ?? (component.square || component.circular ? size : undefined),
  }

  return (
    <EntryWrapper entry={component}>
      {urls.length === 0 ? (
        <EntryPlaceholder entry={component} />
      ) : (
        <EntryLink entry={component}>
          <div
            className={cn(
              'flex items-center',
              component.stacked ? usesDefaultImageStack(component) && '-space-x-2' : 'gap-2',
            )}
          >
            {urls.slice(0, limit).map((url, index) => (
              <img
                key={index}
                src={url}
                alt={component.alts?.[index] ?? component.alt ?? ''}
                style={{ ...style, ...stackedImageStyle(index, component) }}
                {...extraProps(
                  component.extraImgAttributes,
                  cn(
                    'object-cover',
                    component.circular ? 'rounded-full' : 'rounded-md',
                    component.stacked &&
                      usesDefaultImageStack(component) &&
                      'ring-background ring-2',
                  ),
                )}
              />
            ))}
            {component.limitedRemainingText !== false && urls.length > limit && (
              <span
                data-slot="image-remaining"
                className={cn(
                  'text-muted-foreground',
                  // The last image keeps the stack's negative end margin (W-S3-03).
                  component.stacked && usesDefaultImageStack(component) && 'ms-3',
                  remainingTextSizeClass(component.limitedRemainingTextSize),
                )}
              >
                +{urls.length - limit}
              </span>
            )}
          </div>
        </EntryLink>
      )}
    </EntryWrapper>
  )
}

export function ColorEntryComponent({ component }: { component: ColorEntrySchema }) {
  const colors = Array.isArray(component.state)
    ? component.state
    : component.state
      ? [component.state]
      : []

  return (
    <EntryWrapper entry={component}>
      {colors.length === 0 ? (
        <EntryPlaceholder entry={component} />
      ) : (
        <EntryLink entry={component}>
          <div className="flex flex-wrap items-center gap-2">
            {colors.map((color, index) => (
              <span key={index} className="inline-flex items-center gap-1.5 text-sm">
                <span
                  className="size-5 rounded border shadow-xs"
                  style={{ backgroundColor: color }}
                />
                {/* The code honours the entry's text styles and copy settings. */}
                {component.copyable && (
                  <FormattedText
                    value={color}
                    className="text-xs"
                    schema={{
                      size: component.size,
                      weight: component.weight,
                      fontFamily: component.fontFamily ?? 'mono',
                      copyable: true,
                      copyMessage: component.copyMessage,
                      copyMessageDuration: component.copyMessageDuration,
                    }}
                  />
                )}
              </span>
            ))}
          </div>
        </EntryLink>
      )}
    </EntryWrapper>
  )
}

export function KeyValueEntryComponent({ component }: { component: KeyValueEntrySchema }) {
  const entries = Object.entries(component.state ?? {})

  return (
    <EntryWrapper entry={component}>
      {entries.length === 0 ? (
        <EntryPlaceholder entry={component} />
      ) : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs">
              <tr>
                <th className="px-3 py-1.5 text-start font-medium">{component.keyLabel}</th>
                <th className="px-3 py-1.5 text-start font-medium">{component.valueLabel}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([key, value]) => (
                <tr key={key} className="border-t">
                  <td className="px-3 py-1.5 font-medium">{key}</td>
                  <td className="px-3 py-1.5">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </EntryWrapper>
  )
}

export function RepeatableEntryComponent({ component }: { component: RepeatableEntrySchema }) {
  return (
    <EntryWrapper entry={component}>
      {component.items.length === 0 ? (
        <EntryPlaceholder entry={component} />
      ) : component.table?.length ? (
        <RepeatableEntryTable columns={component.table} items={component.items} />
      ) : (
        <div className={cn('grid gap-3', component.grid && gridColumnsClasses(component.grid))}>
          {component.items.map((item, index) => (
            <div
              key={index}
              className={cn(component.contained && 'bg-card rounded-lg border p-4 shadow-xs')}
            >
              <div className="contents">
                <SchemaRenderer
                  components={item}
                  columns={component.columns ?? { default: 1, lg: 2 }}
                  className="gap-4"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </EntryWrapper>
  )
}
