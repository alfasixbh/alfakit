<script lang="ts">
  import {
    fieldActionContext,
    fieldIds,
    moveRepeaterItem,
    reorderedItemKeys,
    resolveItemAction,
    type KeyValueSchema,
    itemActionIcon,
  } from '@alfakit/core'
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down'
  import ChevronUpIcon from '@lucide/svelte/icons/chevron-up'
  import { cn } from '../../lib/utils'
  import { usePageActionContext } from '../actions/action-context'
  import { useField, useOptionalFormStore } from '../form/form-context.svelte'
  import FieldWrapper from '../schema/FieldWrapper.svelte'
  import { Button } from '../ui/button'
  import { Input } from '../ui/input'
  import { useT } from '../../context.svelte'
  import ItemActionButton from './ItemActionButton.svelte'
  import { useRunItemAction } from './item-actions'
  import { useItemMoves } from './item-moves.svelte'

  type Row = { key: string; value: string }

  let { component }: { component: KeyValueSchema } = $props()

  /**
   * The server stores an object; while editing we keep an ordered list of rows so keys
   * can be typed freely (including temporarily duplicate or empty keys).
   */
  const field = useField<Record<string, unknown> | Row[] | null>(() => component)

  const rows = $derived.by<Row[]>(() => {
    const value = field.value

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
  })

  const update = (next: Row[]) => field.setValue(next)

  const t = useT()

  const form = useOptionalFormStore()
  const page = usePageActionContext()
  const context = $derived(fieldActionContext({ token: page.token, form, key: component.key }))
  const runItemAction = useRunItemAction(() => context)
  const addAction = $derived(
    resolveItemAction('add', component, undefined, {
      label: component.addActionLabel,
      icon: 'plus',
      variant: 'ghost',
    }),
  )
  const deleteAction = $derived(
    resolveItemAction('delete', component, undefined, {
      label: t('form.remove_row', {}, 'Remove row'),
      icon: itemActionIcon('key-value', 'delete', 'trash-2'),
    }),
  )
  const reorderAction = $derived(
    resolveItemAction('reorder', component, undefined, {
      label: t('form.reorder_item', {}, 'Reorder'),
      icon: itemActionIcon('key-value', 'reorder', 'grip-vertical'),
    }),
  )
  const deletable = $derived(component.deletable && !field.readOnly && deleteAction !== null)
  const reorderable = $derived(
    component.reorderable && !field.readOnly && !field.disabled && reorderAction !== null,
  )
  let dragIndex = $state<number | null>(null)
  // Moving runs the reorder action: in the browser, or on the server when customised.
  const move = (from: number, to: number) =>
    runItemAction(reorderAction, { items: reorderedItemKeys(rows.length, from, to) }, () =>
      update(moveRepeaterItem(rows, from, to) as Row[]),
    )
  // Move buttons: announced, one at a time, focus kept on the moved row.
  const moves = useItemMoves(
    move,
    (index) => rows[index]?.key || null,
    () => rows.length,
  )
  const onRowDrop = (index: number) => {
    if (dragIndex !== null && dragIndex !== index) move(dragIndex, index)
    dragIndex = null
  }
</script>

<FieldWrapper field={component} htmlFor={field.id} error={field.error}>
  <div bind:this={moves.state.container} class="overflow-hidden rounded-md border">
    <span aria-live="polite" aria-atomic="true" class="sr-only" data-slot="item-move-status"
      >{moves.state.announcement}</span
    >
    <table
      class="w-full text-sm"
      aria-labelledby={component.label ? fieldIds(field.id).label : undefined}
      aria-describedby={field.aria['aria-describedby']}
    >
      <thead class="bg-muted/50 text-muted-foreground text-xs">
        <tr>
          {#if reorderable}<th class="w-16"></th>{/if}
          <th class="px-3 py-2 text-start font-medium">{component.keyLabel}</th>
          <th class="px-3 py-2 text-start font-medium">{component.valueLabel}</th>
          {#if deletable}<th class="w-10"></th>{/if}
        </tr>
      </thead>
      <tbody>
        {#each rows as row, index (index)}
          <tr
            data-index={index}
            draggable={reorderable}
            ondragstart={() => (dragIndex = index)}
            ondragover={(event) => reorderable && event.preventDefault()}
            ondrop={() => onRowDrop(index)}
            ondragend={() => (dragIndex = null)}
            class={cn('border-t', dragIndex === index && 'opacity-50')}
          >
            {#if reorderable}
              <td class="p-1.5">
                <div class="flex items-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={t('form.move_up', {}, 'Move up')}
                    disabled={index === 0}
                    data-item-move="up"
                    onclick={() => moves.moveWithButton(index, index - 1)}><ChevronUpIcon /></Button
                  >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={t('form.move_down', {}, 'Move down')}
                    disabled={index === rows.length - 1}
                    data-item-move="down"
                    onclick={() => moves.moveWithButton(index, index + 1)}
                    ><ChevronDownIcon /></Button
                  >
                </div>
              </td>
            {/if}
            <td class="p-1.5">
              <Input
                value={row.key}
                dir="auto"
                readonly={field.readOnly || !component.editableKeys}
                disabled={field.disabled}
                placeholder={component.keyPlaceholder}
                aria-label={component.keyLabel}
                aria-invalid={field.aria['aria-invalid']}
                class="h-8"
                oninput={(event) =>
                  update(
                    rows.map((item, i) =>
                      i === index ? { ...item, key: event.currentTarget.value } : item,
                    ),
                  )}
                onblur={field.blur}
              />
            </td>
            <td class="p-1.5">
              <Input
                value={row.value}
                dir="auto"
                readonly={field.readOnly || !component.editableValues}
                disabled={field.disabled}
                placeholder={component.valuePlaceholder}
                aria-label={component.valueLabel}
                aria-invalid={field.aria['aria-invalid']}
                class="h-8"
                oninput={(event) =>
                  update(
                    rows.map((item, i) =>
                      i === index ? { ...item, value: event.currentTarget.value } : item,
                    ),
                  )}
                onblur={field.blur}
              />
            </td>
            {#if deletable}
              <td class="p-1.5">
                <ItemActionButton
                  action={deleteAction}
                  {context}
                  args={{ item: String(index) }}
                  size="sm"
                  disabled={field.disabled}
                  class="text-muted-foreground"
                  onClient={() => update(rows.filter((_, i) => i !== index))}
                />
              </td>
            {/if}
          </tr>
        {/each}
        {#if rows.length === 0}
          <tr class="border-t">
            <td
              colspan={reorderable ? 4 : 3}
              class="text-muted-foreground px-3 py-4 text-center text-xs">—</td
            >
          </tr>
        {/if}
      </tbody>
    </table>
    {#if component.addable && !field.readOnly && addAction}
      <div class="border-t p-1.5">
        <ItemActionButton
          action={addAction}
          {context}
          size="sm"
          disabled={field.disabled}
          onClient={() => update([...rows, { key: '', value: '' }])}
        />
      </div>
    {/if}
  </div>
</FieldWrapper>
