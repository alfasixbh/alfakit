import { moveListItem, reorderOffset, type TagsInputSchema } from '@alfakit/core'
import { XIcon } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useDirection, useT } from '../../context'
import { badgeColorClasses, colorClass } from '../../lib/colors'
import { cn } from '../../lib/utils'
import { useField } from '../form/form-context'
import { FieldWrapper } from '../schema/field-wrapper'
import { Badge } from '../ui/badge'

export function TagsInputField({ component }: { component: TagsInputSchema }) {
  const t = useT()
  const { value, setValue, blur, error, id, disabled, readOnly, aria } = useField<string[] | null>(
    component,
  )
  const direction = useDirection()
  const [draft, setDraft] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  // Keyboard reordering: the tag to refocus after a move, and the live-region announcement.
  const focusIndex = useRef<number | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const reorderable = Boolean(component.reorderable) && !disabled && !readOnly
  const tags = value ?? []
  const listId = component.suggestions ? `${id}-suggestions` : undefined

  const commit = (raw: string) => {
    const tag = `${component.tagPrefix ?? ''}${raw.trim()}${component.tagSuffix ?? ''}`

    if (raw.trim() === '' || tags.includes(tag)) {
      setDraft('')

      return
    }

    setValue([...tags, tag])
    setDraft('')
  }

  useEffect(() => {
    if (focusIndex.current === null) {
      return
    }

    listRef.current?.querySelectorAll<HTMLElement>('[data-tag]')[focusIndex.current]?.focus()
    focusIndex.current = null
  }, [value])

  // Alt + ArrowLeft/ArrowRight (flipped in RTL) moves the focused tag.
  const onTagKeyDown = (event: KeyboardEvent<HTMLElement>, index: number) => {
    const offset = reorderOffset(event, 'horizontal', direction)

    if (!reorderable || offset === null) {
      return
    }

    event.preventDefault()
    const target = index + offset

    if (target < 0 || target >= tags.length) {
      return
    }

    setValue(moveListItem(tags, index, target))
    focusIndex.current = target
    setAnnouncement(
      t(
        'form.tag_moved',
        { tag: tags[index] ?? '', position: target + 1, total: tags.length },
        ':tag moved to position :position of :total',
      ),
    )
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (readOnly) {
      return
    }

    if (component.splitKeys.includes(event.key)) {
      event.preventDefault()
      commit(draft)
    } else if (event.key === 'Backspace' && draft === '' && tags.length > 0) {
      setValue(tags.slice(0, -1))
    }
  }

  return (
    <FieldWrapper field={component} htmlFor={id} error={error}>
      <div
        ref={listRef}
        className={cn(
          'border-input dark:bg-input/30 has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-ring/50 flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border px-2 py-1.5 shadow-xs has-[input:focus-visible]:ring-[3px]',
          error && 'border-destructive',
          disabled && 'opacity-50',
        )}
      >
        {tags.map((tag, index) => (
          <Badge
            key={`${tag}-${index}`}
            variant="outline"
            data-tag=""
            tabIndex={reorderable ? 0 : undefined}
            aria-describedby={reorderable ? `${id}-reorder-hint` : undefined}
            onKeyDown={(event) => onTagKeyDown(event, index)}
            draggable={reorderable}
            onDragStart={() => setDragIndex(index)}
            onDragOver={(event) => reorderable && event.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null && dragIndex !== index)
                setValue(moveListItem(tags, dragIndex, index))
              setDragIndex(null)
            }}
            onDragEnd={() => setDragIndex(null)}
            className={cn(
              'gap-1 pe-1',
              colorClass(badgeColorClasses, component.color, 'gray'),
              reorderable &&
                'focus-visible:ring-ring/50 cursor-grab outline-none focus-visible:ring-[3px]',
              dragIndex === index && 'opacity-50',
            )}
          >
            {tag}
            {!disabled && !readOnly && (
              <button
                type="button"
                aria-label={t('form.remove_tag', { tag }, 'Remove :tag')}
                className="hover:bg-foreground/10 rounded-sm"
                onClick={() => setValue(tags.filter((_, i) => i !== index))}
              >
                <XIcon className="size-3" />
              </button>
            )}
          </Badge>
        ))}
        <input
          dir="auto"
          id={id}
          list={listId}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (!readOnly && draft.trim() !== '') {
              commit(draft)
            }

            blur()
          }}
          placeholder={
            tags.length === 0 ? (component.placeholder ?? t('form.add_item', {}, 'Add…')) : ''
          }
          disabled={disabled}
          readOnly={readOnly}
          {...aria}
          className="placeholder:text-muted-foreground min-w-[6rem] flex-1 bg-transparent text-sm outline-none"
        />
        {component.suggestions && (
          <datalist id={listId}>
            {component.suggestions.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        )}
        {reorderable && (
          <span id={`${id}-reorder-hint`} className="sr-only">
            {t('form.reorder_tags_hint', {}, 'Press Alt with an arrow key to move this tag.')}
          </span>
        )}
        <span aria-live="polite" aria-atomic="true" className="sr-only">
          {announcement}
        </span>
      </div>
    </FieldWrapper>
  )
}
