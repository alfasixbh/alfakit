<script lang="ts">
  import type { BuilderBlockSchema, BuilderItemState, BuilderSchema } from '@alfakit/core'
  import {
    builderPickerMove,
    canAddBuilderBlock,
    filterBuilderBlocks,
    gridColumnsClasses,
    groupBuilderBlocks,
  } from '@alfakit/core'
  import BlocksIcon from '@lucide/svelte/icons/blocks'
  import SearchIcon from '@lucide/svelte/icons/search'
  import { onMount } from 'svelte'
  import { useDirection, useT } from '../../context.svelte'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { Input } from '../ui/input'

  /**
   * The block picker's content: an optional search field on top and the blocks as a grid
   * of cards (icon, label, description) under their group headings. Arrow keys move
   * between the cards, Enter in the search field adds the first match, typing on a card
   * goes back to the search field.
   */
  interface Props {
    component: BuilderSchema
    items: BuilderItemState[]
    onPick: (block: BuilderBlockSchema) => void
    /** Focus the search field (or the first block) when shown. */
    autoFocus?: boolean
    class?: string
  }

  let { component, items, onPick, autoFocus = false, class: className }: Props = $props()

  const t = useT()
  const direction = $derived(useDirection())
  const listId = $props.id()
  let search = $state('')
  let query = $state('')
  let searchRef = $state<HTMLInputElement | null>(null)
  let list = $state<HTMLElement | null>(null)

  const prompt = $derived(
    component.blockSearchPrompt ?? t('builder.search_blocks', {}, 'Search blocks…'),
  )
  const blocks = $derived(
    filterBuilderBlocks(component.blocks, component.blockSearchDebounce ? query : search),
  )
  const groups = $derived(groupBuilderBlocks(blocks))
  const columns = $derived(
    component.blockPickerColumns ? gridColumnsClasses(component.blockPickerColumns) : 'grid-cols-1',
  )

  $effect(() => {
    const term = search
    const wait = component.blockSearchDebounce

    if (!wait) return

    const timer = setTimeout(() => (query = term), wait)

    return () => clearTimeout(timer)
  })

  const options = () => [
    ...(list?.querySelectorAll<HTMLButtonElement>(
      '[data-slot="builder-block-option"]:not(:disabled)',
    ) ?? []),
  ]
  const canPick = (block: BuilderBlockSchema) => canAddBuilderBlock(component, block, items)

  onMount(() => {
    if (!autoFocus) return

    const frame = requestAnimationFrame(() => {
      if (searchRef) searchRef.focus()
      else options()[0]?.focus()
    })

    return () => cancelAnimationFrame(frame)
  })

  const onListKeydown = (event: KeyboardEvent) => {
    const all = options()
    const current = all.indexOf(event.target as HTMLButtonElement)

    if (current === -1) return

    // Typing on a card goes on in the search field.
    if (
      searchRef &&
      event.key.length === 1 &&
      event.key !== ' ' &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      searchRef.focus()

      return
    }

    const rects = all.map((option) => option.getBoundingClientRect())
    const rtl = direction === 'rtl'

    if (
      event.key === 'ArrowUp' &&
      searchRef &&
      builderPickerMove('ArrowUp', current, rects, rtl) === null
    ) {
      event.preventDefault()
      searchRef.focus()

      return
    }

    const next = builderPickerMove(event.key, current, rects, rtl)

    if (next !== null) {
      event.preventDefault()
      all[next]?.focus()
    }
  }

  const onSearchKeydown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      options()[0]?.focus()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const first = blocks.find(canPick)

      if (first) onPick(first)
    }
  }
</script>

<div data-slot="builder-picker" class={cn('flex min-h-0 flex-col', className)}>
  {#if component.blockSearch}
    <div class="border-b p-2">
      <div class="relative">
        <SearchIcon
          class="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          bind:ref={searchRef}
          bind:value={search}
          onkeydown={onSearchKeydown}
          placeholder={prompt}
          aria-label={prompt}
          aria-controls={listId}
          data-slot="builder-block-search"
          class="h-9 ps-8"
        />
      </div>
    </div>
  {/if}
  <!-- Arrow keys move between the block buttons (a roving focus inside the grid). -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    id={listId}
    bind:this={list}
    onkeydown={onListKeydown}
    class="min-h-0 flex-1 overflow-y-auto p-2"
  >
    {#if blocks.length === 0}
      <p role="status" class="text-muted-foreground px-2 py-6 text-center text-sm">
        {component.blockNoSearchResultsMessage ?? t('no_results', {}, 'No results.')}
      </p>
    {:else}
      {#each groups as entry (entry.group ?? '')}
        <div
          role="group"
          aria-label={entry.group ?? undefined}
          data-slot="builder-block-group"
          class="not-first:mt-2"
        >
          {#if entry.group !== null}
            <p
              aria-hidden="true"
              class="text-muted-foreground px-2 pt-1 pb-1.5 text-xs font-medium tracking-wide uppercase"
            >
              {entry.group}
            </p>
          {/if}
          <div class={cn('grid gap-1', columns)}>
            {#each entry.blocks as block (block.name)}
              <button
                type="button"
                data-slot="builder-block-option"
                data-block={block.name}
                disabled={!canPick(block)}
                onclick={() => onPick(block)}
                class="hover:bg-accent focus-visible:bg-accent focus-visible:ring-ring/50 flex w-full min-w-0 items-start gap-3 rounded-md p-2 text-start outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50"
              >
                <span
                  class="bg-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-md border [&_svg]:size-4"
                  aria-hidden="true"
                >
                  {#if block.icon}<Icon name={block.icon} />{:else}<BlocksIcon />{/if}
                </span>
                <span class="flex min-w-0 flex-col gap-0.5">
                  <span class="text-sm leading-tight font-medium">{block.label}</span>
                  {#if block.description}
                    <span
                      class="text-muted-foreground text-xs leading-snug"
                      data-slot="builder-block-description">{block.description}</span
                    >
                  {/if}
                </span>
              </button>
            {/each}
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>
