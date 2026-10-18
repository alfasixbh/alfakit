<script setup lang="ts">
import type { FileManagerEntrySchema, FileManagerKind } from '@alfakit/core'
import {
  FileArchiveIcon,
  FileIcon,
  FileImageIcon,
  FileMusicIcon,
  FilePlayIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FolderIcon,
  PresentationIcon,
} from '@lucide/vue'
import { computed, type Component } from 'vue'
import { cn } from '../../lib/utils'

const ICONS: Record<FileManagerKind, Component> = {
  folder: FolderIcon,
  image: FileImageIcon,
  video: FilePlayIcon,
  audio: FileMusicIcon,
  pdf: FileTextIcon,
  text: FileTextIcon,
  archive: FileArchiveIcon,
  document: FileTextIcon,
  spreadsheet: FileSpreadsheetIcon,
  presentation: PresentationIcon,
  other: FileIcon,
}

const props = defineProps<{
  entry: Pick<FileManagerEntrySchema, 'kind' | 'type'>
  class?: string
}>()
const icon = computed(() => ICONS[props.entry.kind] ?? FileIcon)
</script>

<template>
  <component
    :is="icon"
    :class="cn(entry.type === 'folder' && 'text-primary', props.class)"
    aria-hidden="true"
  />
</template>
