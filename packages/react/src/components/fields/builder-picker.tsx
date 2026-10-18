import type { BuilderBlockSchema, BuilderItemState, BuilderSchema } from '@alfakit/core'
import {
  builderPickerMove,
  canAddBuilderBlock,
  filterBuilderBlocks,
  gridColumnsClasses,
  groupBuilderBlocks,
  stickyCollisionPadding,
} from '@alfakit/core'
import { BlocksIcon, SearchIcon } from 'lucide-react'
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { useDirection, useT } from '../../context'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { Input } from '../ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'

/** `blockPickerWidth()`: spelled out so Tailwind generates them. */
const PICKER_WIDTHS: Record<string, string> = {
  '3xs': 'w-3xs',
  '2xs': 'w-2xs',
  xs: 'w-xs',
  sm: 'w-sm',
  md: 'w-md',
  lg: 'w-lg',
  xl: 'w-xl',
  '2xl': 'w-2xl',
  '3xl': 'w-3xl',
  '4xl': 'w-4xl',
  '5xl': 'w-5xl',
  '6xl': 'w-6xl',
  '7xl': 'w-7xl',
  none: 'w-auto',
  min: 'w-min',
  max: 'w-max',
  fit: 'w-fit',
  prose: 'w-[65ch]',
  container: 'container',
  'screen-sm': 'w-(--breakpoint-sm)',
  'screen-md': 'w-(--breakpoint-md)',
  'screen-lg': 'w-(--breakpoint-lg)',
  'screen-xl': 'w-(--breakpoint-xl)',
  'screen-2xl': 'w-(--breakpoint-2xl)',
  full: 'w-(--radix-popover-trigger-width)',
  screen: 'w-screen',
}

/** Several picker columns at some width: the popover gets room for them. */
function hasColumns(component: BuilderSchema): boolean {
  return Object.values(component.blockPickerColumns ?? {}).some((value) => (value ?? 1) > 1)
}

interface PanelProps {
  component: BuilderSchema
  items: BuilderItemState[]
  onPick: (block: BuilderBlockSchema) => void
  /** Focus the search field (or the first block) when shown. */
  autoFocus?: boolean
  className?: string
}

/**
 * The block picker's content: an optional search field on top and the blocks as a grid
 * of cards (icon, label, description) under their group headings. Arrow keys move
 * between the cards, Enter in the search field adds the first match, typing on a card
 * goes back to the search field.
 */
