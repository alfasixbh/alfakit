import type {
  FileManagerEntrySchema,
  FileManagerPickedFileSchema,
  FileManagerPickerSchema,
} from '@alfakit/core'
import { fileManagerSize } from '@alfakit/core'
import { FileIcon, FolderOpenIcon, ImageIcon, TriangleAlertIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { useChoice, useFormatter, useT } from '../../context'
import { cn } from '../../lib/utils'
import { useField } from '../form/form-context'
import { FieldWrapper } from '../schema/field-wrapper'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { FileManagerBrowser } from './file-manager-lazy'

/**
 * `FileManagerPicker` (alfasix/alfakit-file-manager): files picked from the file manager.
 * The state is their paths on the disk; the browser runs through the file manager page, so
 * it shows what the user may see there. The server checks every path again on save.
 */
export function FileManagerPickerField({ component }: { component: FileManagerPickerSchema }) {
  const t = useT()
  const choice = useChoice()
  const formatter = useFormatter()
  const { value, setValue, error, id, disabled, readOnly, aria } = useField<
    string | string[] | null
  >(component)
  const [open, setOpen] = useState(false)
  // Files picked in this session (the schema only knows the saved ones).
  const [picked, setPicked] = useState<FileManagerPickedFileSchema[]>([])
  const locked = disabled || readOnly
  const values = (Array.isArray(value) ? value : value ? [value] : []).filter(
    (item): item is string => typeof item === 'string',
  )
  const files = values.map(
    (path) =>
      [...picked, ...component.files].find((file) => file.value === path) ?? {
        value: path,
        name: path.split('/').pop() ?? path,
      },
  )
  const max = component.multiple ? (component.maxFiles ?? Infinity) : 1

  const choose = (entries: FileManagerEntrySchema[]) => {
    const chosen = entries.filter(
      (entry): entry is FileManagerEntrySchema & { value: string } =>
        typeof entry.value === 'string',
    )

    setPicked((current) => [...current, ...chosen])

    if (component.multiple) {
      setValue([...new Set([...values, ...chosen.map((entry) => entry.value)])].slice(0, max))
    } else {
      setValue(chosen[0]?.value ?? null)
    }

    setOpen(false)
  }

  const remove = (path: string) => {
    const next = values.filter((item) => item !== path)
    setValue(component.multiple ? next : (next[0] ?? null))
  }

  return (
    <FieldWrapper field={component} htmlFor={id} error={error}>
      <div className="flex flex-col gap-2" data-slot="file-manager-picker">
        {files.length > 0 ? (
          <ul className="flex flex-col divide-y rounded-md border">
            {files.map((file) => (
              <li
                key={file.value}
                className="flex items-center gap-3 px-3 py-2 text-sm"
                data-missing={file.missing ? '' : undefined}
              >
                {file.thumbnail ? (
                  <img src={file.thumbnail} alt="" className="size-8 rounded object-cover" />
                ) : file.missing ? (
                  <TriangleAlertIcon className="text-destructive size-5" aria-hidden="true" />
                ) : file.kind === 'image' ? (
                  <ImageIcon className="text-muted-foreground size-5" aria-hidden="true" />
                ) : (
                  <FileIcon className="text-muted-foreground size-5" aria-hidden="true" />
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'truncate font-medium',
                      file.missing && 'text-muted-foreground line-through',
                    )}
                  >
                    {file.name}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {file.missing
                      ? t('file-manager.picker_missing', {}, 'This file no longer exists')
                      : fileManagerSize(file.size, formatter)}
                  </p>
                </div>
                {!locked && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => remove(file.value)}
                    aria-label={t(
                      'file-manager.picker_remove',
                      { name: file.name },
                      'Remove :name',
                    )}
                  >
                    <XIcon aria-hidden="true" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            {t('file-manager.picker_empty', {}, 'No file chosen')}
          </p>
        )}
        {!locked && files.length < max && (
          <Button
            id={id}
            type="button"
            variant="outline"
            className="self-start"
            onClick={() => setOpen(true)}
            {...aria}
            aria-label={t('file-manager.picker_browse', {}, 'Browse files')}
          >
            <FolderOpenIcon aria-hidden="true" />
            {t('file-manager.picker_browse', {}, 'Browse files')}
          </Button>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-h-[92vh] gap-3 overflow-hidden p-4 sm:max-w-5xl"
          data-slot="file-manager-picker-dialog"
        >
          <DialogHeader>
            <DialogTitle>
              {choice(
                'file-manager.picker_heading',
                component.multiple ? 2 : 1,
                {},
                'Choose files',
              )}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t('file-manager.label', {}, 'File manager')}
            </DialogDescription>
          </DialogHeader>
          {open && (
            <FileManagerBrowser
              schema={component.browser}
              onChoose={choose}
              onCancel={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </FieldWrapper>
  )
}
