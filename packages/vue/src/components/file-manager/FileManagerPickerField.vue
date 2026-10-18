<script setup lang="ts">
import type {
  FileManagerEntrySchema,
  FileManagerPickedFileSchema,
  FileManagerPickerSchema,
} from '@alfakit/core'
import { fileManagerSize } from '@alfakit/core'
import { FileIcon, FolderOpenIcon, ImageIcon, TriangleAlertIcon, XIcon } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useChoice, useFormatter, useT } from '../../context'
import { cn } from '../../lib/utils'
import { useField } from '../form/form-context'
import FieldWrapper from '../schema/FieldWrapper.vue'
import Button from '../ui/Button.vue'
import Dialog from '../ui/Dialog.vue'
import DialogContent from '../ui/DialogContent.vue'
import DialogDescription from '../ui/DialogDescription.vue'
import DialogHeader from '../ui/DialogHeader.vue'
import DialogTitle from '../ui/DialogTitle.vue'
import { FileManagerBrowser } from './file-manager-lazy'

/**
 * `FileManagerPicker` (alfasix/alfakit-file-manager): files picked from the file manager.
 * The state is their paths on the disk; the browser runs through the file manager page, so
 * it shows what the user may see there. The server checks every path again on save.
 */
const props = defineProps<{ component: FileManagerPickerSchema }>()
const t = useT()
const choice = useChoice()
const formatter = useFormatter()
const { value, setValue, error, id, disabled, readOnly, aria } = useField<string | string[] | null>(
  () => props.component,
)
const open = ref(false)
// Files picked in this session (the schema only knows the saved ones).
const picked = ref<FileManagerPickedFileSchema[]>([])
const locked = computed(() => disabled.value || readOnly.value)
const values = computed(() =>
  (Array.isArray(value.value) ? value.value : value.value ? [value.value] : []).filter(
    (item): item is string => typeof item === 'string',
  ),
)
const files = computed(() =>
  values.value.map(
    (path) =>
      [...picked.value, ...props.component.files].find((file) => file.value === path) ?? {
        value: path,
        name: path.split('/').pop() ?? path,
      },
  ),
)
const max = computed(() => (props.component.multiple ? (props.component.maxFiles ?? Infinity) : 1))

const choose = (entries: FileManagerEntrySchema[]) => {
  const chosen = entries.filter(
    (entry): entry is FileManagerEntrySchema & { value: string } => typeof entry.value === 'string',
  )

  picked.value = [...picked.value, ...chosen]

  if (props.component.multiple) {
    setValue(
      [...new Set([...values.value, ...chosen.map((entry) => entry.value)])].slice(0, max.value),
    )
  } else {
    setValue(chosen[0]?.value ?? null)
  }

  open.value = false
}

const remove = (path: string) => {
  const next = values.value.filter((item) => item !== path)
  setValue(props.component.multiple ? next : (next[0] ?? null))
}
</script>

<template>
  <FieldWrapper :field="props.component" :html-for="id" :error="error">
    <div class="flex flex-col gap-2" data-slot="file-manager-picker">
      <ul v-if="files.length > 0" class="flex flex-col divide-y rounded-md border">
        <li
          v-for="file in files"
          :key="file.value"
          class="flex items-center gap-3 px-3 py-2 text-sm"
          :data-missing="file.missing ? '' : undefined"
        >
          <img
            v-if="file.thumbnail"
            :src="file.thumbnail"
            alt=""
            class="size-8 rounded object-cover"
          />
          <TriangleAlertIcon
            v-else-if="file.missing"
            class="text-destructive size-5"
            aria-hidden="true"
          />
          <ImageIcon
            v-else-if="file.kind === 'image'"
            class="text-muted-foreground size-5"
            aria-hidden="true"
          />
          <FileIcon v-else class="text-muted-foreground size-5" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <p
              :class="
                cn('truncate font-medium', file.missing && 'text-muted-foreground line-through')
              "
            >
              {{ file.name }}
            </p>
            <p class="text-muted-foreground truncate text-xs">
              {{
                file.missing
                  ? t('file-manager.picker_missing', {}, 'This file no longer exists')
                  : fileManagerSize(file.size, formatter)
              }}
            </p>
          </div>
          <Button
            v-if="!locked"
            type="button"
            variant="ghost"
            size="icon-xs"
            :aria-label="t('file-manager.picker_remove', { name: file.name }, 'Remove :name')"
            @click="remove(file.value)"
          >
            <XIcon aria-hidden="true" />
          </Button>
        </li>
      </ul>
      <p v-else class="text-muted-foreground text-sm">
        {{ t('file-manager.picker_empty', {}, 'No file chosen') }}
      </p>
      <Button
        v-if="!locked && files.length < max"
        :id="id"
        type="button"
        variant="outline"
        class="self-start"
        :aria-invalid="aria['aria-invalid']"
        :aria-describedby="aria['aria-describedby']"
        :aria-label="t('file-manager.picker_browse', {}, 'Browse files')"
        @click="open = true"
      >
        <FolderOpenIcon aria-hidden="true" />
        {{ t('file-manager.picker_browse', {}, 'Browse files') }}
      </Button>
    </div>
    <Dialog :open="open" @update:open="open = $event">
      <DialogContent
        class="max-h-[92vh] gap-3 overflow-hidden p-4 sm:max-w-5xl"
        data-slot="file-manager-picker-dialog"
      >
        <DialogHeader>
          <DialogTitle>{{
            choice(
              'file-manager.picker_heading',
              props.component.multiple ? 2 : 1,
              {},
              'Choose files',
            )
          }}</DialogTitle>
          <DialogDescription class="sr-only">{{
            t('file-manager.label', {}, 'File manager')
          }}</DialogDescription>
        </DialogHeader>
        <component
          :is="FileManagerBrowser"
          v-if="open"
          :schema="props.component.browser"
          :on-choose="choose"
          :on-cancel="() => (open = false)"
        />
      </DialogContent>
    </Dialog>
  </FieldWrapper>
</template>
