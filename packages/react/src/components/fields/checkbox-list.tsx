import type { CheckboxListSchema } from '@alfakit/core'
import { fieldIds, gridColumnsClasses, htmlLabelToText, isOptionGroup } from '@alfakit/core'
import { useEffect, useMemo, useState } from 'react'
import { useT } from '../../context'
import { textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { useField } from '../form/form-context'
import { FieldWrapper } from '../schema/field-wrapper'
import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

/**
 * `gridDirection('column')`: options flow down each column (CSS columns). Classes are
 * spelled out so Tailwind generates them.
 */
const COLUMN_FLOW_CLASSES: Record<number, string> = {
  2: 'md:columns-2',
  3: 'md:columns-3',
  4: 'md:columns-4',
  5: 'md:columns-5',
  6: 'md:columns-6',
}

export function CheckboxListField({ component }: { component: CheckboxListSchema }) {
  const t = useT()
  const { value, setValue, error, id, disabled, readOnly, aria } = useField<Array<
    string | number
  > | null>(component)
  const [search, setSearch] = useState('')
  // `searchDebounce()`: the list is filtered by `query`, which trails the input.
  const [debounced, setDebounced] = useState('')
  const query = component.searchDebounce ? debounced : search
  const locked = disabled || readOnly

  const selected = useMemo(() => (value ?? []).map(String), [value])
  const options = useMemo(
    () =>
      component.options.flatMap((option) => (isOptionGroup(option) ? option.options : [option])),
    [component.options],
  )
  const visible = options.filter((option) =>
    (component.allowHtml ? htmlLabelToText(option.label) : option.label)
      .toLowerCase()
      .includes(query.toLowerCase()),
  )

  useEffect(() => {
    if (!component.searchDebounce) return

    const timer = setTimeout(() => setDebounced(search), component.searchDebounce)

    return () => clearTimeout(timer)
  }, [search, component.searchDebounce])
  const columnFlow = component.gridDirection === 'column' && (component.gridColumns ?? 1) > 1
  const selectAll = component.selectAllAction
  const deselectAll = component.deselectAllAction

  const toggle = (key: string, checked: boolean) => {
    setValue(checked ? [...selected, key] : selected.filter((item) => item !== key))
  }

  return (
    <FieldWrapper field={component} htmlFor={id} error={error}>
      <div className="flex flex-col gap-2">
        {(component.searchable || (component.bulkToggleable && !readOnly)) && (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {component.searchable && (
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={component.searchPrompt ?? t('search', {}, 'Search')}
                aria-label={component.searchPrompt ?? t('search', {}, 'Search')}
                className="h-8"
              />
            )}
            {component.bulkToggleable && !readOnly && (
              <div className="flex flex-wrap gap-1">
                {!selectAll?.hidden && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    data-slot="select-all"
                    disabled={disabled}
                    onClick={() =>
                      setValue(
                        options.filter((option) => !option.disabled).map((option) => option.value),
                      )
                    }
                  >
                    {selectAll?.icon && <Icon name={selectAll.icon} />}
                    {selectAll?.label ?? t('table.select_all', {}, 'Select all')}
                  </Button>
                )}
                {!deselectAll?.hidden && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    data-slot="deselect-all"
                    disabled={disabled}
                    onClick={() => setValue([])}
                  >
                    {deselectAll?.icon && <Icon name={deselectAll.icon} />}
                    {deselectAll?.label ?? t('table.deselect_all', {}, 'Deselect all')}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
        <div
          data-grid-direction={component.gridDirection}
          className={cn(
            component.inline
              ? 'flex flex-wrap gap-4'
              : columnFlow
                ? cn(
                    'gap-x-3 *:mb-3 *:break-inside-avoid',
                    COLUMN_FLOW_CLASSES[component.gridColumns ?? 1],
                  )
                : 'grid gap-3',
            !component.inline &&
              !columnFlow &&
              gridColumnsClasses(
                component.gridColumns ? { default: 1, md: component.gridColumns } : { default: 1 },
              ),
          )}
          role="group"
          aria-labelledby={component.label ? fieldIds(id).label : undefined}
          aria-describedby={aria['aria-describedby']}
        >
          {visible.map((option) => {
            const optionId = `${id}-${option.value}`

            return (
              <div key={option.value} className="flex items-start gap-2">
                <Checkbox
                  id={optionId}
                  checked={selected.includes(option.value)}
                  disabled={locked || option.disabled}
                  onCheckedChange={(checked) => toggle(option.value, checked === true)}
                  aria-invalid={aria['aria-invalid']}
                  className="mt-0.5"
                />
                <div className="grid gap-0.5">
                  <Label
                    htmlFor={optionId}
                    className={cn('font-normal', option.color && textColorClasses[option.color])}
                  >
                    {option.icon && <Icon name={option.icon} className="size-4" />}
                    {component.allowHtml ? (
                      <span dangerouslySetInnerHTML={{ __html: option.label }} />
                    ) : (
                      option.label
                    )}
                  </Label>
                  {option.description && (
                    <p className="text-muted-foreground text-xs">{option.description}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {component.searchable && query !== '' && visible.length === 0 && (
          <p
            data-slot="checkbox-list-empty"
            role="status"
            className="text-muted-foreground text-sm"
          >
            {component.noSearchResultsMessage ?? t('no_results', {}, 'No results.')}
          </p>
        )}
      </div>
    </FieldWrapper>
  )
}