export function BuilderBlockPickerPanel({
  component,
  items,
  onPick,
  autoFocus,
  className,
}: PanelProps) {
  const t = useT()
  const direction = useDirection()
  const listId = useId()
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const prompt = component.blockSearchPrompt ?? t('builder.search_blocks', {}, 'Search blocks…')
  const blocks = filterBuilderBlocks(
    component.blocks,
    component.blockSearchDebounce ? query : search,
  )
  const groups = groupBuilderBlocks(blocks)
  const columns = component.blockPickerColumns
    ? gridColumnsClasses(component.blockPickerColumns)
    : 'grid-cols-1'

  useEffect(() => {
    if (!component.blockSearchDebounce) return

    const timer = setTimeout(() => setQuery(search), component.blockSearchDebounce)

    return () => clearTimeout(timer)
  }, [search, component.blockSearchDebounce])

  const options = () =>
    [
      ...(listRef.current?.querySelectorAll<HTMLButtonElement>(
        '[data-slot="builder-block-option"]:not(:disabled)',
      ) ?? []),
    ] as HTMLButtonElement[]

  useEffect(() => {
    if (!autoFocus) return

    const frame = requestAnimationFrame(() => {
      if (searchRef.current) searchRef.current.focus()
      else options()[0]?.focus()
    })

    return () => cancelAnimationFrame(frame)
  }, [autoFocus])

  const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const all = options()
    const current = all.indexOf(event.target as HTMLButtonElement)

    if (current === -1) return

    // Typing on a card goes on in the search field.
    if (
      searchRef.current &&
      event.key.length === 1 &&
      event.key !== ' ' &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      searchRef.current.focus()

      return
    }

    if (event.key === 'ArrowUp' && searchRef.current) {
      const rects = all.map((option) => option.getBoundingClientRect())

      if (builderPickerMove('ArrowUp', current, rects, direction === 'rtl') === null) {
        event.preventDefault()
        searchRef.current.focus()

        return
      }
    }

    const next = builderPickerMove(
      event.key,
      current,
      all.map((option) => option.getBoundingClientRect()),
      direction === 'rtl',
    )

    if (next !== null) {
      event.preventDefault()
      all[next]?.focus()
    }
  }

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      options()[0]?.focus()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const first = blocks.find((block) => canAddBuilderBlock(component, block, items))

      if (first) onPick(first)
    }
  }

  const renderOption = (block: BuilderBlockSchema): ReactNode => (
    <button
      key={block.name}
      type="button"
      data-slot="builder-block-option"
      data-block={block.name}
      disabled={!canAddBuilderBlock(component, block, items)}
      onClick={() => onPick(block)}
      className="hover:bg-accent focus-visible:bg-accent focus-visible:ring-ring/50 flex w-full min-w-0 items-start gap-3 rounded-md p-2 text-start outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50"
    >
      <span
        className="bg-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-md border [&_svg]:size-4"
        aria-hidden="true"
      >
        {block.icon ? <Icon name={block.icon} /> : <BlocksIcon />}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm leading-tight font-medium">{block.label}</span>
        {block.description && (
          <span
            className="text-muted-foreground text-xs leading-snug"
            data-slot="builder-block-description"
          >
            {block.description}
          </span>
        )}
      </span>
    </button>
  )

  return (
    <div data-slot="builder-picker" className={cn('flex min-h-0 flex-col', className)}>
      {component.blockSearch && (
        <div className="border-b p-2">
          <div className="relative">
            <SearchIcon
              className="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              ref={searchRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder={prompt}
              aria-label={prompt}
              aria-controls={listId}
              data-slot="builder-block-search"
              className="h-9 ps-8"
            />
          </div>
        </div>
      )}
      <div
        id={listId}
        ref={listRef}
        onKeyDown={onListKeyDown}
        className="min-h-0 flex-1 overflow-y-auto p-2"
      >
        {blocks.length === 0 ? (
          <p role="status" className="text-muted-foreground px-2 py-6 text-center text-sm">
            {component.blockNoSearchResultsMessage ?? t('no_results', {}, 'No results.')}
          </p>
        ) : (
          groups.map((entry) => (
            <div
              key={entry.group ?? ''}
              role="group"
              aria-label={entry.group ?? undefined}
              data-slot="builder-block-group"
              className="not-first:mt-2"
            >
              {entry.group !== null && (
                <p
                  aria-hidden="true"
                  className="text-muted-foreground px-2 pt-1 pb-1.5 text-xs font-medium tracking-wide uppercase"
                >
                  {entry.group}
                </p>
              )}
              <div className={cn('grid gap-1', columns)}>{entry.blocks.map(renderOption)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/**
 * The "Add block" button and its picker, anchored below the button (above it when there
 * is no room) and never wider or taller than the screen.
 */
export function BuilderBlockPicker({
  component,
  items,
  onPick,
  trigger,
}: {
  component: BuilderSchema
  items: BuilderItemState[]
  onPick: (block: BuilderBlockSchema) => void
  trigger: ReactNode
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  // Opening upwards near the top of the page, stay below the sticky topbar.
  const collisionPadding = useMemo(() => (open ? stickyCollisionPadding() : 16), [open])
  const width = component.blockPickerWidth
    ? cn(PICKER_WIDTHS[component.blockPickerWidth], 'max-w-[calc(100vw-2rem)]')
    : hasColumns(component)
      ? 'w-[min(42rem,calc(100vw-2rem))]'
      : 'w-[min(22rem,calc(100vw-2rem))]'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        collisionPadding={collisionPadding}
        aria-label={t('builder.pick_block', {}, 'Choose a block')}
        className={cn(
          'flex max-h-[min(34rem,var(--radix-popover-content-available-height))] flex-col overflow-hidden p-0',
          width,
        )}
      >
        {open && (
          <BuilderBlockPickerPanel
            component={component}
            items={items}
            autoFocus
            onPick={(block) => {
              setOpen(false)
              onPick(block)
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  )
}
