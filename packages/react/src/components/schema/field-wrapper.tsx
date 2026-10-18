import type { BaseField } from '@alfakit/core'
import { fieldIds, hasSlots, mergeAttributes } from '@alfakit/core'
import type { ReactNode } from 'react'
import { extraProps } from '../../lib/attributes'
import { textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { Label } from '../ui/label'
import { ContentSlot } from './content-slot'
import { FieldAffixActions, FieldHintActions } from './field-actions'
import { useInFusedGroup } from './fused-group-context'

export interface FieldWrapperProps {
  field: BaseField
  htmlFor: string
  error?: string
  children: ReactNode
  /** Render the label after the control (checkbox, toggle). */
  inline?: boolean
  className?: string
  /** Suppress the label (the control renders its own). */
  hideLabel?: boolean
}

/**
 * Label, hint, content slots, helper text and validation error around a form control.
 */
export function FieldWrapper({
  field,
  htmlFor,
  error,
  children,
  inline = false,
  className,
  hideLabel = false,
}: FieldWrapperProps) {
  const fused = useInFusedGroup()
  const label = hideLabel ? null : field.label
  const hintUrl = typeof field.meta?.hintUrl === 'string' ? field.meta.hintUrl : undefined
  // Stable ids the control references through `aria-describedby` / `aria-labelledby`.
  const ids = fieldIds(htmlFor)
  const wrapperAttributes = mergeAttributes(
    field.extraAttributes,
    field.extraFieldWrapperAttributes,
  )

  const labelNode = label ? (
    <Label
      id={ids.label}
      htmlFor={htmlFor}
      className={cn(inline && 'cursor-pointer font-normal', fused && 'sr-only')}
    >
      <span>
        {label}
        {field.required && (
          <span className="text-destructive ms-0.5" aria-hidden="true">
            *
          </span>
        )}
      </span>
    </Label>
  ) : null

  // Inside a `FusedGroup` the group shows the error; the field keeps it for screen readers.
  const errorNode = error ? (
    field.allowHtmlValidationMessages ? (
      <p
        id={ids.error}
        className={cn('text-destructive text-xs', fused && 'sr-only')}
        role="alert"
        dangerouslySetInnerHTML={{ __html: error }}
      />
    ) : (
      <p id={ids.error} className={cn('text-destructive text-xs', fused && 'sr-only')} role="alert">
        {error}
      </p>
    )
  ) : null

  const control = (
    <ContentControl field={field}>
      <FieldAffixActions component={field}>{children}</FieldAffixActions>
    </ContentControl>
  )

  if (fused) {
    return (
      <div
        data-slot="field"
        data-field={field.statePath}
        data-fused=""
        {...extraProps(wrapperAttributes, cn('flex h-full flex-col', className))}
      >
        {labelNode}
        {control}
        {errorNode}
      </div>
    )
  }

  const hintActions = field.hintActions?.length ? <FieldHintActions component={field} /> : null

  const hintText = field.hint ? (
    <span
      id={ids.hint}
      className={cn(
        'inline-flex items-center gap-1 text-xs',
        field.hintColor ? textColorClasses[field.hintColor] : 'text-muted-foreground',
      )}
    >
      {field.hintIcon && <Icon name={field.hintIcon} className="size-3.5" />}
      {hintUrl ? (
        <a
          href={hintUrl}
          className="hover:underline"
          dangerouslySetInnerHTML={{ __html: field.hint }}
        />
      ) : (
        <span dangerouslySetInnerHTML={{ __html: field.hint }} />
      )}
    </span>
  ) : null

  // `afterLabel()` sits with the hint at the end of the label row unless aligned to the start.
  const afterLabelAtStart = field.slots?.afterLabel?.alignment === 'start'
  const afterLabelNode = <ContentSlot component={field} name="afterLabel" />

  const hintNode =
    hintText || hintActions || (field.slots?.afterLabel && !afterLabelAtStart) ? (
      <span className="inline-flex items-center gap-2">
        {hintText}
        {hintActions}
        {!afterLabelAtStart && afterLabelNode}
      </span>
    ) : null

  const labelLine =
    labelNode || field.slots?.beforeLabel || (field.slots?.afterLabel && afterLabelAtStart) ? (
      <span className="inline-flex min-w-0 items-center gap-2">
        <ContentSlot component={field} name="beforeLabel" />
        {labelNode}
        {afterLabelAtStart && afterLabelNode}
      </span>
    ) : null

  const helperNode = field.helperText ? (
    <p
      id={ids.helper}
      className="text-muted-foreground text-xs"
      dangerouslySetInnerHTML={{ __html: field.helperText }}
    />
  ) : null

  const errorArea = error ? (
    <>
      <ContentSlot component={field} name="aboveErrorMessage" />
      {errorNode}
      <ContentSlot component={field} name="belowErrorMessage" />
    </>
  ) : null

  const below = (
    <>
      {helperNode}
      <ContentSlot component={field} name="belowContent" />
      {errorArea}
    </>
  )

  // `inlineLabel()`: label (and hint) in the first column, the control in the other two
  // from `sm` up; stacked on phones. Grid columns follow the text direction, so RTL works.
  if (field.inlineLabel) {
    return (
      <div
        data-slot="field"
        data-field={field.statePath}
        data-inline-label=""
        {...extraProps(
          wrapperAttributes,
          cn('flex flex-col gap-1.5 sm:grid sm:grid-cols-3 sm:items-start sm:gap-x-4', className),
        )}
      >
        <div data-slot="field-label" className="flex flex-col gap-1 sm:pt-2">
          <ContentSlot component={field} name="aboveLabel" />
          {labelLine}
          {hintNode}
          <ContentSlot component={field} name="belowLabel" />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2">
          <ContentSlot component={field} name="aboveContent" />
          {control}
          {below}
        </div>
      </div>
    )
  }

  return (
    <div
      data-slot="field"
      data-field={field.statePath}
      {...extraProps(wrapperAttributes, cn('flex flex-col gap-1.5', className))}
    >
      <ContentSlot component={field} name="aboveLabel" />
      {inline ? (
        <div className="flex items-start gap-2">
          {control}
          <div className="flex flex-col gap-1">
            {labelLine}
            {hintNode}
          </div>
        </div>
      ) : (
        (labelLine || hintNode) && (
          <div className="flex items-center justify-between gap-2">
            {labelLine ?? <span />}
            {hintNode}
          </div>
        )
      )}
      <ContentSlot component={field} name="belowLabel" />
      {!inline && (
        <>
          <ContentSlot component={field} name="aboveContent" />
          {control}
        </>
      )}
      {below}
    </div>
  )
}

/** `beforeContent()` / `afterContent()` on either side of the control. */
function ContentControl({ field, children }: { field: BaseField; children: ReactNode }) {
  if (!hasSlots(field, ['beforeContent', 'afterContent'])) {
    return <>{children}</>
  }

  return (
    <div data-slot="field-content" className="flex items-center gap-2">
      <ContentSlot component={field} name="beforeContent" className="shrink-0 flex-nowrap" />
      <div className="min-w-0 flex-1">{children}</div>
      <ContentSlot component={field} name="afterContent" className="shrink-0 flex-nowrap" />
    </div>
  )
}
