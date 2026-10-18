<script lang="ts">
  import { untrack } from 'svelte'
  import type { FileManagerController } from '@alfakit/core'
  import { fileManagerSize } from '@alfakit/core'
  import XIcon from '@lucide/svelte/icons/x'
  import { useFormatter, useT } from '../../context.svelte'
  import { useStore } from '../../hooks/store.svelte'
  import { Button } from '../ui/button'
  import { Spinner } from '../ui/spinner'
  import FileManagerIcon from './FileManagerIcon.svelte'

  /** The details of the selected item. */
  let {
    controller,
    hideHeading = false,
  }: { controller: FileManagerController; hideHeading?: boolean } = $props()

  const t = useT()
  const formatter = useFormatter()
  const store = useStore(untrack(() => controller.store))
  const ui = $derived(store.current)
  const details = $derived(ui.details)
  const tt = (key: string, replacements: Record<string, string | number> = {}, fallback?: string) =>
    t(`file-manager.${key}`, replacements, fallback)

  const rows = $derived.by(() => {
    const item = details
    const format = formatter.current

    if (!item) return []

    const list: Array<[string, string]> = [
      [tt('type', {}, 'Type'), item.mime ?? tt(`kinds.${item.kind}`, {}, item.kind)],
    ]

    if (item.type === 'file')
      list.push([tt('size', {}, 'Size'), fileManagerSize(item.size, format)])
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

<div class="flex flex-col gap-4 p-4">
  {#if !hideHeading}
    <div class="flex items-center justify-between gap-2">
      <h3 class="text-sm font-semibold">{tt('details', {}, 'Details')}</h3>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={tt('close', {}, 'Close')}
        onclick={() => controller.closeDetails()}
      >
        <XIcon aria-hidden="true" />
      </Button>
    </div>
  {/if}
  {#if !details}
    <p class="text-muted-foreground text-sm">{tt('picker_empty', {}, 'No file chosen')}</p>
  {:else}
    <div
      class="bg-muted/60 flex aspect-video items-center justify-center overflow-hidden rounded-md"
    >
      {#if details.thumbnail}
        <img src={details.thumbnail} alt="" class="size-full object-contain" />
      {:else}
        <FileManagerIcon entry={details} class="size-12" />
      {/if}
    </div>
    <p class="font-medium break-all">{details.name}</p>
    {#if ui.detailsLoading}<Spinner />{/if}
    <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      {#each rows as [label, value] (label)}
        <dt class="text-muted-foreground">{label}</dt>
        <dd class="min-w-0 break-all">{value}</dd>
      {/each}
    </dl>
  {/if}
</div>
