import type {
  CellSchema,
  ColorColumnSchema,
  ColumnSchema,
  IconColumnSchema,
  Option,
  OptionOrGroup,
  RecordKey,
  SelectColumnSchema,
  TextInputColumnSchema,
  ToggleColumnSchema,
  ViewColumnSchema,
} from '@alfakit/core'
import {
  columnRegistryKey,
  filterSelectColumnOptions,
  isOptionGroup,
  optionText,
  remainingTextSizeClass,
  resolvePartialProps,
  searchTableColumnOptions,
  selectColumnEmptyMessage,
  stackedImageStyle,
  updateTableCell,
  usesDefaultImageStack,
} from '@alfakit/core'
import { router } from '@inertiajs/react'
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import { createElement, useEffect, useRef, useState } from 'react'
import { usePanel, useRegistry, useT } from '../../context'
import { extraProps } from '../../lib/attributes'
import {
  colorClass,
  iconSizeClasses,
  switchOffColorClasses,
  switchOnColorClasses,
  textColorClasses,
} from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { FormattedText } from '../entries/text-entry'
import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command'
import { Input } from '../ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Spinner } from '../ui/spinner'
import { Switch } from '../ui/switch'

export interface CellProps {
  column: ColumnSchema
  cell: CellSchema
  recordKey: RecordKey
  token: string
  component: string
}

export function TableCellContent(props: CellProps) {
  const { column } = props
  // A component registered as `column:<type>` replaces the built-in cell renderer.
  const Custom = useRegistry().resolve(columnRegistryKey(column))

  if (Custom) {
    return createElement(Custom, props)
  }

  switch (column.type) {
    case 'IconColumn':
      return <IconCell {...props} />
    case 'ImageColumn':
      return <ImageCell {...props} />
    case 'ColorColumn':
      return <ColorCell {...props} />
    case 'ToggleColumn':
    case 'CheckboxColumn':
      return <BooleanCell {...props} />
    case 'SelectColumn':
      return <SelectCell {...props} />
    case 'TextInputColumn':
      return <TextInputCell {...props} />
    case 'ViewColumn':
      return <ViewCell {...props} />
    default:
      return <TextCell {...props} />
  }
}

/** `IconColumn`: one icon, or one per item of a list state (`wrap()` lets them wrap). */
function IconCell({ column, cell }: CellProps) {
  const icons = cell.icons ?? (cell.icon ? [{ icon: cell.icon, color: cell.color }] : [])
  const sizeClass = colorClass(iconSizeClasses, cell.size, 'md')

  if (icons.length === 0) {
    return <span className="text-muted-foreground">—</span>
  }

  if (!cell.icons) {
    return (
      <Icon
        name={icons[0]!.icon}
        className={cn(sizeClass, icons[0]!.color && textColorClasses[icons[0]!.color])}
      />
    )
  }

  return (
    <div
      data-slot="icon-column-icons"
      className={cn(
        'flex items-center gap-1.5',
        (column as IconColumnSchema).wrap ? 'flex-wrap' : 'flex-nowrap',
      )}
    >
      {icons.map((item, index) => (
        <Icon
          key={index}
          name={item.icon}
          className={cn(sizeClass, item.color && textColorClasses[item.color])}
        />
      ))}
    </div>
  )
}

/** `ViewColumn`: the application component registered under the column's `view()` name. */
function ViewCell(props: CellProps) {
  const t = useT()
  const name = (props.column as ViewColumnSchema).component ?? ''
  const Custom = useRegistry().resolve(name)

  if (!name || !Custom) {
    return (
      <span className="text-destructive text-xs">
        {t('component_not_registered', { component: name }, `Component ${name} is not registered.`)}
      </span>
    )
  }

  return createElement(Custom, { ...(props.cell.props ?? {}), state: props.cell.state, ...props })
}

