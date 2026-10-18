<script setup lang="ts">
import type { BuilderBlockSchema, BuilderItemState, BuilderSchema } from '@alfakit/core'
import {
  builderPickerMove,
  canAddBuilderBlock,
  filterBuilderBlocks,
  gridColumnsClasses,
  groupBuilderBlocks,
} from '@alfakit/core'
import { BlocksIcon, SearchIcon } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref, useId, watch, type HTMLAttributes } from 'vue'
import { useDirection, useT } from '../../context'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import Input from '../ui/Input.vue'

/**
 * The block picker's content: an optional search field on top and the blocks as a grid
 * of cards (icon, label, description) under their group headings. Arrow keys move
 * between the cards, Enter in the search field adds the first match, typing on a card
 * goes back to the search field.
 */
const props = defineProps<{
  component: BuilderSchema
  items: BuilderItemState[]
  /** Focus the search field (or the first block) when shown. */
  autoFocus?: boolean
  class?: HTMLAttributes['class']
}>()
const emit = defineEmits<{ pick: [block: BuilderBlockSchema] }>()
const t = useT()
const direction = useDirection()
const listId = useId()
const search = ref('')
const query = ref('')
const root = ref<HTMLElement | null>(null)
const list = ref<HTMLElement | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined
let frame = 0

const prompt = computed(
  () => props.component.blockSearchPrompt ?? t('builder.search_blocks', {}, 'Search blocks…'),
)
const blocks = computed(() =>
  filterBuilderBlocks(
    props.component.blocks,
    props.component.blockSearchDebounce ? query.value : search.value,
  ),
)
const groups = computed(() => groupBuilderBlocks(blocks.value))
const columns = computed(() =>
  props.component.blockPickerColumns
    ? gridColumnsClasses(props.component.blockPickerColumns)
    : 'grid-cols-1',
)

watch(search, (term) => {
  clearTimeout(timer)
  if (props.component.blockSearchDebounce) {
    timer = setTimeout(() => (query.value = term), props.component.blockSearchDebounce)
  }
})

const searchInput = () =>
  root.value?.querySelector<HTMLInputElement>('[data-slot="builder-block-search"]') ?? null
const options = () => [
  ...(list.value?.querySelectorAll<HTMLButtonElement>(
    '[data-slot="builder-block-option"]:not(:disabled)',
  ) ?? []),
]

onMounted(() => {
  if (!props.autoFocus) return

  frame = requestAnimationFrame(() => {
    const input = searchInput()

    if (input) input.focus()
    else options()[0]?.focus()
  })
})
onBeforeUnmount(() => {
  clearTimeout(timer)
  cancelAnimationFrame(frame)
})

const canPick = (block: BuilderBlockSchema) =>
  canAddBuilderBlock(props.component, block, props.items)

const onListKeydown = (event: KeyboardEvent) => {
  const all = options()
  const current = all.indexOf(event.target as HTMLButtonElement)

  if (current === -1) return

  const input = searchInput()

  // Typing on a card goes on in the search field.
  if (
    input &&
    event.key.length === 1 &&
    event.key !== ' ' &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey
  ) {
    input.focus()

    return
  }

  const rects = all.map((option) => option.getBoundingClientRect())
  const rtl = direction.value === 'rtl'

  if (
    event.key === 'ArrowUp' &&
    input &&
    builderPickerMove('ArrowUp', current, rects, rtl) === null
  ) {
    event.preventDefault()
    input.focus()

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
    const first = blocks.value.find(canPick)

    if (first) emit('pick', first)
  }
}
</script>

<template>
  <div ref="root" data-slot="builder-picker" :class="cn('flex min-h-0 flex-col', props.class)">
    <div v-if="props.component.blockSearch" class="border-b p-2">
      <div class="relative">
        <SearchIcon
          class="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          v-model="search"
          :placeholder="prompt"
          :aria-label="prompt"
          :aria-controls="listId"
          data-slot="builder-block-search"
          class="h-9 ps-8"
          @keydown="onSearchKeydown"
        />
      </div>
    </div>
    <div
      :id="listId"
      ref="list"
      class="min-h-0 flex-1 overflow-y-auto p-2"
      @keydown="onListKeydown"
    >
      <p
        v-if="blocks.length === 0"
        role="status"
        class="text-muted-foreground px-2 py-6 text-center text-sm"
      >
        {{ props.component.blockNoSearchResultsMessage ?? t('no_results', {}, 'No results.') }}
      </p>
      <div
        v-for="entry in groups"
        v-else
        :key="entry.group ?? ''"
        role="group"
        :aria-label="entry.group ?? undefined"
        data-slot="builder-block-group"
        class="not-first:mt-2"
      >
        <p
          v-if="entry.group !== null"
          aria-hidden="true"
          class="text-muted-foreground px-2 pt-1 pb-1.5 text-xs font-medium tracking-wide uppercase"
        >
          {{ entry.group }}
        </p>
        <div :class="cn('grid gap-1', columns)">
          <button
            v-for="block in entry.blocks"
            :key="block.name"
            type="button"
            data-slot="builder-block-option"
            :data-block="block.name"
            :disabled="!canPick(block)"
            class="hover:bg-accent focus-visible:bg-accent focus-visible:ring-ring/50 flex w-full min-w-0 items-start gap-3 rounded-md p-2 text-start outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50"
            @click="emit('pick', block)"
          >
            <span
              class="bg-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-md border [&_svg]:size-4"
              aria-hidden="true"
            >
              <Icon v-if="block.icon" :name="block.icon" />
              <BlocksIcon v-else />
            </span>
            <span class="flex min-w-0 flex-col gap-0.5">
              <span class="text-sm leading-tight font-medium">{{ block.label }}</span>
              <span
                v-if="block.description"
                class="text-muted-foreground text-xs leading-snug"
                data-slot="builder-block-description"
                >{{ block.description }}</span
              >
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
