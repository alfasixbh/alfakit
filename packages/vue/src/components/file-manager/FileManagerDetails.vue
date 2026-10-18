<script setup lang="ts">
import type { FileManagerController } from '@alfakit/core'
import { fileManagerSize } from '@alfakit/core'
import { XIcon } from '@lucide/vue'
import { computed } from 'vue'
import { useFormatter, useT } from '../../context'
import { useStore } from '../../composables/use-store'
import Button from '../ui/Button.vue'
import Spinner from '../ui/Spinner.vue'
import FileManagerIcon from './FileManagerIcon.vue'

/** The details of the selected item. */
const props = defineProps<{ controller: FileManagerController; hideHeading?: boolean }>()
const t = useT()
const formatter = useFormatter()
const state = useStore(props.controller.store)
const details = computed(() => state.value.details)
const tt = (key: string, replacements: Record<string, string | number> = {}, fallback?: string) =>
  t(`file-manager.${key}`, replacements, fallback)

const rows = computed(() => {
  const item = details.value
  const format = formatter.value

  if (!item) return []

  const list: Array<[string, string]> = [
    [tt('type', {}, 'Type'), item.mime ?? tt(`kinds.${item.kind}`, {}, item.kind)],
  ]

  if (item.type === 'file') list.push([tt('size', {}, 'Size'), fileManagerSize(item.size, format)])
  if (item.items !== undefined)
    list.push([
      tt('items', {}, 'Items'),
      `${format.number(item.items)}${item.itemsTruncated ? '+' : ''}`,
    ])
  if (item.width && item.height) {
    list.push([
      tt('dimensions', {}, 'Dimensions'),
      tt(
        'dimensions_value',
        { width: format.number(item.width), height: format.number(item.height) },
        ':width × :height px',
      ),
    ])
  }

  if (item.trashed) {
    list.push([tt('original_location', {}, 'Original location'), item.trashed.originalPath])
    if (item.trashed.deletedAt)
      list.push([tt('deleted_at', {}, 'Deleted'), format.dateTime(item.trashed.deletedAt)])
  } else {
    if (item.modified) list.push([tt('modified', {}, 'Modified'), format.dateTime(item.modified)])
    if (item.location !== undefined)
      list.push([
        tt('location', {}, 'Location'),
        item.location === '' ? tt('root', {}, 'Files') : item.location,
      ])
    if (item.links !== undefined) list.push([tt('links', {}, 'Links'), format.number(item.links)])
  }

  return list
})
</script>

<template>
  <div class="flex flex-col gap-4 p-4">
    <div v-if="!hideHeading" class="flex items-center justify-between gap-2">
      <h3 class="text-sm font-semibold">{{ tt('details', {}, 'Details') }}</h3>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        :aria-label="tt('close', {}, 'Close')"
        @click="controller.closeDetails()"
      >
        <XIcon aria-hidden="true" />
      </Button>
    </div>
    <p v-if="!details" class="text-muted-foreground text-sm">
      {{ tt('picker_empty', {}, 'No file chosen') }}
    </p>
    <template v-else>
      <div
        class="bg-muted/60 flex aspect-video items-center justify-center overflow-hidden rounded-md"
      >
        <img
          v-if="details.thumbnail"
          :src="details.thumbnail"
          alt=""
          class="size-full object-contain"
        />
        <FileManagerIcon v-else :entry="details" class="size-12" />
      </div>
      <p class="font-medium break-all">{{ details.name }}</p>
      <Spinner v-if="state.detailsLoading" />
      <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <template v-for="[label, value] in rows" :key="label">
          <dt class="text-muted-foreground">{{ label }}</dt>
          <dd class="min-w-0 break-all">{{ value }}</dd>
        </template>
      </dl>
    </template>
  </div>
</template>
