import type { FieldAriaAttributes, Option, OptionOrGroup, SelectSchema } from '@alfakit/core'
import { htmlLabelToText, isOptionGroup, moveListItem, reorderOffset } from '@alfakit/core'
import { CheckIcon, ChevronsUpDownIcon, GripVerticalIcon, XIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useDirection, useT } from '../../context'
import { textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { useField, useFormStore } from '../form/form-context'
import { FieldWrapper } from '../schema/field-wrapper'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Spinner } from '../ui/spinner'

function flatten(options: OptionOrGroup[]): Option[] {
  return options.flatMap((option) => (isOptionGroup(option) ? option.options : [option]))
}

/** Text of an option label for places that can't show markup (`allowHtml()` labels). */
function plainLabel(component: SelectSchema, label: string): string {
  return component.allowHtml ? htmlLabelToText(label) : label
}

export function SelectField({ component }: { component: SelectSchema }) {
  const t = useT()
  const noOptions = component.noOptionsMessage ?? t('form.no_options', {}, 'No options available.')
  const { value, setValue, blur, error, id, disabled, readOnly, aria } = useField<
    string | number | Array<string | number> | null
  >(component)
  // Selects have no native read-only mode: lock the control and announce it as read-only.
  const locked = disabled || readOnly

  if (component.native && !component.multiple && !component.searchable) {
    return (
      <FieldWrapper field={component} htmlFor={id} error={error}>
        <SelectAffixes component={component} error={error}>
          <select
            id={id}
            name={component.name}
            value={value === null || value === undefined ? '' : String(value)}
            onChange={(event) => setValue(event.target.value === '' ? null : event.target.value)}
            onBlur={blur}
            disabled={locked}
            required={component.required}
            {...aria}
            aria-readonly={readOnly || undefined}
            className="border-input dark:bg-input/30 focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
          >
            {component.selectablePlaceholder && (
              <option value="">{component.placeholder ?? ''}</option>
            )}
            {component.options.map((option) =>
              isOptionGroup(option) ? (
                <optgroup key={option.label} label={option.label}>
                  {option.options.map((item) => (
                    <option key={item.value} value={item.value} disabled={item.disabled}>
                      {plainLabel(component, item.label)}
                    </option>
                  ))}
                </optgroup>
              ) : (
                <option key={option.value} value={option.value} disabled={option.disabled}>
                  {plainLabel(component, option.label)}
                </option>
              ),
            )}
          </select>
        </SelectAffixes>
      </FieldWrapper>
    )
  }

  if (!component.multiple && !component.searchable) {
    return (
      <FieldWrapper field={component} htmlFor={id} error={error}>
        <SelectAffixes component={component} error={error}>
          <Select
            value={value === null || value === undefined ? '' : String(value)}
            onValueChange={(next) => setValue(next === '__none__' ? null : next)}
            disabled={locked}
          >
            <SelectTrigger
              id={id}
              {...aria}
              aria-readonly={readOnly || undefined}
              className="w-full"
            >
              <SelectValue placeholder={component.placeholder ?? ''} />
            </SelectTrigger>
            <SelectContent>
              {component.selectablePlaceholder &&
                value !== null &&
                value !== undefined &&
                value !== '' && (
                  <SelectItem value="__none__" className="text-muted-foreground">
                    {component.placeholder ?? '—'}
                  </SelectItem>
                )}
              {component.options.map((option) =>
                isOptionGroup(option) ? (
                  <SelectGroup key={option.label}>
                    <SelectLabel>{option.label}</SelectLabel>
                    {option.options.map((item) => (
                      <SelectItem key={item.value} value={item.value} disabled={item.disabled}>
                        <OptionLabel option={item} component={component} />
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ) : (
                  <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                    <OptionLabel option={option} component={component} />
                  </SelectItem>
                ),
              )}
              {component.options.length === 0 && (
                <div data-slot="select-empty" className="text-muted-foreground px-2 py-1.5 text-sm">
                  {noOptions}
                </div>
              )}
            </SelectContent>
          </Select>
        </SelectAffixes>
      </FieldWrapper>
    )
  }

  return (
    <FieldWrapper field={component} htmlFor={id} error={error}>
      <SelectAffixes component={component} error={error}>
        <ComboboxSelect
          component={component}
          value={value}
          setValue={setValue}
          id={id}
          disabled={disabled}
          readOnly={readOnly}
          error={error}
          aria={aria}
        />
      </SelectAffixes>
    </FieldWrapper>
  )
}

/** Prefix/suffix text and icons around any of the select variants. */
function SelectAffixes({
  component,
  error,
  children,
}: {
  component: SelectSchema
  error?: string
  children: ReactNode
}) {
  const hasPrefix = Boolean(component.prefix || component.prefixIcon)
  const hasSuffix = Boolean(component.suffix || component.suffixIcon)

  if (!hasPrefix && !hasSuffix) {
    return children
  }

  return (
    <div
      data-slot="input-group"
      className={cn(
        'border-input dark:bg-input/30 has-[:focus-visible]:border-ring has-[:focus-visible]:ring-ring/50 flex min-h-9 w-full items-stretch overflow-hidden rounded-md border shadow-xs has-[:focus-visible]:ring-[3px]',
        error && 'border-destructive',
      )}
    >
      {hasPrefix && (
        <span className="text-muted-foreground bg-muted/50 flex items-center gap-1 border-e px-3 text-sm whitespace-nowrap">
          <Icon
            name={component.prefixIcon}
            className={component.prefixIconColor && textColorClasses[component.prefixIconColor]}
          />
          {component.prefix}
        </span>
      )}
      <div className="min-w-0 flex-1 *:h-full *:w-full *:rounded-none *:border-0 *:bg-transparent *:shadow-none *:focus-visible:ring-0 dark:*:bg-transparent">
        {children}
      </div>
      {hasSuffix && (
        <span className="text-muted-foreground bg-muted/50 flex items-center gap-1 border-s px-3 text-sm whitespace-nowrap">
          {component.suffix}
          <Icon
            name={component.suffixIcon}
            className={component.suffixIconColor && textColorClasses[component.suffixIconColor]}
          />
        </span>
      )}
    </div>
  )
}

function OptionLabel({ option, component }: { option: Option; component: SelectSchema }) {
  const wrap = component.wrapOptionLabels !== false

  return (
    <span className={cn('flex min-w-0 items-center gap-2', !wrap && 'max-w-full')}>
      {option.icon && <Icon name={option.icon} />}
      {component.allowHtml ? (
        <span
          data-slot="option-label"
          className={cn(wrap ? 'break-words' : 'truncate')}
          dangerouslySetInnerHTML={{ __html: option.label }}
        />
      ) : (
        <span data-slot="option-label" className={cn(wrap ? 'break-words' : 'truncate')}>
          {option.label}
        </span>
      )}
      {option.description && (
        <span className="text-muted-foreground text-xs">{option.description}</span>
      )}
    </span>
  )
}

interface ComboboxProps {
  component: SelectSchema
  value: string | number | Array<string | number> | null | undefined
  setValue: (value: string | number | Array<string | number> | null) => void
  id: string
  disabled: boolean
  readOnly: boolean
  error?: string
  aria: FieldAriaAttributes
}

function ComboboxSelect({
  component,
  value,
  setValue,
  id,
  disabled,
  readOnly,
  error,
  aria,
}: ComboboxProps) {
  const t = useT()
  const store = useFormStore()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [remoteOptions, setRemoteOptions] = useState<Option[] | null>(null)
  const [labels, setLabels] = useState<Record<string, string>>(component.selectedLabels ?? {})
  const requestIdRef = useRef(0)
  // Values whose labels were already requested: the server may not know a value (deleted
  // record, stale state), so asking again on every render would loop forever.
  const requestedLabelsRef = useRef(new Set<string>())

  // Labels the server sends with a refresh win (e.g. after the edit option modal renamed
  // the selected record).
  const knownLabels = useMemo(
    () => ({ ...labels, ...component.selectedLabels }),
    [labels, component.selectedLabels],
  )

  const selected = useMemo<string[]>(
    () =>
      Array.isArray(value)
        ? value.map(String)
        : value === null || value === undefined || value === ''
          ? []
          : [String(value)],
    [value],
  )
  const staticOptions = useMemo(() => flatten(component.options), [component.options])
  const options = remoteOptions ?? staticOptions
  const isRemote = Boolean(component.searchable)

  // Debounced remote search: every keystroke restarts the timer and invalidates in-flight requests.
  useEffect(() => {
    if (!open || !isRemote) {
      return
    }

    const timer = setTimeout(() => {
      const current = ++requestIdRef.current
      setLoading(true)

      void store
        .searchOptions(component.statePath, search)
        .then((results) => {
          if (current === requestIdRef.current) {
            setRemoteOptions(results)
          }
        })
        .finally(() => {
          if (current === requestIdRef.current) {
            setLoading(false)
          }
        })
    }, component.searchDebounce ?? 300)

    return () => clearTimeout(timer)
  }, [open, search, isRemote, store, component.statePath, component.searchDebounce])

  // Resolve labels for values we have not seen yet (e.g. after a server refresh).
  useEffect(() => {
    if (!isRemote) {
      return
    }

    const missing = selected.filter(
      (key) =>
        !knownLabels[key] &&
        !requestedLabelsRef.current.has(key) &&
        !staticOptions.some((option) => option.value === key),
    )

    if (missing.length === 0) {
      return
    }

    for (const key of missing) {
      requestedLabelsRef.current.add(key)
    }

    void store
      .optionLabels(component.statePath, missing)
      .then((resolved) => setLabels((current) => ({ ...current, ...resolved })))
  }, [selected, knownLabels, staticOptions, isRemote, store, component.statePath])

  const labelFor = (key: string) =>
    knownLabels[key] ??
    options.find((option) => option.value === key)?.label ??
    staticOptions.find((option) => option.value === key)?.label ??
    key

  const toggle = (key: string, label: string) => {
    setLabels((current) => ({ ...current, [key]: label }))

    if (component.multiple) {
      const next = selected.includes(key)
        ? selected.filter((item) => item !== key)
        : [...selected, key]

      if (component.maxItems && next.length > component.maxItems) {
        return
      }

      // `minItems()`: the last required selections cannot be removed.
      if (component.minItems && next.length < selected.length && next.length < component.minItems) {
        return
      }

      setValue(next)
    } else {
      setValue(selected.includes(key) && component.selectablePlaceholder ? null : key)
      setOpen(false)
    }
  }

  const canRemove = !component.minItems || selected.length > component.minItems
  // `reorderable()`: chosen options are listed under the trigger, where they can be dragged
  // or moved with Alt + arrow keys (chips inside the trigger button can't hold controls).
  const reorderable = Boolean(component.multiple && component.reorderable)

  const filtered = isRemote
    ? options
    : options.filter((option) =>
        plainLabel(component, option.label).toLowerCase().includes(search.toLowerCase()),
      )
  // Nothing to choose from at all (not a search without matches).
  const isEmpty = search === '' && options.length === 0

  const popover = (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)

        if (!next) {
          setSearch('')
          store.blur(component.statePath)
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          data-input=""
          role="combobox"
          aria-expanded={open}
          {...aria}
          aria-readonly={readOnly || undefined}
          disabled={disabled || readOnly}
          className={cn(
            'h-auto min-h-9 w-full justify-between px-3 py-1.5 font-normal hover:bg-transparent',
            error && 'border-destructive',
          )}
        >
          <span className="flex flex-1 flex-wrap items-center gap-1 text-start">
            {selected.length === 0 && (
              <span className="text-muted-foreground">
                {component.placeholder ?? t('select_option', {}, 'Select an option')}
              </span>
            )}
            {component.multiple && reorderable && selected.length > 0 && (
              <span className="text-muted-foreground">
                {component.placeholder ?? t('select_option', {}, 'Select an option')}
              </span>
            )}
            {component.multiple
              ? !reorderable &&
                selected.map((key) => (
                  <Badge key={key} variant="secondary" className="gap-1 pe-1">
                    <SelectedLabel component={component} label={labelFor(key)} />
                    {!readOnly && !disabled && canRemove && (
                      <span
                        role="button"
                        tabIndex={-1}
                        aria-label={t('remove', {}, 'Remove')}
                        className="hover:bg-foreground/10 rounded-sm"
                        onClick={(event) => {
                          event.stopPropagation()
                          setValue(selected.filter((item) => item !== key))
                        }}
                      >
                        <XIcon className="size-3" />
                      </span>
                    )}
                  </Badge>
                ))
              : selected[0] !== undefined && (
                  <SelectedLabel
                    component={component}
                    label={labelFor(selected[0])}
                    className="truncate"
                  />
                )}
          </span>
          {loading ? (
            <Spinner className="opacity-50" />
          ) : (
            <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={
              component.searchPrompt ?? t('form.search_placeholder', {}, 'Type to search…')
            }
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading && filtered.length === 0 ? (
              <div
                data-slot="select-loading"
                className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm"
              >
                <Spinner />{' '}
                {search !== ''
                  ? (component.searchingMessage ?? t('form.searching', {}, 'Searching…'))
                  : (component.loadingMessage ?? t('loading', {}, 'Loading…'))}
              </div>
            ) : (
              <CommandEmpty>
                {isEmpty
                  ? (component.noOptionsMessage ??
                    t('form.no_options', {}, 'No options available.'))
                  : (component.noSearchResultsMessage ?? t('no_results', {}, 'No results.'))}
              </CommandEmpty>
            )}
            <CommandGroup>
              {filtered.map((option) => {
                const isSelected = selected.includes(option.value)

                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    onSelect={() => toggle(option.value, option.label)}
                  >
                    <CheckIcon className={cn('size-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                    <OptionLabel option={option} component={component} />
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )

  if (!reorderable) {
    return popover
  }

  return (
    <>
      {popover}
      <ReorderableSelection
        id={id}
        values={Array.isArray(value) ? value : []}
        labelFor={(key) => plainLabel(component, labelFor(key))}
        locked={disabled || readOnly}
        canRemove={canRemove}
        onChange={setValue}
      />
    </>
  )
}

/** The chosen options of a `reorderable()` multi-select, in order. */
function ReorderableSelection({
  id,
  values,
  labelFor,
  locked,
  canRemove,
  onChange,
}: {
  id: string
  values: Array<string | number>
  labelFor: (key: string) => string
  locked: boolean
  canRemove: boolean
  onChange: (values: Array<string | number>) => void
}) {
  const t = useT()
  const direction = useDirection()
  const listRef = useRef<HTMLUListElement>(null)
  const focusIndex = useRef<number | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    if (focusIndex.current === null) {
      return
    }

    listRef.current
      ?.querySelectorAll<HTMLElement>('[data-select-chip]')
      [focusIndex.current]?.focus()
    focusIndex.current = null
  }, [values])

  if (values.length === 0) {
    return null
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= values.length) {
      return
    }

    onChange(moveListItem(values, from, to))
    focusIndex.current = to
    setAnnouncement(
      t(
        'form.option_moved',
        { option: labelFor(String(values[from])), position: to + 1, total: values.length },
        ':option moved to position :position of :total',
      ),
    )
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>, index: number) => {
    const offset = reorderOffset(event, 'horizontal', direction)

    if (locked || offset === null) {
      return
    }

    event.preventDefault()
    move(index, index + offset)
  }

  return (
    <>
      <ul ref={listRef} data-slot="select-reorder-list" className="mt-2 flex flex-wrap gap-1.5">
        {values.map((item, index) => {
          const key = String(item)
          const label = labelFor(key)

          return (
            <li
              key={key}
              data-select-chip=""
              tabIndex={locked ? undefined : 0}
              aria-describedby={locked ? undefined : `${id}-reorder-hint`}
              draggable={!locked}
              onKeyDown={(event) => onKeyDown(event, index)}
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => !locked && event.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null && dragIndex !== index) move(dragIndex, index)
                setDragIndex(null)
              }}
              onDragEnd={() => setDragIndex(null)}
              className={cn(
                'bg-secondary text-secondary-foreground focus-visible:ring-ring/50 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium outline-none focus-visible:ring-[3px]',
                !locked && 'cursor-grab',
                dragIndex === index && 'opacity-50',
              )}
            >
              {!locked && <GripVerticalIcon aria-hidden className="text-muted-foreground size-3" />}
              <span>{label}</span>
              {!locked && canRemove && (
                <button
                  type="button"
                  aria-label={t('form.remove_tag', { tag: label }, 'Remove :tag')}
                  className="hover:bg-foreground/10 rounded-sm"
                  onClick={() => onChange(values.filter((_, i) => i !== index))}
                >
                  <XIcon className="size-3" />
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {!locked && (
        <span id={`${id}-reorder-hint`} className="sr-only">
          {t('form.reorder_options_hint', {}, 'Press Alt with an arrow key to move this option.')}
        </span>
      )}
      <span aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </span>
    </>
  )
}

/** A selected value's label in the trigger (HTML with `allowHtml()`). */
function SelectedLabel({
  component,
  label,
  className,
}: {
  component: SelectSchema
  label: string
  className?: string
}) {
  return component.allowHtml ? (
    <span className={className} dangerouslySetInnerHTML={{ __html: label }} />
  ) : (
    <span className={className}>{label}</span>
  )
}