function TextCell({ column, cell }: CellProps) {
  const text = (
    <FormattedText
      value={cell.state}
      schema={{
        ...(column as object),
        color: cell.color,
        icon: cell.icon,
        iconPosition: cell.iconPosition,
        iconColor: cell.iconColor,
        itemColors: cell.itemColors,
        itemIcons: cell.itemIcons,
        itemUrls: cell.itemUrls,
      }}
    />
  )
  const description = cell.description ? (
    <span className="text-muted-foreground block text-xs">{cell.description}</span>
  ) : null
  const position =
    (column as { descriptionPosition?: 'above' | 'below' }).descriptionPosition ?? 'below'

  return (
    <div className="flex flex-col gap-0.5">
      {position === 'above' && description}
      {text}
      {position === 'below' && description}
    </div>
  )
}

function ImageCell({ column, cell }: CellProps) {
  const urls = Array.isArray(cell.state) ? (cell.state as string[]) : []
  const schema = column as {
    circular?: boolean
    square?: boolean
    size?: number | string
    height?: number | string
    width?: string
    stacked?: boolean
    limit?: number
    limitedRemainingText?: boolean
    limitedRemainingTextSize?: string
    wrap?: boolean
    ring?: number
    overlap?: number
  }
  const limit = schema.limit ?? urls.length
  const size = schema.size ?? 40

  if (urls.length === 0) {
    return <span className="text-muted-foreground">—</span>
  }

  return (
    <div
      className={cn(
        'flex items-center',
        schema.wrap && 'flex-wrap',
        schema.stacked ? usesDefaultImageStack(schema) && '-space-x-2' : 'gap-1.5',
        schema.wrap && schema.stacked && 'gap-y-1.5',
      )}
    >
      {urls.slice(0, limit).map((url, index) => (
        <img
          key={index}
          src={url}
          alt={cell.alt ?? ''}
          style={{
            height: schema.height ?? size,
            width: schema.width ?? (schema.square || schema.circular ? size : undefined),
            ...stackedImageStyle(index, schema),
          }}
          {...extraProps(
            cell.extraImgAttributes,
            cn(
              'object-cover',
              schema.circular ? 'rounded-full' : 'rounded-md',
              schema.stacked && usesDefaultImageStack(schema) && 'ring-background ring-2',
            ),
          )}
        />
      ))}
      {schema.limitedRemainingText && urls.length > limit && (
        <span
          data-slot="image-remaining"
          className={cn(
            'text-muted-foreground ms-1',
            remainingTextSizeClass(schema.limitedRemainingTextSize),
          )}
        >
          +{urls.length - limit}
        </span>
      )}
    </div>
  )
}

function ColorCell({ column, cell }: CellProps) {
  const t = useT()
  const schema = column as ColorColumnSchema
  const [copied, setCopied] = useState<string | null>(null)
  const colors = Array.isArray(cell.state)
    ? (cell.state as string[])
    : cell.state
      ? [String(cell.state)]
      : []

  if (colors.length === 0) {
    return <span className="text-muted-foreground">—</span>
  }

  const copy = (color: string) => {
    void navigator.clipboard?.writeText(color).then(() => {
      setCopied(color)
      setTimeout(() => setCopied(null), schema.copyMessageDuration ?? 1500)
    })
  }

  return (
    <div className={cn('flex items-center gap-1.5', schema.wrap ? 'flex-wrap' : 'flex-nowrap')}>
      {colors.map((color) =>
        schema.copyable ? (
          <button
            key={color}
            type="button"
            data-slot="color-copy"
            title={color}
            aria-label={`${t('copy', {}, 'Copy')} ${color}`}
            className="focus-visible:ring-ring/50 inline-flex rounded outline-none focus-visible:ring-[3px]"
            onClick={(event) => {
              // The cell may sit inside a link or a clickable row.
              event.preventDefault()
              event.stopPropagation()
              copy(color)
            }}
          >
            <span
              className="inline-flex size-5 items-center justify-center rounded border shadow-xs"
              style={{ backgroundColor: color }}
            >
              {copied === color && <CheckIcon className="size-3 text-white mix-blend-difference" />}
            </span>
          </button>
        ) : (
          <span
            key={color}
            title={color}
            className="size-5 rounded border shadow-xs"
            style={{ backgroundColor: color }}
          />
        ),
      )}
      {schema.copyable && copied && (
        <span role="status" className={cn('text-xs', !schema.copyMessage && 'sr-only')}>
          {schema.copyMessage ?? t('copied', {}, 'Copied')}
        </span>
      )}
    </div>
  )
}

