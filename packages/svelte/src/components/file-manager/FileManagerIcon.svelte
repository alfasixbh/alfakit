<script lang="ts">
  import type { FileManagerEntrySchema, FileManagerKind } from '@alfakit/core'
  import FileArchiveIcon from '@lucide/svelte/icons/file-archive'
  import FileIcon from '@lucide/svelte/icons/file'
  import FileImageIcon from '@lucide/svelte/icons/file-image'
  import FileMusicIcon from '@lucide/svelte/icons/file-music'
  import FilePlayIcon from '@lucide/svelte/icons/file-play'
  import FileSpreadsheetIcon from '@lucide/svelte/icons/file-spreadsheet'
  import FileTextIcon from '@lucide/svelte/icons/file-text'
  import FolderIcon from '@lucide/svelte/icons/folder'
  import PresentationIcon from '@lucide/svelte/icons/presentation'
  import { cn } from '../../lib/utils'

  const ICONS: Record<FileManagerKind, typeof FileIcon> = {
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

  let {
    entry,
    class: className,
  }: { entry: Pick<FileManagerEntrySchema, 'kind' | 'type'>; class?: string } = $props()

  const Icon = $derived(ICONS[entry.kind] ?? FileIcon)
</script>

<Icon class={cn(entry.type === 'folder' && 'text-primary', className)} aria-hidden="true" />
