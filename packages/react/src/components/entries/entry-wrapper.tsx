import type { BaseEntry } from '@alfakit/core'
import { hasSlots } from '@alfakit/core'
import type { ReactNode } from 'react'
import { useId } from 'react'
import { extraProps } from '../../lib/attributes'
import { textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { ContentSlot } from '../schema/content-slot'
import { FieldAffixActions, FieldHintActions } from '../schema/field-actions'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'

/** `alignment()`: text and inline content (badges, icons, images) follow it. */
const ENTRY_ALIGNMENT: Record<string, string> = {
  start: 'text-start [&>*]:justify-start',
  center: 'text-center [&>*]:mx-auto [&>*]:justify-center',
  end: 'text-end [&>*]:ms-auto [&>*]:justify-end',
  justify: 'text-justify',
  between: 'text-justify',
}

export function EntryWrapper({
  entry,
  children,
  className,
}: {
  entry: BaseEntry
  children: ReactNode
  className?: string
}) {
  const labelId = `${useId()}-label`
  const body = entry.tooltip ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="w-fit">{children}</div>
      </TooltipTrigger>
      <TooltipContent>{entry.tooltip}</TooltipContent>
    </Tooltip>
  ) : (
    children
  )

  // `extraEntryWrapperAttributes()` go on the wrapper, `extraAttributes()` on the value.
  const wrapperAttributes = entry.extraEntryWrapperAttributes
  // `afterLabel()` sits with the hint at the end of the label row unless aligned to the start.
  const afterLabelAtStart = entry.slots?.afterLabel?.alignment === 'start'
  const afterLabelNode = <ContentSlot component={entry} name="afterLabel" />

  const hintNode =
    entry.hint || entry.hintActions?.length || (entry.slots?.afterLabel && !afterLabelAtStart) ? (
      <span className="inline-flex items-center gap-2">
        {entry.hint && (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs',
              entry.hintColor ? textColorClasses[entry.hintColor] : 'text-muted-foreground',
            )}
          >
            {entry.hintIcon && <Icon name={entry.hintIcon} className="size-3.5" />}
            <span dangerouslySetInnerHTML={{ __html: entry.hint }} />
          </span>
        )}
        {entry.hintActions?.length ? <FieldHintActions component={entry} /> : null}
        {!afterLabelAtStart && afterLabelNode}
      </span>
    ) : null

  const labelNode = entry.label ? (
    <span
      id={labelId}
      data-slot="entry-label"
      className="text-muted-foreground text-sm font-medium"
    >
      {entry.label}
    </span>
  ) : null

  const labelLine =
    labelNode || entry.slots?.beforeLabel || (entry.slots?.afterLabel && afterLabelAtStart) ? (
      <span className="inline-flex min-w-0 items-center gap-2">
        <ContentSlot component={entry} name="beforeLabel" />
        {labelNode}
        {afterLabelAtStart && afterLabelNode}
      </span>
    ) : null

  const affixed = <FieldAffixActions component={entry}>{body}</FieldAffixActions>

  const valueNode = (
    <div
      data-slot="entry-value"
      data-alignment={entry.alignment}
      {...extraProps(
        entry.extraAttributes,
        cn('text-sm', entry.alignment && ENTRY_ALIGNMENT[entry.alignment]),
      )}
    >
      {hasSlots(entry, ['beforeContent', 'afterContent']) ? (
        <div data-slot="entry-content" className="flex items-center gap-2">
          <ContentSlot component={entry} name="beforeContent" className="shrink-0 flex-nowrap" />
          <div className="min-w-0 flex-1">{affixed}</div>
          <ContentSlot component={entry} name="afterContent" className="shrink-0 flex-nowrap" />
        </div>
      ) : (
        affixed
      )}
    </div>
  )

  const helperNode = entry.helperText ? (
    <p
      className="text-muted-foreground text-xs"
      dangerouslySetInnerHTML={{ __html: entry.helperText }}
    />
  ) : null

  // `inlineLabel()`: label beside the value from `sm` up, stacked on phones.
  if (entry.inlineLabel) {
    return (
      <div
        data-slot="entry"
        data-inline-label=""
        role="group"
        aria-labelledby={entry.label ? labelId : undefined}
        {...extraProps(
          wrapperAttributes,
          cn('flex flex-col gap-1 sm:grid sm:grid-cols-3 sm:items-start sm:gap-x-4', className),
        )}
      >
        <div className="flex flex-col gap-1">
          <ContentSlot component={entry} name="aboveLabel" />
          {labelLine}
          {hintNode}
          <ContentSlot component={entry} name="belowLabel" />
        </div>
        <div className="flex min-w-0 flex-col gap-1 sm:col-span-2">
          <ContentSlot component={entry} name="aboveContent" />
          {valueNode}
          {helperNode}
          <ContentSlot component={entry} name="belowContent" />
        </div>
      </div>
    )
  }

  return (
    <div
      data-slot="entry"
      role="group"
      aria-labelledby={entry.label ? labelId : undefined}
      {...extraProps(wrapperAttributes, cn('flex flex-col gap-1', className))}
    >
      <ContentSlot component={entry} name="aboveLabel" />
      {(labelLine || hintNode) && (
        <div className="flex items-center justify-between gap-2">
          {labelLine ?? <span />}
          {hintNode}
        </div>
      )}
      <ContentSlot component={entry} name="belowLabel" />
      <ContentSlot component={entry} name="aboveContent" />
      {valueNode}
      {helperNode}
      <ContentSlot component={entry} name="belowContent" />
    </div>
  )
}

export function EntryPlaceholder({ entry }: { entry: BaseEntry }) {
  return <span className="text-muted-foreground">{entry.placeholder ?? '—'}</span>
}
