import { useState, type ComponentProps } from 'react'
import { lazyComponent } from '../../lib/lazy'
import type { ImageEditorDialog as ImageEditorDialogComponent } from './image-editor-dialog'

type ImageEditorDialogProps = ComponentProps<typeof ImageEditorDialogComponent>

const LoadedImageEditorDialog = lazyComponent<ImageEditorDialogProps>(
  () => import('./image-editor-dialog').then((module) => module.ImageEditorDialog),
  () => null,
)

/**
 * `FileUpload::imageEditor()`'s dialog; the editor's code loads with the first image to
 * edit, not with the form. It stays mounted afterwards (closing animations).
 */
export function ImageEditorDialog(props: ImageEditorDialogProps) {
  const [requested, setRequested] = useState(false)

  if (props.request && !requested) setRequested(true)

  return requested || props.request ? <LoadedImageEditorDialog {...props} /> : null
}
