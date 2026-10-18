// The image editor's file helpers, apart from the editor itself (`./image-editor`): a
// FileUpload field uses them on every render, the editor loads with the first image to edit.

const EDITABLE_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

/** Raster images the editor can open (SVG and GIF animations are uploaded as they are). */
export function canEditImage(file: Pick<File, 'type'>): boolean {
  return ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
}

/** Whether a stored file looks like an image the editor can open, from its name. */
export function canEditImageName(name: string): boolean {
  const extension = /\.([a-z0-9]+)(?:[?#].*)?$/i.exec(name)?.[1]?.toLowerCase() ?? ''

  return extension in EDITABLE_TYPES
}

/**
 * The name to open an uploaded file in the editor under: its display name when that
 * looks like an editable image, else its stored path's basename; null when neither does
 * (the "Edit" button is hidden).
 */
export function editableImageName(file: { name: string; path: string }): string | null {
  if (canEditImageName(file.name)) return file.name

  const base = file.path.replace(/^tmp:/, '').split('/').pop() ?? ''

  return canEditImageName(base) ? base : null
}

/**
 * Download an already uploaded image for the editor (the "Edit" button on existing
 * files). Fetched from the file's own URL with same-origin credentials, so signed and
 * private URLs served by the app work; a cross-origin URL needs CORS. Resolves null when
 * the file can't be fetched or isn't an editable image.
 */
export async function fetchEditableImage(
  url: string,
  name: string,
  fetcher: typeof fetch = fetch,
): Promise<File | null> {
  try {
    const response = await fetcher(url, { credentials: 'same-origin' })

    if (!response.ok) return null

    const blob = await response.blob()
    const extension = /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase() ?? ''
    const type = canEditImage(blob) ? blob.type : (EDITABLE_TYPES[extension] ?? blob.type)
    const file = new File([blob], name, { type, lastModified: Date.now() })

    return canEditImage(file) ? file : null
  } catch {
    return null
  }
}

/** Decode a file for the editor (EXIF orientation applied by the browser). */
export async function loadEditorImage(file: Blob): Promise<ImageBitmap> {
  return createImageBitmap(file)
}

/** Image files on the clipboard of a paste event (screenshots, copied images). */
export function filesFromClipboard(data: DataTransfer | null): File[] {
  if (!data) return []

  const files = Array.from(data.files ?? [])

  if (files.length > 0) return files

  return Array.from(data.items ?? [])
    .filter((item) => item.kind === 'file')
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null)
}
