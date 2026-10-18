<script lang="ts">
  import { uniqueKey, valueKey } from '../../lib/keys'
  import { moveListItem, reorderOffset, type TagsInputSchema } from '@alfakit/core'
  import XIcon from '@lucide/svelte/icons/x'
  import { tick } from 'svelte'
  import { useDirection, useT } from '../../context.svelte'
  import { badgeColorClasses, colorClass } from '../../lib/colors'
  import { cn } from '../../lib/utils'
  import { useField } from '../form/form-context.svelte'
  import FieldWrapper from '../schema/FieldWrapper.svelte'
  import { Badge } from '../ui/badge'

  let { component }: { component: TagsInputSchema } = $props()

  const t = useT()
  const field = useField<string[] | null>(() => component)
  let draft = $state('')
  let dragIndex = $state<number | null>(null)
  let listElement = $state<HTMLElement | null>(null)
  // Live-region text announced after a keyboard move.
  let announcement = $state('')
  const reorderable = $derived(Boolean(component.reorderable) && !field.disabled && !field.readOnly)

  const onTagDrop = (index: number) => {
    if (dragIndex !== null && dragIndex !== index)
      field.setValue(moveListItem(tags, dragIndex, index))
    dragIndex = null
  }

  // Alt + ArrowLeft/ArrowRight (flipped in RTL) moves the focused tag.
  const onTagKeyDown = (event: KeyboardEvent, index: number) => {
    const offset = reorderOffset(event, 'horizontal', useDirection())

    if (!reorderable || offset === null) {
      return
    }

    event.preventDefault()
    const target = index + offset

    if (target < 0 || target >= tags.length) {
      return
    }

    const tag = tags[index] ?? ''
    field.setValue(moveListItem(tags, index, target))
    announcement = t(
      'form.tag_moved',
      { tag, position: target + 1, total: tags.length },
      ':tag moved to position :position of :total',
    )
    void tick().then(() =>
      listElement?.querySelectorAll<HTMLElement>('[data-tag]')[target]?.focus(),
    )
  }
  const tags = $derived(field.value ?? [])
  const listId = $derived(component.suggestions ? `${field.id}-suggestions` : undefined)

  const commit = (raw: string) => {
    const tag = `${component.tagPrefix ?? ''}${raw.trim()}${component.tagSuffix ?? ''}`

    if (raw.trim() === '' || tags.includes(tag)) {
      draft = ''

      return
    }

    field.setValue([...tags, tag])
    draft = ''
  }

  const onkeydown = (event: KeyboardEvent) => {
    if (field.readOnly) {
      return
    }

    if (component.splitKeys.includes(event.key)) {
      event.preventDefault()
      commit(draft)
    } else if (event.key === 'Backspace' && draft === '' && tags.length > 0) {
      field.setValue(tags.slice(0, -1))
    }
  }
</script>

<FieldWrapper field={component} htmlFor={field.id} error={field.error}>
  <div
    bind:this={listElement}
    class={cn(
      'border-input has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-ring/50 dark:bg-input/30 flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border px-2 py-1.5 shadow-xs has-[input:focus-visible]:ring-[3px]',
      field.error && 'border-destructive',
      field.disabled && 'opacity-50',
    )}
  >
    {#each tags as tag, index (`${tag}-${index}`)}
      <Badge
        variant="outline"
        data-tag=""
        tabindex={reorderable ? 0 : undefined}
        aria-describedby={reorderable ? `${field.id}-reorder-hint` : undefined}
        onkeydown={(event: KeyboardEvent) => onTagKeyDown(event, index)}
        draggable={reorderable}
        ondragstart={() => (dragIndex = index)}
        ondragover={(event) => reorderable && event.preventDefault()}
        ondrop={() => onTagDrop(index)}
        ondragend={() => (dragIndex = null)}
        class={cn(
          'gap-1 pe-1',
          colorClass(badgeColorClasses, component.color, 'gray'),
          reorderable &&
            'focus-visible:ring-ring/50 cursor-grab outline-none focus-visible:ring-[3px]',
          dragIndex === index && 'opacity-50',
        )}
      >
        {tag}
        {#if !field.disabled && !field.readOnly}
          <button
            type="button"
            aria-label={t('form.remove_tag', { tag }, 'Remove :tag')}
            class="hover:bg-foreground/10 rounded-sm"
            onclick={() => field.setValue(tags.filter((_, i) => i !== index))}
          >
            <XIcon class="size-3" />
          </button>
        {/if}
      </Badge>
    {/each}
    <input
      id={field.id}
      list={listId}
      dir="auto"
      bind:value={draft}
      {onkeydown}
      onblur={() => {
        if (!field.readOnly && draft.trim() !== '') {
          commit(draft)
        }

        field.blur()
      }}
      placeholder={tags.length === 0
        ? (component.placeholder ?? t('form.add_item', {}, 'Add…'))
        : ''}
      disabled={field.disabled}
      readonly={field.readOnly}
      {...field.aria}
      class="placeholder:text-muted-foreground min-w-[6rem] flex-1 bg-transparent text-sm outline-none"
    />
    {#if component.suggestions}
      <datalist id={listId}>
        {#each component.suggestions as suggestion, suggestionIndex (uniqueKey(component.suggestions, suggestionIndex, valueKey))}
          <option value={suggestion}></option>
        {/each}
      </datalist>
    {/if}
    {#if reorderable}
      <span id={`${field.id}-reorder-hint`} class="sr-only"
        >{t('form.reorder_tags_hint', {}, 'Press Alt with an arrow key to move this tag.')}</span
      >
    {/if}
    <span aria-live="polite" aria-atomic="true" class="sr-only">{announcement}</span>
  </div>
</FieldWrapper>
