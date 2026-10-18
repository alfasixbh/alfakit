<script setup lang="ts">
import type { FileManagerController } from '@alfakit/core'
import { ChevronRightIcon, FolderIcon, FolderOpenIcon } from '@lucide/vue'
import { useT } from '../../context'
import { useStore } from '../../composables/use-store'
import { cn } from '../../lib/utils'

type DropHandlers = Record<'dragover' | 'dragleave' | 'drop', (event: DragEvent) => void>

/** The folder tree of the file manager (and the destination chooser of move and copy). */
const props = defineProps<{
  controller: FileManagerController
  active: string | null
  dropHandlers?: (target: string) => DropHandlers
  parent?: string
  level?: number
}>()
const emit = defineEmits<{ open: [path: string] }>()
const t = useT()
const state = useStore(props.controller.store)
const level = props.level ?? 1
const folders = () => {
  void state.value.tree

  return props.controller.children(props.parent ?? '') ?? []
}
const expanded = (path: string) => state.value.expanded.includes(path)
</script>

<template>
  <nav
    v-if="level === 1"
    :aria-label="t('file-manager.folders', {}, 'Folders')"
    data-slot="file-manager-tree"
  >
    <button
      type="button"
      :class="
        cn(
          'hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-sm',
          active === '' && 'bg-accent font-medium',
        )
      "
      :aria-current="active === '' ? 'page' : undefined"
      @click="emit('open', '')"
    >
      <FolderOpenIcon class="text-primary size-4" aria-hidden="true" />
      {{ t('file-manager.root', {}, 'Files') }}
    </button>
    <FileManagerTree
      :controller="controller"
      :active="active"
      :drop-handlers="dropHandlers"
      parent=""
      :level="2"
      @open="emit('open', $event)"
    />
  </nav>
  <ul
    v-else-if="folders().length > 0"
    class="flex flex-col"
    :role="level > 2 ? 'group' : undefined"
  >
    <li v-for="folder in folders()" :key="folder.path" data-slot="file-manager-tree-item">
      <div
        :class="
          cn(
            'hover:bg-accent flex items-center gap-1 rounded-md pe-2 text-sm',
            active === folder.path && 'bg-accent font-medium',
            state.dropTarget === folder.path && 'ring-primary ring-2',
          )
        "
        :style="{ paddingInlineStart: `${(level - 2) * 0.75}rem` }"
        v-on="dropHandlers ? dropHandlers(folder.path) : {}"
      >
        <button
          v-if="folder.hasChildren"
          type="button"
          class="text-muted-foreground hover:text-foreground rounded p-1"
          :aria-expanded="expanded(folder.path)"
          :aria-label="
            expanded(folder.path)
              ? t('file-manager.collapse', { name: folder.name }, 'Collapse :name')
              : t('file-manager.expand', { name: folder.name }, 'Expand :name')
          "
          @click="controller.toggleFolder(folder.path)"
        >
          <ChevronRightIcon
            :class="
              cn(
                'size-3.5 transition-transform',
                expanded(folder.path) ? 'rotate-90' : 'rtl:rotate-180',
              )
            "
            aria-hidden="true"
          />
        </button>
        <span v-else class="w-5.5 shrink-0" aria-hidden="true" />
        <button
          type="button"
          class="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-start"
          :aria-current="active === folder.path ? 'page' : undefined"
          @click="emit('open', folder.path)"
        >
          <FolderIcon class="text-primary size-4 shrink-0" aria-hidden="true" />
          <span class="truncate">{{ folder.name }}</span>
        </button>
      </div>
      <FileManagerTree
        v-if="expanded(folder.path)"
        :controller="controller"
        :active="active"
        :drop-handlers="dropHandlers"
        :parent="folder.path"
        :level="level + 1"
        @open="emit('open', $event)"
      />
    </li>
  </ul>
</template>
