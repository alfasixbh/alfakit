import {
  fieldIds,
  iconPickerPreview,
  IconPickerSearch,
  isCustomSvgIcon,
  type IconPickerSchema,
} from '@alfakit/core'
import { ChevronsUpDownIcon, XIcon } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useChoice, useDirection, useFormatter, useT } from '../../context'
import { useStore } from '../../hooks/use-store'
import { extraProps } from '../../lib/attributes'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { useField, useFormStore } from '../form/form-context'
import { FieldWrapper } from '../schema/field-wrapper'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Spinner } from '../ui/spinner'
import { Textarea } from '../ui/textarea'
import { ICON_PICKER_SIZES, IconPickerValue } from './icon-picker-value'

/**
 * `IconPicker::make()`: a trigger showing the selected icon and a popover with a search
 * box, a set filter and a grid of icons loaded from the server a page at a time. The grid
 * is a listbox driven from the search box (`aria-activedescendant`): arrow keys move,
 * Enter picks, Escape closes.
 */
export function IconPickerField({ component }: { component: IconPickerSchema }) {
  const t = useT()
  const choice = useChoice()
  const format = useFormatter()
  const rtl = useDirection() === 'rtl'
  const form = useFormStore()
  const { value, setValue, blur, error, id, disabled, readOnly, aria } = useField<string | null>(
    component,
  )
  const search = useMemo(
    () => new IconPickerSearch(form, component.statePath),
    [form, component.statePath],
  )
  const state = useStore(search.store)
  const [open, setOpen] = useState(false)
  const [svg, setSvg] = useState('')
  const grid = useRef<HTMLDivElement>(null)
  const listId = `${useId()}-icons`
  const size = ICON_PICKER_SIZES[component.previewSize] ?? ICON_PICKER_SIZES.md
  const columns = Math.max(1, component.gridColumns)
  const current = typeof value === 'string' && value !== '' ? value : null
  const locked = disabled || readOnly

  useEffect(() => () => search.destroy(), [search])

  // Keep the highlighted icon in view while the arrow keys move it.
  useEffect(() => {
    if (state.active < 0) return

    grid.current?.ownerDocument
      .getElementById(`${listId}-${state.active}`)
      ?.scrollIntoView?.({ block: 'nearest' })
  }, [state.active, listId])

  const pick = (next: string | null) => {
    setValue(next)
    setOpen(false)
    blur()
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      const icon = state.icons[state.active]

      if (icon) {
        event.preventDefault()
        pick(icon.value)
      }

      return
    }

    // Home/End stay with the text cursor while there is a search to edit.
    if ((event.key === 'Home' || event.key === 'End') && state.search !== '') return

    if (search.move(event.key, columns, rtl) !== null) event.preventDefault()
  }

  const status = state.loading
    ? t('form.icon_picker.loading', {}, 'Loading icons…')
    : state.error
      ? t('form.icon_picker.error', {}, 'The icons could not be loaded.')
      : state.icons.length === 0
        ? t('form.icon_picker.no_results', {}, 'No icons found.')
        : choice(
            'form.icon_picker.results',
            state.total,
            { count: format.number(state.total) },
            ':count icon|:count icons',
          )

  return (
    <FieldWrapper field={component} htmlFor={id} error={error}>
      <div data-slot="icon-picker" className="flex items-center gap-2">
        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next)

            if (next) search.open()
          }}
        >
          <PopoverTrigger asChild>
            <Button
              id={id}
              type="button"
              variant="outline"
              data-slot="icon-picker-trigger"
              data-input=""
              aria-haspopup="dialog"
              aria-expanded={open}
              {...aria}
              aria-labelledby={`${fieldIds(id).label} ${id}-value`}
              aria-readonly={readOnly || undefined}
              disabled={locked}
              {...extraProps(
                component.extraInputAttributes,
                cn(
                  'h-9 min-w-0 flex-1 justify-between px-3 font-normal hover:bg-transparent',
                  error && 'border-destructive',
                ),
              )}
            >
              <IconPickerValue
                id={`${id}-value`}
                component={component}
                value={current}
                preview={iconPickerPreview(component.selected, current, search.preview(current))}
              />
              <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            data-slot="icon-picker-content"
            className="flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 p-2"
            onOpenAutoFocus={(event) => {
              if (!component.searchable) {
                event.preventDefault()
                grid.current?.focus()
              }
            }}
          >
            {component.searchable && (
              <Input
                type="search"
                role="combobox"
                autoComplete="off"
                aria-autocomplete="list"
                aria-expanded="true"
                aria-controls={listId}
                aria-activedescendant={state.active >= 0 ? `${listId}-${state.active}` : undefined}
                aria-label={t('form.icon_picker.search_label', {}, 'Search icons')}
                placeholder={t('form.icon_picker.search', {}, 'Search icons…')}
                value={state.search}
                onChange={(event) => search.setSearch(event.target.value)}
                onKeyDown={onKeyDown}
              />
            )}
            {component.sets.length > 1 && (
              <select
                data-slot="icon-picker-set"
                aria-label={t('form.icon_picker.set', {}, 'Icon set')}
                value={state.set ?? ''}
                onChange={(event) => search.setSet(event.target.value || null)}
                className="border-input dark:bg-input/30 h-8 w-full rounded-md border bg-transparent px-2 text-sm"
              >
                <option value="">{t('form.icon_picker.all_sets', {}, 'All sets')}</option>
                {component.sets.map((set) => (
                  <option key={set.key} value={set.key}>
                    {set.label}
                  </option>
                ))}
              </select>
            )}
            <div
              ref={grid}
              id={listId}
              role="listbox"
              data-slot="icon-picker-grid"
              aria-label={component.label ?? t('form.icon_picker.icons', {}, 'Icons')}
              aria-busy={state.loading || undefined}
              tabIndex={component.searchable ? -1 : 0}
              aria-activedescendant={
                !component.searchable && state.active >= 0 ? `${listId}-${state.active}` : undefined
              }
              onKeyDown={component.searchable ? undefined : onKeyDown}
              onScroll={(event) => {
                const target = event.currentTarget

                if (target.scrollTop + target.clientHeight >= target.scrollHeight - 48) {
                  search.loadMore()
                }
              }}
              className="grid max-h-72 gap-1 overflow-y-auto outline-none"
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {state.icons.map((icon, index) => (
                <div
                  key={icon.value}
                  id={`${listId}-${index}`}
                  role="option"
                  data-slot="icon-picker-option"
                  aria-selected={icon.value === current}
                  aria-label={icon.value}
                  title={icon.value}
                  data-active={index === state.active || undefined}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pick(icon.value)}
                  className={cn(
                    'hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center justify-center rounded-md',
                    size.cell,
                    index === state.active && 'bg-accent text-accent-foreground ring-ring ring-2',
                    icon.value === current && 'bg-primary/10 text-primary',
                  )}
                >
                  <Icon name={icon.icon ?? icon.value} className={size.icon} />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              <p
                role="status"
                aria-live="polite"
                className="text-muted-foreground flex items-center gap-1 text-xs"
              >
                {state.loading && <Spinner className="size-3" />}
                {status}
              </p>
              {state.hasMore && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={state.loading}
                  onClick={() => search.loadMore()}
                >
                  {t('form.icon_picker.load_more', {}, 'Load more icons')}
                </Button>
              )}
            </div>
            {component.allowCustomSvg && (
              <div data-slot="icon-picker-custom" className="flex flex-col gap-2 border-t pt-2">
                <Textarea
                  dir="ltr"
                  rows={3}
                  aria-label={t('form.icon_picker.custom_svg_label', {}, 'Paste SVG markup')}
                  placeholder={'<svg viewBox="0 0 24 24">…</svg>'}
                  value={svg}
                  onChange={(event) => setSvg(event.target.value)}
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!isCustomSvgIcon(svg)}
                  onClick={() => {
                    pick(svg.trim())
                    setSvg('')
                  }}
                >
                  {t('form.icon_picker.use_svg', {}, 'Use SVG')}
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
        {current !== null && !locked && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            data-slot="icon-picker-clear"
            aria-label={t('form.icon_picker.clear', {}, 'Clear icon')}
            onClick={() => pick(null)}
          >
            <XIcon />
          </Button>
        )}
      </div>
    </FieldWrapper>
  )
}
