<script lang="ts">
  import { moveListItem, reorderOffset } from '@alfakit/core'
  import GripVerticalIcon from '@lucide/svelte/icons/grip-vertical'
  import XIcon from '@lucide/svelte/icons/x'
  import { tick } from 'svelte'
  import { useDirection, useT } from '../../context.svelte'
  import { uniqueKey, valueKey } from '../../lib/keys'
  import { cn } from '../../lib/utils'

  /** The chosen options of a `reorderable()` multi-select, in order. */
  interface Props {
    id: string
    values: Array<string | number>
    labelFor: (key: string) => string
    locked: boolean
    canRemove: boolean
    onChange: (values: Array<string | number>) => void
  }

  let { id, values, labelFor, locked, canRemove, onChange }: Props = $props()

  const t = useT()
  const direction = useDirection()
  let dragIndex = $state<number | null>(null)
  let listElement = $state<HTMLElement | null>(null)
  let announcement = $state('')

  const move = (from: number, to: number) => {
    if (to < 0 || to >= values.length) {
      return
    }

    const label = labelFor(String(values[from]))
    const total = values.length
    onChange(moveListItem(values, from, to))
    announcement = t(
      'form.option_moved',
      { option: label, position: to + 1, total },
      ':option moved to position :position of :total',
    )
    void tick().then(() =>
      listElement?.querySelectorAll<HTMLElement>('[data-select-chip]')[to]?.focus(),
    )
  }

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const offset = reorderOffset(event, 'horizontal', direction)

    if (locked || offset === null) {
      return
    }

    event.preventDefault()
    move(index, index + offset)
  }
</script>

{#if values.length > 0}
  <ul bind:this={listElement} data-slot="select-reorder-list" class="mt-2 flex flex-wrap gap-1.5">
    {#each values as item, index (uniqueKey(values, index, valueKey))}
      <!-- Focusable so Alt + arrow keys can move it (like TagsInput's tags). -->
      <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
      <li
        data-select-chip=""
        tabindex={locked ? undefined : 0}
        aria-describedby={locked ? undefined : `${id}-reorder-hint`}
        draggable={!locked}
        class={cn(
          'bg-secondary text-secondary-foreground focus-visible:ring-ring/50 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium outline-none focus-visible:ring-[3px]',
          !locked && 'cursor-grab',
          dragIndex === index && 'opacity-50',
        )}
        onkeydown={(event) => onKeyDown(event, index)}
        ondragstart={() => (dragIndex = index)}
        ondragover={(event) => {
          if (!locked) event.preventDefault()
        }}
        ondrop={() => {
          if (dragIndex !== null && dragIndex !== index) move(dragIndex, index)
          dragIndex = null
        }}
        ondragend={() => (dragIndex = null)}
      >
        {#if !locked}<GripVerticalIcon
            aria-hidden="true"
            class="text-muted-foreground size-3"
          />{/if}
        <span>{labelFor(String(item))}</span>
        {#if !locked && canRemove}
          <button
            type="button"
            aria-label={t('form.remove_tag', { tag: labelFor(String(item)) }, 'Remove :tag')}
            class="hover:bg-foreground/10 rounded-sm"
            onclick={() => onChange(values.filter((_, i) => i !== index))}
          >
            <XIcon class="size-3" />
          </button>
        {/if}
      </li>
    {/each}
  </ul>
  {#if !locked}
    <span id={`${id}-reorder-hint`} class="sr-only"
      >{t(
        'form.reorder_options_hint',
        {},
        'Press Alt with an arrow key to move this option.',
      )}</span
    >
  {/if}
  <span aria-live="polite" aria-atomic="true" class="sr-only">{announcement}</span>
{/if}