function useCellUpdate({ recordKey, column, token, component }: CellProps) {
  const panel = usePanel()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = async (state: unknown) => {
    if (!panel.endpoints.tableCell || !panel.endpoints.tableReorder) return

    setSaving(true)
    setError(null)

    try {
      await updateTableCell(
        { cell: panel.endpoints.tableCell, reorder: panel.endpoints.tableReorder },
        token,
        component,
        recordKey,
        column.name,
        state,
      )
      router.reload({ only: resolvePartialProps(['page']) })
    } catch (caught) {
      const errors = (caught as { errors?: Record<string, string[]> }).errors
      setError(errors?.state?.[0] ?? (caught as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return { update, saving, error }
}

function BooleanCell(props: CellProps) {
  const { column, cell } = props
  const { update, saving } = useCellUpdate(props)
  const [checked, setChecked] = useState(Boolean(cell.state))
  const disabled = Boolean(cell.disabled) || saving
  const toggle = column as ToggleColumnSchema

  const onChange = (next: boolean) => {
    setChecked(next)
    void update(next)
  }

  if (column.type === 'CheckboxColumn') {
    return (
      <Checkbox
        checked={checked}
        disabled={disabled}
        aria-label={column.label || column.name}
        onCheckedChange={(value) => onChange(value === true)}
        onClick={(event) => event.stopPropagation()}
      />
    )
  }

  return (
    <span className="inline-flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
      <Switch
        checked={checked}
        disabled={disabled}
        aria-label={column.label || column.name}
        onCheckedChange={onChange}
        className={cn(
          toggle.onColor && colorClass(switchOnColorClasses, toggle.onColor),
          toggle.offColor && colorClass(switchOffColorClasses, toggle.offColor),
        )}
      />
      {(checked ? toggle.onIcon : toggle.offIcon) && (
        <Icon
          name={checked ? toggle.onIcon : toggle.offIcon}
          className={cn(
            colorClass(textColorClasses, checked ? toggle.onColor : toggle.offColor, 'gray'),
          )}
        />
      )}
    </span>
  )
}

function flatten(options: OptionOrGroup[]) {
  return options.flatMap((option) => (isOptionGroup(option) ? option.options : [option]))
}

function SelectCell(props: CellProps) {
  const schema = props.column as SelectColumnSchema

  return schema.native === false ? (
    <SelectComboboxCell {...props} />
  ) : (
    <NativeSelectCell {...props} />
  )
}

/**
 * An option label: sanitised HTML under `allowOptionsHtml()`, text otherwise. Long labels
 * wrap unless `wrapOptionLabels(false)` truncates them.
 */
function SelectOptionLabel({
  label,
  html,
  truncate,
}: {
  label: string
  html?: boolean
  truncate?: boolean
}) {
  const className = truncate ? 'min-w-0 truncate' : 'min-w-0 break-words whitespace-normal'

  // The server sanitises HTML labels (`Support\Html::sanitize`).
  return html ? (
    <span className={className} dangerouslySetInnerHTML={{ __html: label }} />
  ) : (
    <span className={className}>{label}</span>
  )
}

/**
 * `SelectColumn::native(false)`: a combobox, searchable with `searchableOptions()`. Options
 * come with the table, or from the server (`optionsSearchPath`) as the user types.
 */
function SelectComboboxCell(props: CellProps) {
  const { column, cell, recordKey, token, component } = props
  const schema = column as SelectColumnSchema
  const t = useT()
  const panel = usePanel()
  const { update, saving, error } = useCellUpdate(props)
  const [value, setValue] = useState(
    cell.state === null || cell.state === undefined ? '' : String(cell.state),
  )
  const [label, setLabel] = useState(cell.optionLabel)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [remote, setRemote] = useState<Option[]>([])
  const request = useRef(0)
  const isRemote = Boolean(schema.optionsSearchPath)
  const debounce = schema.optionsSearchDebounce ?? 300
  const staticOptions = flatten(schema.options)

  useEffect(() => {
    if (!open || !isRemote || !panel.endpoints.schemaOptions) return

    const url = panel.endpoints.schemaOptions
    const timer = setTimeout(() => {
      const current = ++request.current
      setLoading(true)

      void searchTableColumnOptions(url, token, component, schema, search)
        .then((results) => current === request.current && setRemote(results))
        .catch(() => current === request.current && setRemote([]))
        .finally(() => current === request.current && setLoading(false))
    }, debounce)

    return () => clearTimeout(timer)
  }, [open, search, isRemote, panel.endpoints.schemaOptions, token, component, schema, debounce])

  const options = filterSelectColumnOptions(
    isRemote ? remote : staticOptions,
    schema,
    isRemote ? '' : search,
    recordKey,
  )
  const emptyMessage = selectColumnEmptyMessage(schema, {
    loading,
    search,
    optionCount: options.length,
  })
  const currentLabel =
    staticOptions.find((option) => option.value === value)?.label ??
    remote.find((option) => option.value === value)?.label ??
    label

  const choose = (next: string, nextLabel?: string) => {
    setValue(next)
    setLabel(nextLabel)
    setOpen(false)
    void update(next === '' ? null : next)
  }

  return (
    <span onClick={(event) => event.stopPropagation()}>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next)

          if (!next) setSearch('')
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            role="combobox"
            aria-expanded={open}
            aria-label={column.label || column.name}
            aria-invalid={error ? true : undefined}
            disabled={Boolean(cell.disabled) || saving}
            className={cn(
              'h-8 min-w-32 justify-between font-normal',
              error && 'border-destructive',
            )}
          >
            {value !== '' && currentLabel !== undefined ? (
              <SelectOptionLabel label={currentLabel} html={schema.allowOptionsHtml} truncate />
            ) : (
              <span className="text-muted-foreground">
                {schema.placeholder ??
                  (value !== '' ? value : t('select_option', {}, 'Select an option'))}
              </span>
            )}
            {loading ? (
              <Spinner className="opacity-50" />
            ) : (
              <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command shouldFilter={false}>
            {schema.searchableOptions && (
              <CommandInput
                placeholder={
                  schema.searchPrompt ?? t('form.search_placeholder', {}, 'Type to search…')
                }
                value={search}
                onValueChange={setSearch}
              />
            )}
            <CommandList>
              <CommandEmpty data-slot="select-column-message">
                {emptyMessage.message ?? t(emptyMessage.key, {}, emptyMessage.fallback)}
              </CommandEmpty>
              <CommandGroup>
                {schema.selectablePlaceholder && value !== '' && (
                  <CommandItem value="" onSelect={() => choose('')}>
                    <span className="text-muted-foreground">
                      {schema.placeholder ?? t('clear', {}, 'Clear')}
                    </span>
                  </CommandItem>
                )}
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    keywords={[optionText(option.label)]}
                    disabled={option.disabled}
                    onSelect={() => choose(option.value, option.label)}
                  >
                    <CheckIcon
                      className={cn('size-4', option.value === value ? 'opacity-100' : 'opacity-0')}
                    />
                    <SelectOptionLabel
                      label={option.label}
                      html={schema.allowOptionsHtml}
                      truncate={schema.wrapOptionLabels === false}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <span className="text-destructive block text-xs">{error}</span>}
    </span>
  )
}

function NativeSelectCell(props: CellProps) {
  const { column, cell } = props
  const schema = column as SelectColumnSchema
  const { update, saving, error } = useCellUpdate(props)
  const [value, setValue] = useState(
    cell.state === null || cell.state === undefined ? '' : String(cell.state),
  )

  return (
    <span onClick={(event) => event.stopPropagation()}>
      <select
        value={value}
        disabled={Boolean(cell.disabled) || saving}
        onChange={(event) => {
          setValue(event.target.value)
          void update(event.target.value === '' ? null : event.target.value)
        }}
        aria-invalid={error ? true : undefined}
        className={cn(
          'border-input dark:bg-input/30 focus-visible:ring-ring/50 h-8 min-w-32 rounded-md border bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]',
          error && 'border-destructive',
        )}
      >
        {schema.selectablePlaceholder && <option value="">{schema.placeholder ?? ''}</option>}
        {flatten(schema.options)
          .filter((option) => !(schema.ignoreRecord && option.value === String(props.recordKey)))
          .map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
      </select>
      {error && <span className="text-destructive block text-xs">{error}</span>}
    </span>
  )
}

function TextInputCell(props: CellProps) {
  const { column, cell } = props
  const schema = column as TextInputColumnSchema
  const { update, saving, error } = useCellUpdate(props)
  const [value, setValue] = useState(
    cell.state === null || cell.state === undefined ? '' : String(cell.state),
  )
  const initial = cell.state === null || cell.state === undefined ? '' : String(cell.state)
  // `prefix()` / `suffix()`: text affixes around the input, like the TextInput field.
  const grouped = Boolean(cell.prefix || cell.suffix)

  const field = (
    <span className={cn('relative block', grouped && 'min-w-0 flex-1')}>
      {schema.prefixIcon && (
        <span
          data-slot="input-prefix-icon"
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute start-2.5 top-1/2 flex -translate-y-1/2',
            colorClass(textColorClasses, schema.prefixIconColor, 'gray'),
          )}
        >
          <Icon name={schema.prefixIcon} className="size-4" />
        </span>
      )}
      <Input
        type={schema.inputType}
        value={value}
        placeholder={schema.placeholder}
        step={schema.step}
        inputMode={schema.inputMode as React.HTMLAttributes<HTMLInputElement>['inputMode']}
        disabled={Boolean(cell.disabled) || saving}
        aria-invalid={error ? true : undefined}
        className={cn(
          'h-8 min-w-32',
          schema.prefixIcon && 'ps-8',
          schema.suffixIcon && 'pe-8',
          grouped &&
            'h-full rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent',
        )}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => value !== initial && void update(value)}
        onKeyDown={(event) => event.key === 'Enter' && (event.target as HTMLInputElement).blur()}
      />
      {schema.suffixIcon && (
        <span
          data-slot="input-suffix-icon"
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute end-2.5 top-1/2 flex -translate-y-1/2',
            colorClass(textColorClasses, schema.suffixIconColor, 'gray'),
          )}
        >
          <Icon name={schema.suffixIcon} className="size-4" />
        </span>
      )}
    </span>
  )

  return (
    <span onClick={(event) => event.stopPropagation()}>
      {grouped ? (
        <span
          data-slot="input-group"
          className={cn(
            'border-input dark:bg-input/30 has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-ring/50 flex h-8 min-w-32 items-stretch overflow-hidden rounded-md border shadow-xs has-[input:focus-visible]:ring-[3px]',
            error && 'border-destructive',
          )}
        >
          {cell.prefix && (
            <span
              data-slot="input-prefix"
              className="text-muted-foreground bg-muted/50 flex items-center border-e px-2 text-sm"
            >
              {cell.prefix}
            </span>
          )}
          {field}
          {cell.suffix && (
            <span
              data-slot="input-suffix"
              className="text-muted-foreground bg-muted/50 flex items-center border-s px-2 text-sm"
            >
              {cell.suffix}
            </span>
          )}
        </span>
      ) : (
        field
      )}
      {error && <span className="text-destructive block text-xs">{error}</span>}
    </span>
  )
}
