import {
  fieldIds,
  itemActionIcon,
  moveRepeaterItem,
  reorderedItemKeys,
  resolveItemAction,
  type KeyValueSchema,
} from '@alfakit/core'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useT } from '../../context'
import { cn } from '../../lib/utils'
import { useField } from '../form/form-context'
import { useFieldActionContext } from '../schema/field-actions'
import { FieldWrapper } from '../schema/field-wrapper'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { ItemActionButton, useItemMoves, useRunItemAction } from './item-actions'

type Row = { key: string; value: string }

/**
 * The server stores an object; while editing we keep an ordered list of rows so keys
 * can be typed freely (including temporarily duplicate or empty keys).
 */
export function KeyValueField({ component }: { component: KeyValueSchema }) {
  const t = useT()
  const { value, setValue, blur, error, id, disabled, readOnly, aria } = useField<
    Record<string, unknown> | Row[] | null
  >(component)

  const rows = useMemo<Row[]>(() => {
    if (Array.isArray(value)) {
      return value.map((row) => ({
        key: String(row.key ?? ''),
        value: row.value === null || row.value === undefined ? '' : String(row.value),
      }))
    }

    return Object.entries(value ?? {}).map(([key, rowValue]) => ({
      key,
      value: rowValue === null || rowValue === undefined ? '' : String(rowValue),
    }))
  }, [value])

  const context = useFieldActionContext(component)
  const runItemAction = useRunItemAction(context)
  const addAction = resolveItemAction('add', component, undefined, {
    label: component.addActionLabel,
    icon: 'plus',
    variant: 'ghost',
  })
  const deleteAction = resolveItemAction('delete', component, undefined, {
    label: t('form.remove_row', {}, 'Remove row'),
    icon: itemActionIcon('key-value', 'delete', 'trash-2'),
  })
  const reorderAction = resolveItemAction('reorder', component, undefined, {
    label: t('form.reorder_item', {}, 'Reorder'),
    icon: itemActionIcon('key-value', 'reorder', 'grip-vertical'),
  })

  const update = (next: Row[]) => setValue(next)
  const deletable = component.deletable && !readOnly && deleteAction !== null
  const reorderable = component.reorderable && !readOnly && !disabled && reorderAction !== null
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  // Moving runs the reorder action: in the browser, or on the server when customised.
  const move = (from: number, to: number) =>
    runItemAction(reorderAction, { items: reorderedItemKeys(rows.length, from, to) }, () =>
      update(moveRepeaterItem(rows, from, to) as Row[]),
    )
  // Move buttons: announced, one at a time, focus kept on the moved row.
  const {
    moveWithButton,
    region: moveRegion,
    containerRef: moveContainerRef,
  } = useItemMoves(value, move, (index) => rows[index]?.key || null, rows.length)

  return (
    <FieldWrapper field={component} htmlFor={id} error={error}>
      <div ref={moveContainerRef} className="overflow-hidden rounded-md border">
        {moveRegion}
        <table
          className="w-full text-sm"
          aria-labelledby={component.label ? fieldIds(id).label : undefined}
          aria-describedby={aria['aria-describedby']}
        >
          <thead className="bg-muted/50 text-muted-foreground text-xs">
            <tr>
              {reorderable && <th className="w-16" />}
              <th className="px-3 py-2 text-start font-medium">{component.keyLabel}</th>
              <th className="px-3 py-2 text-start font-medium">{component.valueLabel}</th>
              {deletable && <th className="w-10" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={index}
                data-index={index}
                draggable={reorderable}
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => reorderable && event.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null && dragIndex !== index) move(dragIndex, index)
                  setDragIndex(null)
                }}
                onDragEnd={() => setDragIndex(null)}
                className={cn('border-t', dragIndex === index && 'opacity-50')}
              >
                {reorderable && (
                  <td className="p-1.5">
                    <div className="flex items-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={t('form.move_up', {}, 'Move up')}
                        disabled={index === 0}
                        data-item-move="up"
                        onClick={() => moveWithButton(index, index - 1)}
                      >
                        <ChevronUpIcon />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={t('form.move_down', {}, 'Move down')}
                        disabled={index === rows.length - 1}
                        data-item-move="down"
                        onClick={() => moveWithButton(index, index + 1)}
                      >
                        <ChevronDownIcon />
                      </Button>
                    </div>
                  </td>
                )}
                <td className="p-1.5">
                  <Input
                    dir="auto"
                    value={row.key}
                    readOnly={readOnly || !component.editableKeys}
                    disabled={disabled}
                    placeholder={component.keyPlaceholder}
                    aria-label={component.keyLabel}
                    aria-invalid={aria['aria-invalid']}
                    className="h-8"
                    onChange={(event) =>
                      update(
                        rows.map((item, i) =>
                          i === index ? { ...item, key: event.target.value } : item,
                        ),
                      )
                    }
                    onBlur={blur}
                  />
                </td>
                <td className="p-1.5">
                  <Input
                    dir="auto"
                    value={row.value}
                    readOnly={readOnly || !component.editableValues}
                    disabled={disabled}
                    placeholder={component.valuePlaceholder}
                    aria-label={component.valueLabel}
                    aria-invalid={aria['aria-invalid']}
                    className="h-8"
                    onChange={(event) =>
                      update(
                        rows.map((item, i) =>
                          i === index ? { ...item, value: event.target.value } : item,
                        ),
                      )
                    }
                    onBlur={blur}
                  />
                </td>
                {deletable && (
                  <td className="p-1.5">
                    <ItemActionButton
                      action={deleteAction}
                      context={context}
                      args={{ item: String(index) }}
                      size="sm"
                      disabled={disabled}
                      className="text-muted-foreground"
                      onClient={() => update(rows.filter((_, i) => i !== index))}
                    />
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr className="border-t">
                <td
                  colSpan={reorderable ? 4 : 3}
                  className="text-muted-foreground px-3 py-4 text-center text-xs"
                >
                  —
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {component.addable && !readOnly && addAction && (
          <div className="border-t p-1.5">
            <ItemActionButton
              action={addAction}
              context={context}
              size="sm"
              disabled={disabled}
              onClient={() => update([...rows, { key: '', value: '' }])}
            />
          </div>
        )}
      </div>
    </FieldWrapper>
  )
}
