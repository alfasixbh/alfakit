<script lang="ts">
  import type {
    FileManagerEntrySchema,
    FileManagerPickedFileSchema,
    FileManagerPickerSchema,
  } from '@alfakit/core'
  import { fileManagerSize } from '@alfakit/core'
  import FileIcon from '@lucide/svelte/icons/file'
  import FolderOpenIcon from '@lucide/svelte/icons/folder-open'
  import ImageIcon from '@lucide/svelte/icons/image'
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert'
  import XIcon from '@lucide/svelte/icons/x'
  import { useChoice, useFormatter, useT } from '../../context.svelte'
  import { cn } from '../../lib/utils'
  import { useField } from '../form/form-context.svelte'
  import FieldWrapper from '../schema/FieldWrapper.svelte'
  import { Button } from '../ui/button'
  import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
  import FileManagerBrowser from './FileManagerBrowser.svelte'

  /**
   * `FileManagerPicker` (alfasix/alfakit-file-manager): files picked from the file manager.
   * The state is their paths on the disk; the browser runs through the file manager page, so
   * it shows what the user may see there. The server checks every path again on save.
   */
  let { component }: { component: FileManagerPickerSchema } = $props()

  const t = useT()
  const choice = useChoice()
  const formatter = useFormatter()
  const field = useField<string | string[] | null>(() => component)
  let open = $state(false)
  // Files picked in this session (the schema only knows the saved ones).
  let picked = $state<FileManagerPickedFileSchema[]>([])
  const locked = $derived(field.disabled || field.readOnly)
  const values = $derived(
    (Array.isArray(field.value) ? field.value : field.value ? [field.value] : []).filter(
      (item): item is string => typeof item === 'string',
    ),
  )
  const files = $derived(
    values.map(
      (path) =>
        [...picked, ...component.files].find((file) => file.value === path) ?? {
          value: path,
          name: path.split('/').pop() ?? path,
        },
    ),
  )
  const max = $derived(component.multiple ? (component.maxFiles ?? Infinity) : 1)

  const choose = (entries: FileManagerEntrySchema[]) => {
    const chosen = entries.filter(
      (entry): entry is FileManagerEntrySchema & { value: string } =>
        typeof entry.value === 'string',
    )

    picked = [...picked, ...chosen]

    if (component.multiple) {
      field.setValue([...new Set([...values, ...chosen.map((entry) => entry.value)])].slice(0, max))
    } else {
      field.setValue(chosen[0]?.value ?? null)
    }

    open = false
  }

  const remove = (path: string) => {
    const next = values.filter((item) => item !== path)
    field.setValue(component.multiple ? next : (next[0] ?? null))
  }
</script>

<FieldWrapper field={component} htmlFor={field.id} error={field.error}>
  <div class="flex flex-col gap-2" data-slot="file-manager-picker">
    {#if files.length > 0}
      <ul class="flex flex-col divide-y rounded-md border">
        {#each files as file (file.value)}
          <li
            class="flex items-center gap-3 px-3 py-2 text-sm"
            data-missing={file.missing ? '' : undefined}
          >
            {#if file.thumbnail}
              <img src={file.thumbnail} alt="" class="size-8 rounded object-cover" />
            {:else if file.missing}
              <TriangleAlertIcon class="text-destructive size-5" aria-hidden="true" />
            {:else if file.kind === 'image'}
              <ImageIcon class="text-muted-foreground size-5" aria-hidden="true" />
            {:else}
              <FileIcon class="text-muted-foreground size-5" aria-hidden="true" />
            {/if}
            <div class="min-w-0 flex-1">
              <p
                class={cn(
                  'truncate font-medium',
                  file.missing && 'text-muted-foreground line-through',
                )}
              >
                {file.name}
              </p>
              <p class="text-muted-foreground truncate text-xs">
                {file.missing
                  ? t('file-manager.picker_missing', {}, 'This file no longer exists')
                  : fileManagerSize(file.size, formatter.current)}
              </p>
            </div>
            {#if !locked}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={t('file-manager.picker_remove', { name: file.name }, 'Remove :name')}
                onclick={() => remove(file.value)}
              >
                <XIcon aria-hidden="true" />
              </Button>
            {/if}
          </li>
        {/each}
      </ul>
    {:else}
      <p class="text-muted-foreground text-sm">
        {t('file-manager.picker_empty', {}, 'No file chosen')}
      </p>
    {/if}
    {#if !locked && files.length < max}
      <Button
        id={field.id}
        type="button"
        variant="outline"
        class="self-start"
        aria-invalid={field.aria['aria-invalid']}
        aria-describedby={field.aria['aria-describedby']}
        aria-label={t('file-manager.picker_browse', {}, 'Browse files')}
        onclick={() => (open = true)}
      >
        <FolderOpenIcon aria-hidden="true" />
        {t('file-manager.picker_browse', {}, 'Browse files')}
      </Button>
    {/if}
  </div>
  <Dialog {open} onOpenChange={(next) => (open = next)}>
    <DialogContent
      class="max-h-[92vh] gap-3 overflow-hidden p-4 sm:max-w-5xl"
      data-slot="file-manager-picker-dialog"
    >
      <DialogHeader>
        <DialogTitle
          >{choice(
            'file-manager.picker_heading',
            component.multiple ? 2 : 1,
            {},
            'Choose files',
          )}</DialogTitle
        >
        <DialogDescription class="sr-only"
          >{t('file-manager.label', {}, 'File manager')}</DialogDescription
        >
      </DialogHeader>
      {#if open}
        <FileManagerBrowser
          schema={component.browser}
          onChoose={choose}
          onCancel={() => (open = false)}
        />
      {/if}
    </DialogContent>
  </Dialog>
</FieldWrapper>
