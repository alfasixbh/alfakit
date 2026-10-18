<script setup lang="ts">
import type { RichEditorPanel, RichEditorSchema } from '@alfakit/core'
import { groupCustomBlocks, mergeTagText } from '@alfakit/core'
import { BlocksIcon, XIcon } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useT } from '../../context'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import Button from '../ui/Button.vue'
import Input from '../ui/Input.vue'

/**
 * The custom blocks or merge tags panel: beside the content on wide editors, above it on
 * narrow ones. Blocks are grouped, optionally searchable and shown as a grid.
 */
const props = defineProps<{
  panel: RichEditorPanel
  component: RichEditorSchema
  editable: boolean
  /** `top` of a sticky panel, or null. */
  sticky: string | null
}>()
const emit = defineEmits<{
  insertBlock: [id: string]
  insertMergeTag: [id: string]
  close: []
}>()
const t = useT()
const search = ref('')

const heading = computed(() =>
  props.panel === 'customBlocks'
    ? t('editor.custom_blocks_heading', {}, 'Custom blocks')
    : t('editor.merge_tags_heading', {}, 'Merge tags'),
)
const groups = computed(() =>
  props.panel === 'customBlocks'
    ? groupCustomBlocks(props.component.customBlocks ?? [], search.value)
    : [],
)
const grid = computed(() => Boolean(props.component.customBlocksGrid))
const itemClass =
  'hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring/50 flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-start text-sm outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50'
</script>

<template>
  <aside
    :aria-label="heading"
    data-slot="rich-editor-panel"
    :data-panel="props.panel"
    class="bg-muted/20 shrink-0 border-b @2xl:w-64 @2xl:border-s @2xl:border-b-0"
  >
    <!-- The offset is a runtime value: no Tailwind class can hold it. -->
    <div
      :class="cn('flex flex-col gap-2 p-2', props.sticky !== null && '@2xl:sticky')"
      :style="props.sticky !== null ? { top: props.sticky } : undefined"
    >
      <div class="flex items-center justify-between gap-2">
        <span class="text-muted-foreground text-xs font-medium">{{ heading }}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          :aria-label="t('editor.close_panel', {}, 'Close panel')"
          :title="t('editor.close_panel', {}, 'Close panel')"
          @mousedown.prevent
          @click="emit('close')"
        >
          <XIcon />
        </Button>
      </div>
      <Input
        v-if="props.panel === 'customBlocks' && props.component.searchableCustomBlocks"
        v-model="search"
        type="search"
        :aria-label="t('editor.search_blocks', {}, 'Search blocks')"
        :placeholder="t('editor.search_blocks', {}, 'Search blocks')"
        class="h-8"
      />
      <template v-if="props.panel === 'customBlocks'">
        <p v-if="groups.length === 0" class="text-muted-foreground px-2 py-1.5 text-sm">
          {{ t('no_results', {}, 'No results.') }}
        </p>
        <div
          v-for="entry in groups"
          v-else
          :key="entry.group ?? ''"
          role="group"
          :aria-label="entry.group ?? heading"
        >
          <div
            v-if="entry.group"
            class="text-muted-foreground px-2 pt-1 pb-0.5 text-xs font-medium"
          >
            {{ entry.group }}
          </div>
          <div :class="cn(grid ? 'grid grid-cols-2 gap-1' : 'flex flex-col gap-0.5')">
            <button
              v-for="block in entry.blocks"
              :key="block.id"
              type="button"
              :disabled="!props.editable"
              :class="cn(itemClass, grid && 'flex-col justify-center border py-3 text-center')"
              @mousedown.prevent
              @click="emit('insertBlock', block.id)"
            >
              <Icon v-if="block.icon" :name="block.icon" class="size-4 shrink-0" />
              <BlocksIcon v-else class="size-4 shrink-0" />
              <span class="truncate">{{ block.label }}</span>
            </button>
          </div>
        </div>
      </template>
      <div v-else class="flex flex-col gap-0.5">
        <button
          v-for="tag in props.component.mergeTags ?? []"
          :key="tag.id"
          type="button"
          :disabled="!props.editable"
          :class="itemClass"
          @mousedown.prevent
          @click="emit('insertMergeTag', tag.id)"
        >
          <span class="truncate">{{ tag.label }}</span>
          <span class="text-muted-foreground ms-auto font-mono text-xs" dir="ltr">{{
            mergeTagText({ id: tag.id })
          }}</span>
        </button>
      </div>
    </div>
  </aside>
</template>
